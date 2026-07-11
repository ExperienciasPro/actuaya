import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { RenewalNotifierService } from '../../../../core/services/renewal-notifier.service';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';
import { SubscriptionStatusBadgeComponent } from '../../../../shared/components/subscription-status-badge/subscription-status-badge';
import { CurrencyInputDirective } from '../../../../shared/directives/currency-input.directive';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
  PaymentFrequency,
  AppSolution,
  APP_LABELS,
  APP_ICONS,
  STATUS_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  SUBSCRIPTION_TYPE_ICONS,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_FREQUENCY_ICONS,
  RenewalHealth,
  CompanyInfo,
  CompanyContact,
  Currency,
} from '../../../../core/models/subscription.model';

type ViewMode = 'dashboard' | 'detail';

@Component({
  selector: 'um-subscription-dashboard',
  standalone: true,
  imports: [FormsModule, UmIconComponent, SubscriptionStatusBadgeComponent, CurrencyInputDirective],
  templateUrl: './subscription-dashboard.html',
  styleUrl: './subscription-dashboard.scss',
})
export class SubscriptionDashboardComponent {
  private userService = inject(UserService);
  private subService = inject(SubscriptionService);
  private router = inject(Router);

  // — View State —
  viewMode = signal<ViewMode>('dashboard');
  isEditing = signal(false);
  toast = signal('');
  confirmDeleteId = signal<string | null>(null);
  detailSubscription = signal<Subscription | null>(null);
  searchQuery = signal('');

  // — Filters —
  filterApp = signal<AppSolution | null>(null);
  filterStatus = signal<SubscriptionStatus | null>(null);
  filterUrgent = signal(false);

  // — Form State —
  editingSubscription = signal<Subscription | null>(null);
  formData = signal<FormData>(this.getEmptyForm());

  // — Enums/Constants for template —
  readonly appOptions = Object.values(AppSolution);
  readonly statusOptions = Object.values(SubscriptionStatus);
  readonly appLabels = APP_LABELS;
  readonly appIcons = APP_ICONS;
  readonly statusLabels = STATUS_LABELS;
  readonly currencies: Currency[] = ['COP', 'USD'];
  readonly clientTypeOptions = Object.values(SubscriptionType);
  readonly clientTypeLabels = SUBSCRIPTION_TYPE_LABELS;
  readonly clientTypeIcons = SUBSCRIPTION_TYPE_ICONS;
  readonly frequencyOptions = Object.values(PaymentFrequency);
  readonly frequencyLabels = PAYMENT_FREQUENCY_LABELS;
  readonly frequencyIcons = PAYMENT_FREQUENCY_ICONS;

  // Enum references for template strict typing
  readonly STATUS_ACTIVE = SubscriptionStatus.ACTIVE;
  readonly STATUS_EXPIRED = SubscriptionStatus.EXPIRED;
  readonly STATUS_TRIAL = SubscriptionStatus.TRIAL;
  readonly STATUS_SUSPENDED = SubscriptionStatus.SUSPENDED;

  // — Computed —
  filteredSubscriptions = computed(() => {
    let subs = this.subService.getFiltered(this.filterApp(), this.filterStatus());
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      subs = subs.filter(s =>
        s.company.name.toLowerCase().includes(query) ||
        s.company.nit.toLowerCase().includes(query) ||
        s.contact.name.toLowerCase().includes(query) ||
        s.contact.email.toLowerCase().includes(query) ||
        (s.contact.phone || '').toLowerCase().includes(query) ||
        (s.ambassadorName || '').toLowerCase().includes(query)
      );
    }
    if (this.filterUrgent()) {
      subs = subs.filter(s => {
        const h = this.subService.calculateRenewalHealth(s.nextRenewalDate);
        return h.isOverdue || h.isCritical || h.isUrgent;
      });
    }
    return subs;
  });

  stats = computed(() => {
    const revenueCOP = this.subService.totalRevenueCOP();
    const revenueUSD = this.subService.totalRevenueUSD();
    return {
      total: this.subService.totalSubscriptions(),
      active: this.subService.activeCount(),
      expired: this.subService.expiredCount(),
      trial: this.subService.trialCount(),
      suspended: this.subService.suspendedCount(),
      urgent: this.subService.urgentRenewals(),
      revenueMonthlyCOP: revenueCOP,
      revenueMonthlyUSD: revenueUSD,
      revenueAnnualCOP: revenueCOP * 12,
      revenueAnnualUSD: revenueUSD * 12,
      totalCollectedCOP: this.subService.totalCollectedCOP(),
      totalCollectedUSD: this.subService.totalCollectedUSD(),
    };
  });

  private notifier = inject(RenewalNotifierService);

  constructor() {
    if (!this.userService.isSuperAdmin()) {
      this.router.navigate(['/d/dashboard']);
      return;
    }
    // Auto-verificar notificaciones de renovación pendientes
    this.checkRenewalNotifications();
  }

  /** Verifica y envía notificaciones de renovación pendientes */
  private async checkRenewalNotifications(): Promise<void> {
    try {
      const pending = this.notifier.getPendingNotifications();
      if (pending.length === 0) return;

      const sent = await this.notifier.checkAndNotify();
      if (sent > 0) {
        this.showToast(`✉️ ${sent} notificación(es) de renovación enviada(s)`);
      }
    } catch (error) {
      console.warn('Error verificando notificaciones:', error);
    }
  }

  // ─── Filter Actions ───────────────────────

  setAppFilter(app: AppSolution | null): void {
    this.filterApp.set(this.filterApp() === app ? null : app);
  }

  setStatusFilter(status: SubscriptionStatus | null): void {
    this.filterStatus.set(this.filterStatus() === status ? null : status);
  }

  toggleUrgentFilter(): void {
    this.filterUrgent.update(v => !v);
  }

  clearFilters(): void {
    this.filterApp.set(null);
    this.filterStatus.set(null);
    this.filterUrgent.set(false);
    this.searchQuery.set('');
  }

  // ─── Detail Modal ─────────────────────────

  openDetailModal(sub: Subscription): void {
    this.detailSubscription.set(sub);
  }

  closeDetailModal(): void {
    this.detailSubscription.set(null);
  }

  editFromDetail(): void {
    const sub = this.detailSubscription();
    if (sub) {
      this.closeDetailModal();
      this.openEdit(sub);
    }
  }

  // ─── CRUD Actions ─────────────────────────

  openNew(): void {
    this.editingSubscription.set(null);
    this.formData.set(this.getEmptyForm());
    this.isEditing.set(false);
    this.viewMode.set('detail');
  }

  openEdit(sub: Subscription): void {
    this.editingSubscription.set(sub);
    this.formData.set({
      companyName: sub.company.name,
      companyNit: sub.company.nit,
      contactName: sub.contact.name,
      contactEmail: sub.contact.email,
      contactWhatsapp: sub.contact.whatsapp,
      contactPhone: sub.contact.phone || '',
      app: sub.app,
      status: sub.status,
      clientType: sub.clientType || SubscriptionType.PERSONA,
      startDate: sub.startDate,
      nextRenewalDate: sub.nextRenewalDate,
      lastPaymentDate: sub.lastPaymentDate,
      amount: sub.amount,
      paymentFrequency: sub.paymentFrequency || PaymentFrequency.MONTHLY,
      currency: sub.currency,
      notes: sub.notes || '',
      ambassadorName: sub.ambassadorName || '',
      ambassadorCommission: sub.ambassadorCommission || 0,
      appLoginUrl: sub.appLoginUrl || '',
    });
    this.isEditing.set(true);
    this.viewMode.set('detail');
  }

  saveSubscription(): void {
    const fd = this.formData();

    // Build the subscription data
    const subData = {
      company: { name: fd.companyName, nit: fd.companyNit } as CompanyInfo,
      contact: { name: fd.contactName, email: fd.contactEmail, whatsapp: fd.contactWhatsapp, phone: fd.contactPhone } as CompanyContact,
      app: fd.app as AppSolution,
      status: fd.status as SubscriptionStatus,
      clientType: fd.clientType as SubscriptionType,
      startDate: fd.startDate,
      nextRenewalDate: fd.nextRenewalDate,
      lastPaymentDate: fd.lastPaymentDate,
      amount: Number(fd.amount),
      paymentFrequency: fd.paymentFrequency as PaymentFrequency,
      currency: fd.currency as Currency,
      notes: fd.notes || undefined,
      ambassadorName: fd.ambassadorName || undefined,
      ambassadorCommission: fd.ambassadorCommission ? Number(fd.ambassadorCommission) : undefined,
      appLoginUrl: fd.clientType === SubscriptionType.MARCA_BLANCA ? fd.appLoginUrl?.trim() : undefined,
    };

    if (this.isEditing() && this.editingSubscription()) {
      this.subService.update(this.editingSubscription()!.id, subData);
      this.showToast('✅ Suscripción actualizada');
    } else {
      this.subService.create(subData);
      this.showToast('✅ Suscripción creada');
    }

    this.viewMode.set('dashboard');
  }

  confirmDelete(id: string): void {
    this.confirmDeleteId.set(id);
  }

  executeDelete(): void {
    const id = this.confirmDeleteId();
    if (id) {
      this.subService.delete(id);
      this.confirmDeleteId.set(null);
      this.showToast('🗑️ Suscripción eliminada');
    }
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  goBack(): void {
    this.viewMode.set('dashboard');
  }

  // ─── Helpers ──────────────────────────────

  getRenewalHealth(date: string): RenewalHealth {
    return this.subService.calculateRenewalHealth(date);
  }

  getRenewalClass(health: RenewalHealth): string {
    if (health.isOverdue) return 'overdue';
    if (health.isCritical) return 'critical';
    if (health.isUrgent) return 'urgent';
    return 'healthy';
  }

  formatCurrency(amount: number, currency: Currency): string {
    if (currency === 'COP') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return iso; }
  }

  formatTenure(startDateIso: string): string {
    try {
      const start = new Date(startDateIso);
      const now = new Date();
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      if (months < 0) { years--; months += 12; }
      if (years > 0 && months > 0) return `${years}a ${months}m`;
      if (years > 0) return `${years} año${years > 1 ? 's' : ''}`;
      if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
      const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} día${days !== 1 ? 's' : ''}`;
    } catch { return '—'; }
  }

  isFormValid(): boolean {
    const fd = this.formData();
    const baseValid = !!(
      fd.companyName?.trim() &&
      fd.companyNit?.trim() &&
      fd.contactName?.trim() &&
      fd.contactEmail?.trim() &&
      fd.app &&
      fd.status &&
      fd.startDate &&
      fd.nextRenewalDate &&
      fd.lastPaymentDate &&
      fd.amount > 0
    );
    // Marca Blanca requiere URL de login obligatoria
    if (baseValid && fd.clientType === SubscriptionType.MARCA_BLANCA) {
      return !!fd.appLoginUrl?.trim();
    }
    return baseValid;
  }

  /** Check if the form requires the login URL field */
  isMarcaBlanca(): boolean {
    return this.formData().clientType === SubscriptionType.MARCA_BLANCA;
  }

  openWhatsApp(number: string): void {
    const clean = number.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${clean.replace('+', '')}`, '_blank');
  }

  updateFormField(field: keyof FormData, value: unknown): void {
    this.formData.update(current => ({ ...current, [field]: value }));
  }

  private getEmptyForm(): FormData {
    return {
      companyName: '',
      companyNit: '',
      contactName: '',
      contactEmail: '',
      contactWhatsapp: '',
      contactPhone: '',
      app: AppSolution.ACTUAYA,
      status: SubscriptionStatus.TRIAL,
      clientType: SubscriptionType.PERSONA,
      startDate: new Date().toISOString().split('T')[0],
      nextRenewalDate: '',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentFrequency: PaymentFrequency.MONTHLY,
      currency: 'COP',
      notes: '',
      ambassadorName: '',
      ambassadorCommission: 0,
      appLoginUrl: '',
    };
  }

  // ─── Backup / Restore ──────────────────────

  exportBackup(): void {
    const subs = this.subService.subscriptions();
    if (subs.length === 0) {
      this.showToast('⚠️ No hay suscripciones para exportar');
      return;
    }
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: subs.length,
      subscriptions: subs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actuaya-suscripciones-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`💾 Backup exportado: ${subs.length} suscripciones`);
  }

  triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.importBackup(file);
    };
    input.click();
  }

  private async importBackup(file: File): Promise<void> {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Validar estructura
      if (!backup.subscriptions || !Array.isArray(backup.subscriptions)) {
        this.showToast('❌ Archivo no válido — formato incorrecto');
        return;
      }

      const imported: Subscription[] = backup.subscriptions;
      if (imported.length === 0) {
        this.showToast('⚠️ El archivo no contiene suscripciones');
        return;
      }

      // Validar que cada item tenga id y company
      const valid = imported.every(s => s.id && s.company?.name);
      if (!valid) {
        this.showToast('❌ Datos corruptos — algunas suscripciones no tienen campos requeridos');
        return;
      }

      // Merge: agregar nuevas sin duplicar existentes
      const existing = this.subService.subscriptions();
      const existingIds = new Set(existing.map(s => s.id));
      const newSubs = imported.filter(s => !existingIds.has(s.id));
      const merged = [...existing, ...newSubs];

      // Persistir
      this.subService.replaceAll(merged);

      const msg = newSubs.length > 0
        ? `✅ Restauradas ${newSubs.length} suscripciones (${imported.length - newSubs.length} ya existían)`
        : `ℹ️ Todas las ${imported.length} suscripciones ya existían`;
      this.showToast(msg);
    } catch {
      this.showToast('❌ Error leyendo el archivo de backup');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}

interface FormData {
  companyName: string;
  companyNit: string;
  contactName: string;
  contactEmail: string;
  contactWhatsapp: string;
  contactPhone: string;
  app: AppSolution;
  status: SubscriptionStatus;
  clientType: SubscriptionType;
  startDate: string;
  nextRenewalDate: string;
  lastPaymentDate: string;
  amount: number;
  paymentFrequency: PaymentFrequency;
  currency: Currency;
  notes: string;
  ambassadorName: string;
  ambassadorCommission: number;
  appLoginUrl: string;
}
