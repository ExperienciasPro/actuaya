import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RadarService } from '../../../../core/services/radar.service';
import { SalesService } from '../../../../core/services/sales.service';
import { RadarContact, RELATIONSHIP_ICONS, RELATIONSHIP_LABELS, RelationshipTag } from '../../../../core/models/radar-contact.model';

@Component({
  selector: 'um-radar-board',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="radar-board">
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>📡 Kanban Pre-Pipeline</h1>
          <p class="subtitle">Vista de columnas del Contact Radar</p>
        </div>
        <div class="header-actions">
          <a class="btn-table" routerLink="/d/radar">📊 Ver Tabla</a>
        </div>
      </div>

      <!-- Kanban Grid -->
      <div class="kanban-grid animate-fadeInUp stagger-1">
        <!-- Column 1: En el Radar -->
        <div class="kanban-column">
          <div class="column-header radar-col">
            <span class="col-dot radar-dot"></span>
            <h2>En el Radar</h2>
            <span class="col-count">{{ radarList().length }}</span>
          </div>
          <div class="column-body">
            @for (c of radarList(); track c.id) {
              <div class="kanban-card" [class.overdue]="c.overduesSince">
                @if (c.overduesSince) {
                  <span class="overdue-tag">⚠️ Atrasado</span>
                }
                <div class="card-top">
                  <span class="card-avatar radar">{{ c.name.charAt(0) }}</span>
                  <div class="card-info">
                    <span class="card-name">{{ c.name }}</span>
                    <span class="card-tag">{{ getTagIcon(c.relationshipTag) }} {{ getTagLabel(c.relationshipTag) }}</span>
                  </div>
                </div>
                <span class="card-phone">📱 {{ c.phone }}</span>
                <div class="card-actions">
                  <button class="ca-btn contact" (click)="openWhatsApp(c)" title="Contactar por WhatsApp">📨 Contactar</button>
                  <button class="ca-btn snooze" (click)="snooze(c.id)" title="Posponer 1 mes">⏸</button>
                  <button class="ca-btn delete" (click)="deleteContact(c.id)" title="Eliminar">🗑</button>
                </div>
              </div>
            }
            @if (!radarList().length) {
              <div class="column-empty">Sin contactos en el radar</div>
            }
          </div>
        </div>

        <!-- Column 2: Contacto Iniciado -->
        <div class="kanban-column">
          <div class="column-header contacted-col">
            <span class="col-dot contacted-dot"></span>
            <h2>Contacto Iniciado</h2>
            <span class="col-count">{{ contactedList().length }}</span>
          </div>
          <div class="column-body">
            @for (c of contactedList(); track c.id) {
              <div class="kanban-card contacted">
                <div class="card-top">
                  <span class="card-avatar contacted">{{ c.name.charAt(0) }}</span>
                  <div class="card-info">
                    <span class="card-name">{{ c.name }}</span>
                    <span class="card-tag">{{ getTagIcon(c.relationshipTag) }} {{ getTagLabel(c.relationshipTag) }}</span>
                  </div>
                </div>
                <span class="card-phone">📱 {{ c.phone }}</span>
                @if (c.contactedAt) {
                  <span class="card-meta">Contactado {{ formatDate(c.contactedAt) }}</span>
                }
                <div class="card-actions">
                  <button class="ca-btn promote" (click)="openPromote(c)" title="Promover a Deal">🚀 Promover a Deal</button>
                  <button class="ca-btn snooze" (click)="snooze(c.id)" title="Posponer">⏸</button>
                </div>
              </div>
            }
            @if (!contactedList().length) {
              <div class="column-empty">Contacta personas para verlas aquí</div>
            }
          </div>
        </div>

        <!-- Column 3: Snooze/En Espera -->
        <div class="kanban-column">
          <div class="column-header snoozed-col">
            <span class="col-dot snoozed-dot"></span>
            <h2>En Espera</h2>
            <span class="col-count">{{ snoozedList().length }}</span>
          </div>
          <div class="column-body">
            @for (c of snoozedList(); track c.id) {
              <div class="kanban-card snoozed">
                <div class="card-top">
                  <span class="card-avatar snoozed">{{ c.name.charAt(0) }}</span>
                  <div class="card-info">
                    <span class="card-name">{{ c.name }}</span>
                    <span class="card-tag">{{ getTagIcon(c.relationshipTag) }} {{ getTagLabel(c.relationshipTag) }}</span>
                  </div>
                </div>
                @if (c.snoozedUntil) {
                  <span class="card-meta">⏱ Hasta {{ formatDate(c.snoozedUntil) }}</span>
                }
                <div class="card-actions">
                  <button class="ca-btn" (click)="moveBack(c.id)" title="Volver al Radar">↩️ Volver</button>
                </div>
              </div>
            }
            @if (!snoozedList().length) {
              <div class="column-empty">Sin contactos en espera</div>
            }
          </div>
        </div>
      </div>

      <!-- Promote Modal -->
      @if (promoteContact()) {
        <div class="modal-backdrop" (click)="closePromote()">
          <div class="promote-modal animate-fadeInUp" (click)="$event.stopPropagation()">
            <h3>🚀 Promover a Deal</h3>
            <p class="promote-name">{{ promoteContact()!.name }}</p>

            <label class="modal-label">Embudo de ventas</label>
            <select class="qi" [(ngModel)]="promoteFunnelId">
              @for (f of funnels(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>

            @if (selectedFunnelStages().length) {
              <label class="modal-label">Etapa inicial</label>
              <select class="qi" [(ngModel)]="promoteStageId">
                @for (s of selectedFunnelStages(); track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
            }

            <label class="modal-label">Valor estimado (MXN)</label>
            <input class="qi" type="number" [(ngModel)]="promoteValue" placeholder="0" />

            <div class="modal-actions">
              <button class="btn-cancel" (click)="closePromote()">Cancelar</button>
              <button class="btn-promote" [disabled]="!promoteFunnelId() || !promoteStageId()" (click)="confirmPromote()">
                🚀 Crear Deal
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'radar-board.scss',
})
export class RadarBoardComponent {
  private radarService = inject(RadarService);
  private salesService = inject(SalesService);

  radarList = this.radarService.radarContacts;
  contactedList = this.radarService.contactedContacts;
  snoozedList = this.radarService.snoozedContacts;
  funnels = this.salesService.funnels;

  promoteContact = signal<RadarContact | null>(null);
  promoteFunnelId = signal('');
  promoteStageId = signal('');
  promoteValue = signal(0);

  selectedFunnelStages = computed(() => {
    const fid = this.promoteFunnelId();
    if (!fid) return [];
    return this.salesService.getFunnelById(fid)?.stages || [];
  });

  getTagIcon(tag: RelationshipTag): string { return RELATIONSHIP_ICONS[tag]; }
  getTagLabel(tag: RelationshipTag): string { return RELATIONSHIP_LABELS[tag]; }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  openWhatsApp(contact: RadarContact): void {
    const url = this.radarService.triggerWhatsAppContact(contact.id);
    if (url) window.open(url, '_blank');
  }

  snooze(id: string): void { this.radarService.snooze(id, 1); }
  moveBack(id: string): void { this.radarService.moveBackToRadar(id); }
  deleteContact(id: string): void { this.radarService.deleteContact(id); }

  openPromote(c: RadarContact): void {
    this.promoteContact.set(c);
    const f = this.funnels();
    if (f.length) {
      this.promoteFunnelId.set(f[0].id);
      this.promoteStageId.set(f[0].stages[0]?.id || '');
    }
  }

  closePromote(): void { this.promoteContact.set(null); }

  confirmPromote(): void {
    const c = this.promoteContact();
    if (!c) return;
    this.radarService.promoteToDeal(c.id, this.promoteFunnelId(), this.promoteStageId(), this.promoteValue());
    this.closePromote();
  }
}
