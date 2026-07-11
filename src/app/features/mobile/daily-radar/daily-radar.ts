import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadarService } from '../../../core/services/radar.service';
import { DataSyncService } from '../../../core/services/data-sync.service';
import { RadarContact, RELATIONSHIP_ICONS } from '../../../core/models/radar-contact.model';

@Component({
  selector: 'um-daily-radar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="daily-radar" style="padding: 16px;">
      <!-- Header -->
      <div class="radar-header animate-fadeInUp" style="text-align: center; margin-bottom: 20px;">
        <span class="radar-emoji" style="font-size: 2.5rem; display: block; margin-bottom: 6px;">📡</span>
        <h1 style="font-size: 1.6rem; font-weight: 800; color: #1a2e35; margin: 0;">El Radar</h1>
        <p class="radar-subtitle" style="font-size: 0.85rem; color: #5a7a84; margin-top: 4px;">Contactos registrados ({{ contacts().length }})</p>
      </div>

      <!-- Contact Cards List -->
      <div class="contact-list animate-fadeInUp stagger-2" style="display: flex; flex-direction: column; gap: 12px;">
        @for (contact of contacts(); track contact.id) {
          <div class="contact-card" [class.completed]="contact.status === 'contacted'" style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #eef2f5; display: flex; flex-direction: column; gap: 12px;">
            
            <!-- Contact Header Row -->
            <div class="contact-row" style="display: flex; align-items: center; gap: 12px;">
              <div class="contact-avatar-wrap" style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #00cec9 0%, #6c5ce7 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;">
                <span>{{ getInitial(contact.name) }}</span>
              </div>
              <div class="contact-info" style="display: flex; flex-direction: column; flex: 1;">
                <span class="contact-name" style="font-size: 1rem; font-weight: 700; color: #1a2e35;">{{ contact.name || 'Sin nombre' }}</span>
                <span class="contact-meta" style="font-size: 0.8rem; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 6px;">
                  <span>{{ getTagIcon(contact.relationshipTag) }} {{ contact.phone }}</span>
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700;" [style.background]="contact.status === 'contacted' ? '#eef5f2' : '#e3f2fd'" [style.color]="contact.status === 'contacted' ? '#00b894' : '#0984e3'">
                    {{ contact.status === 'contacted' ? '✅ Contactado' : '📡 En el Radar' }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Action Buttons Row -->
            <div class="action-row" style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="action-btn wa-btn" (click)="contactNow(contact)" style="flex: 1; height: 40px; border-radius: 10px; border: none; background: #25D366; color: #ffffff; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                <span>💬</span> WhatsApp
              </button>

              @if (contact.email) {
                <button class="action-btn email-btn" (click)="contactEmail(contact)" style="flex: 1; height: 40px; border-radius: 10px; border: none; background: #ea4335; color: #ffffff; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                  <span>✉️</span> Email
                </button>
              }

              @if (contact.status === 'contacted') {
                <button class="action-btn snooze-btn" (click)="reactivate(contact.id)" style="flex: 1; height: 40px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                  <span>↩️</span> Reactivar
                </button>
              }
            </div>
          </div>
        }

        @if (!contacts().length) {
          <div class="empty-state animate-fadeInUp" style="text-align: center; padding: 40px 20px;">
            <span class="empty-emoji" style="font-size: 3.5rem; display: block; margin-bottom: 12px;">🧘</span>
            <h2 style="font-size: 1.2rem; font-weight: 700; color: #1a2e35; margin: 0;">Sin contactos registrados</h2>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 6px;">Agrega contactos desde el sitio web para gestionarlos aquí.</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: 'daily-radar.scss',
})
export class DailyRadarComponent implements OnInit {
  radarService = inject(RadarService);
  private dataSync = inject(DataSyncService);

  contacts = this.radarService.contacts;

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.dataSync.syncFromServer();
  }

  getInitial(name: string | undefined): string {
    if (!name || typeof name !== 'string') return '?';
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
  }

  getTagIcon(tag: string): string {
    return RELATIONSHIP_ICONS[tag as keyof typeof RELATIONSHIP_ICONS] || '📌';
  }

  contactNow(contact: RadarContact): void {
    const deepLink = this.radarService.triggerWhatsAppContact(contact.id);
    if (deepLink) {
      window.open(deepLink, '_blank');
    }
  }

  contactEmail(contact: RadarContact): void {
    if (contact.email) {
      this.radarService.markContacted(contact.id);
      window.open(`mailto:${contact.email}`, '_blank');
    }
  }

  reactivate(id: string): void {
    this.radarService.moveBackToRadar(id);
  }
}
