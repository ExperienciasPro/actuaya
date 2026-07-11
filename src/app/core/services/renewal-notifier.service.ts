import { Injectable, inject } from '@angular/core';
import emailjs from '@emailjs/browser';
import { StorageService } from './storage.service';
import { SubscriptionService } from './subscription.service';
import {
  Subscription,
  SubscriptionStatus,
  APP_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from '../models/subscription.model';
import { environment } from '../../../environments/environment';

// ═══════════════════════════════════════════
// Renewal Notifier Service
// Envía recordatorios por email a 30, 15 y 3 días
// antes de que expire una suscripción.
// ═══════════════════════════════════════════

/** Umbrales de notificación en días */
const THRESHOLDS = [30, 15, 3] as const;
type ThresholdDay = typeof THRESHOLDS[number];

interface NotificationRecord {
  subscriptionId: string;
  threshold: ThresholdDay;
  sentAt: string;           // ISO datetime
  subscriberEmail: string;
}

@Injectable({ providedIn: 'root' })
export class RenewalNotifierService {
  private storage = inject(StorageService);
  private subService = inject(SubscriptionService);

  private readonly STORAGE_KEY = 'um_renewal_notifications';
  private readonly ADMIN_EMAIL = environment.adminEmail;
  private readonly config = environment.emailjs;

  private initialized = false;

  /** Inicializa EmailJS una sola vez */
  private init(): void {
    if (this.initialized) return;
    try {
      emailjs.init(this.config.publicKey);
      this.initialized = true;
    } catch (e) {
      console.warn('RenewalNotifier: EmailJS no se pudo inicializar', e);
    }
  }

  /**
   * Verifica todas las suscripciones activas y envía
   * notificaciones para las que están dentro de los umbrales.
   * Se llama cada vez que el admin abre el dashboard.
   *
   * @returns Número de emails enviados en esta ejecución
   */
  async checkAndNotify(): Promise<number> {
    // No enviar si EmailJS no está configurado
    if (this.config.publicKey === 'YOUR_PUBLIC_KEY') {
      console.info('RenewalNotifier: EmailJS no configurado, saltando.');
      return 0;
    }

    this.init();

    const subs = this.subService.subscriptions();
    const activeSubs = subs.filter(
      s => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIAL
    );

    const sentLog = this.getSentLog();
    let emailsSent = 0;

    for (const sub of activeSubs) {
      const daysRemaining = this.getDaysUntilRenewal(sub.nextRenewalDate);

      for (const threshold of THRESHOLDS) {
        // Solo enviar si estamos dentro del umbral (± 1 día de margen)
        if (daysRemaining <= threshold && daysRemaining >= threshold - 2) {
          const alreadySent = sentLog.some(
            r => r.subscriptionId === sub.id && r.threshold === threshold
          );

          if (!alreadySent) {
            const success = await this.sendRenewalEmail(sub, threshold, daysRemaining);
            if (success) {
              sentLog.push({
                subscriptionId: sub.id,
                threshold,
                sentAt: new Date().toISOString(),
                subscriberEmail: sub.contact.email,
              });
              emailsSent++;
            }
          }
        }
      }
    }

    // Guardar log actualizado
    this.storage.set(this.STORAGE_KEY, sentLog);

    // Limpiar registros antiguos (> 90 días)
    this.cleanOldRecords(sentLog);

    return emailsSent;
  }

  /**
   * Envía un email de recordatorio de renovación.
   * Envía dos correos: uno al suscriptor y otro al admin.
   */
  private async sendRenewalEmail(
    sub: Subscription,
    threshold: ThresholdDay,
    daysRemaining: number
  ): Promise<boolean> {
    const urgencyLabel = this.getUrgencyLabel(threshold);
    const appLabel = APP_LABELS[sub.app] || sub.app;
    const frequencyLabel = PAYMENT_FREQUENCY_LABELS[sub.paymentFrequency] || 'Mensual';

    const templateParams = {
      to_name: sub.contact.name,
      to_email: sub.contact.email,
      admin_email: this.ADMIN_EMAIL,
      company_name: sub.company.name,
      company_nit: sub.company.nit,
      app_name: appLabel,
      subscription_amount: this.formatCurrency(sub.amount, sub.currency),
      payment_frequency: frequencyLabel,
      renewal_date: this.formatDate(sub.nextRenewalDate),
      days_remaining: daysRemaining.toString(),
      urgency_level: urgencyLabel,
      threshold_type: this.getThresholdType(threshold),
      whatsapp: sub.contact.whatsapp || '',
      contact_email: sub.contact.email,
    };

    try {
      // Enviar al suscriptor
      await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        { ...templateParams, reply_to: this.ADMIN_EMAIL }
      );

      // Enviar copia al admin
      await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        { ...templateParams, to_email: this.ADMIN_EMAIL, to_name: 'Admin ActuaYa' }
      );

      console.log(
        `✉️ Notificación enviada: ${sub.company.name} — ${urgencyLabel} (${daysRemaining} días)`
      );
      return true;
    } catch (error) {
      console.error(`Error enviando email para ${sub.company.name}:`, error);
      return false;
    }
  }

  // ─── Helpers ─────────────────────────────────

  private getDaysUntilRenewal(nextRenewalDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const renewal = new Date(nextRenewalDate);
    renewal.setHours(0, 0, 0, 0);
    return Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getUrgencyLabel(threshold: ThresholdDay): string {
    switch (threshold) {
      case 30: return '⏰ Recordatorio — 1 mes';
      case 15: return '⚠️ Próxima a vencer — 15 días';
      case 3:  return '🚨 URGENTE — 3 días';
    }
  }

  private getThresholdType(threshold: ThresholdDay): string {
    switch (threshold) {
      case 30: return 'reminder_30';
      case 15: return 'warning_15';
      case 3:  return 'critical_3';
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    const locale = currency === 'COP' ? 'es-CO' : 'en-US';
    const symbol = currency === 'COP' ? '$ ' : '$';
    try {
      return symbol + amount.toLocaleString(locale, { minimumFractionDigits: 0 });
    } catch {
      return symbol + amount.toString();
    }
  }

  private formatDate(dateString: string): string {
    try {
      const d = new Date(dateString + 'T12:00:00');
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  private getSentLog(): NotificationRecord[] {
    return this.storage.get<NotificationRecord[]>(this.STORAGE_KEY) || [];
  }

  private cleanOldRecords(records: NotificationRecord[]): void {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 días
    const cleaned = records.filter(r => new Date(r.sentAt).getTime() > cutoff);
    if (cleaned.length < records.length) {
      this.storage.set(this.STORAGE_KEY, cleaned);
    }
  }

  /** Devuelve el estado actual de notificaciones pendientes */
  getPendingNotifications(): Array<{
    subscription: Subscription;
    threshold: ThresholdDay;
    daysRemaining: number;
  }> {
    const subs = this.subService.subscriptions();
    const sentLog = this.getSentLog();
    const pending: Array<{ subscription: Subscription; threshold: ThresholdDay; daysRemaining: number }> = [];

    for (const sub of subs) {
      if (sub.status !== SubscriptionStatus.ACTIVE && sub.status !== SubscriptionStatus.TRIAL) continue;

      const daysRemaining = this.getDaysUntilRenewal(sub.nextRenewalDate);

      for (const threshold of THRESHOLDS) {
        if (daysRemaining <= threshold && daysRemaining >= threshold - 2) {
          const alreadySent = sentLog.some(
            r => r.subscriptionId === sub.id && r.threshold === threshold
          );
          if (!alreadySent) {
            pending.push({ subscription: sub, threshold, daysRemaining });
          }
        }
      }
    }

    return pending;
  }

  /** Devuelve el historial de notificaciones enviadas */
  getSentHistory(): NotificationRecord[] {
    return this.getSentLog();
  }
}
