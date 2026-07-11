import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RadarService } from '../../../../core/services/radar.service';
import { SalesService } from '../../../../core/services/sales.service';
import { RadarContact, RelationshipTag, RadarStatus, RELATIONSHIP_LABELS, RELATIONSHIP_ICONS } from '../../../../core/models/radar-contact.model';

@Component({
  selector: 'um-radar-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="radar-inventory">
      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>📡 El Radar</h1>
          <p class="subtitle">Inventario de contactos · Pre-Pipeline CRM</p>
        </div>
        <div class="header-actions">
          <a class="btn-kanban" routerLink="/d/radar/board">📋 Ver Kanban</a>
          <button class="btn-import" (click)="fileInput.click()">
            📥 Importar CSV
          </button>
          <input type="file" #fileInput style="display: none" accept=".csv" (change)="onFileImport($event)">
          <button class="btn-add-contact" (click)="showBulkAdd.set(!showBulkAdd())">
            {{ showBulkAdd() ? '✕ Cerrar' : '+ Nuevo Contacto' }}
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar animate-fadeInUp stagger-1">
        <div class="stat-chip" [class.active]="filterStatus() === 'radar'" (click)="filterStatus.set('radar')">
          <span class="stat-dot radar-dot"></span>
          <span>{{ radarCount() }} en radar</span>
        </div>
        <div class="stat-chip" [class.active]="filterStatus() === 'contacted'" (click)="filterStatus.set('contacted')">
          <span class="stat-dot contacted-dot"></span>
          <span>{{ contactedCount() }} contactados</span>
        </div>
        <div class="stat-chip" [class.active]="filterStatus() === 'promoted'" (click)="filterStatus.set('promoted')">
          <span class="stat-dot promoted-dot"></span>
          <span>{{ promotedCount() }} promovidos</span>
        </div>
        <div class="stat-chip total" [class.active]="filterStatus() === ''" (click)="filterStatus.set('')" title="Limpiar filtro">
          {{ totalCount() }} total
        </div>
      </div>

      <!-- Bulk Add Panel -->
      @if (showBulkAdd()) {
        <div class="bulk-panel animate-fadeInUp">
          <h3>Agregar Nuevo Contacto</h3>
          <p class="bulk-hint">Ingresa los datos del nuevo contacto para agregarlo al radar.</p>
          <div class="quick-add-selectors">
            <select class="qi auto-width" [(ngModel)]="newTag">
              @for (tag of tagOptions; track tag.value) {
                <option [value]="tag.value">{{ tag.icon }} {{ tag.label }}</option>
              }
            </select>
            <select class="qi auto-width" [(ngModel)]="newStatus">
              <option value="radar">📡 En el Radar</option>
              <option value="contacted">📨 Contactado</option>
              <option value="promoted">🚀 Promovido</option>
            </select>
          </div>
          <div class="quick-add-form">
            <input class="qi" type="text" [(ngModel)]="newName" placeholder="Nombre *" />
            <input class="qi" type="text" [(ngModel)]="newLastName" placeholder="Apellidos" />
            <input class="qi" type="tel" [(ngModel)]="newPhone" placeholder="Teléfono *" />
            <input class="qi" type="email" [(ngModel)]="newEmail" placeholder="Email (opcional)" />
            <input class="qi" type="text" [(ngModel)]="newCompany" placeholder="Empresa (opcional)" />
            <button class="btn-ghost btn-detallar" (click)="showMoreDetails.set(!showMoreDetails())">
              <span class="icon">{{ showMoreDetails() ? '➖' : '➕' }}</span> Detallar datos
            </button>
            @if (!showMoreDetails()) {
              <button class="btn-quick-add" [disabled]="!newName().trim() || !newPhone().trim()" (click)="addSingle()">
                + Agregar
              </button>
            }
          </div>
          @if (showMoreDetails()) {
            <div class="quick-add-details animate-fadeInUp">
              <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
                <input class="qi" type="text" [(ngModel)]="newProfession" placeholder="Profesión / Cargo" />
                <input class="qi" type="text" [(ngModel)]="newCity" placeholder="Ciudad" />
                <select class="qi auto-width" [(ngModel)]="newInterests">
                  <option value="">Producto / Servicio de Interés</option>
                  @for (prod of productOptions; track prod) {
                    <option [value]="prod">{{ prod }}</option>
                  }
                </select>
              </div>
              <input class="qi" type="text" [(ngModel)]="newAddress" placeholder="Dirección" />
              <input class="qi" type="text" [(ngModel)]="newSocialLinks" placeholder="Sitio Web y Redes Sociales" />
              <textarea class="qi" [(ngModel)]="newNotes" placeholder="Notas / Información adicional sobre este contacto..."></textarea>
              <div class="details-actions" style="display: flex; justify-content: flex-end; margin-top: 12px;">
                <button class="btn-quick-add" [disabled]="!newName().trim() || !newPhone().trim()" (click)="addSingle()">
                  + Agregar
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Filter Bar -->
      <div class="filter-bar animate-fadeInUp stagger-2">
        <input
          class="search-filter"
          type="text"
          [(ngModel)]="searchTerm"
          placeholder="🔍 Buscar por nombre, teléfono o empresa..."
        />
        <select class="tag-filter" [(ngModel)]="filterTag">
          <option value="">Todos los tags</option>
          @for (tag of tagOptions; track tag.value) {
            <option [value]="tag.value">{{ tag.icon }} {{ tag.label }}</option>
          }
        </select>
        <select class="status-filter" [(ngModel)]="filterInterest">
          <option value="">Todos los productos</option>
          @for (prod of productOptions; track prod) {
            <option [value]="prod">{{ prod }}</option>
          }
        </select>
        <select class="status-filter" [(ngModel)]="filterStatus">
          <option value="">Todos los estados</option>
          <option value="radar">📡 En el Radar</option>
          <option value="contacted">📨 Contactados</option>
          <option value="promoted">🚀 Promovidos</option>
        </select>
      </div>

      <!-- Data Grid -->
      <div class="data-grid animate-fadeInUp stagger-3">
        <div class="grid-header">
          <span class="gh col-name">Nombre</span>
          <span class="gh col-phone">Teléfono</span>
          <span class="gh col-company">Producto/Serv.</span>
          <span class="gh col-tag">Tag</span>
          <span class="gh col-status">Estado</span>
          <span class="gh col-actions">Acciones</span>
        </div>

        @if (filteredContacts().length) {
          @for (contact of filteredContacts(); track contact.id) {
            <div class="grid-item-container">
              <div class="grid-row" [class]="contact.status">
              <span class="gc col-name">
                <div style="display: flex; flex-direction: column;">
                  <strong style="color: #1e293b;">{{ contact.name }}</strong>
                  @if (contact.email) { <span style="font-size: 0.7rem; opacity: 0.7;">{{ contact.email }}</span> }
                </div>
              </span>
              <span class="gc col-phone">{{ contact.phone }}</span>
              <span class="gc col-company">{{ contact.interests || '—' }}</span>
              <span class="gc col-tag">
                <span class="tag-badge" [attr.data-tag]="contact.relationshipTag">
                  {{ getTagIcon(contact.relationshipTag) }} {{ getTagLabel(contact.relationshipTag) }}
                </span>
              </span>
              <span class="gc col-status">
                <span class="status-badge" [class]="contact.status">{{ getStatusLabel(contact.status) }}</span>
              </span>
              <span class="gc col-actions">
                <button class="action-mini expand-action" title="Ampliar información" (click)="toggleRowExpand(contact.id)">
                  {{ expandedRowId() === contact.id ? '🔼' : '🔽' }}
                </button>
                <button class="action-mini edit-action" title="Editar" (click)="openEdit(contact)">✏️</button>
                @if (contact.status === 'radar' || contact.status === 'contacted') {
                  <button class="action-mini whatsapp-action" title="Contactar por WhatsApp" (click)="contactViaWhatsApp(contact)">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  </button>
                  @if (contact.email) {
                    <button class="action-mini email-action" title="Enviar Email" (click)="contactViaEmail(contact)">@</button>
                  } @else {
                    <button class="action-mini email-action" title="No hay email registrado" [disabled]="true" style="opacity: 0.3; cursor: not-allowed;">@</button>
                  }
                }
                @if (contact.status === 'radar') {
                  <button class="action-mini contact-action" title="Marcar como contactado manualmente" (click)="markContacted(contact.id)">✔️</button>
                }
                @if (contact.status === 'contacted') {
                  <button class="action-mini promote-action" title="Promover a Deal" (click)="openPromote(contact)">🚀</button>
                  <button class="action-mini" title="Volver al Radar" (click)="moveBack(contact.id)">↩️</button>
                }
                <button class="action-mini delete-action" title="Eliminar" (click)="deleteContact(contact.id)">🗑</button>
              </span>
            </div>
            @if (expandedRowId() === contact.id) {
              <div class="grid-row-expanded animate-fadeInUp">
                <div class="expanded-info-grid">
                  <div class="info-item"><strong>Empresa:</strong> <span>{{ contact.company || '—' }}</span></div>
                  <div class="info-item"><strong>Profesión / Cargo:</strong> <span>{{ contact.profession || '—' }}</span></div>
                  <div class="info-item"><strong>Ciudad:</strong> <span>{{ contact.city || '—' }}</span></div>
                  <div class="info-item"><strong>Dirección:</strong> <span>{{ contact.address || '—' }}</span></div>
                  <div class="info-item"><strong>Web / Redes Sociales:</strong> <span>{{ contact.socialLinks || '—' }}</span></div>
                  <div class="info-item"><strong>Lugar del Embudo:</strong> 
                    @if (contact.status === 'radar') { <span>📡 En el Radar (Sin contactar)</span> }
                    @else if (contact.status === 'contacted') { <span>📨 Contactado (En conversación)</span> }
                    @else if (contact.status === 'promoted') { <span>🚀 Promovido (Pipeline de Ventas)</span> }
                    @else { <span>—</span> }
                  </div>
                </div>
                @if (contact.notes) {
                  <div class="info-notes">
                    <strong>Notas / Info Adicional:</strong>
                    <p>{{ contact.notes }}</p>
                  </div>
                }
              </div>
            }
          </div>
          }
        } @else {
          <div class="grid-empty">
            <span class="empty-icon">📡</span>
            <h3>Sin contactos{{ searchTerm().trim() ? ' que coincidan' : '' }}</h3>
            <p>{{ searchTerm().trim() ? 'Prueba con otros filtros.' : 'Agrega contactos para empezar a construir tu radar.' }}</p>
          </div>
        }
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

      <!-- Edit Modal -->
      @if (editContactId()) {
        <div class="modal-backdrop" (click)="closeEdit()">
          <div class="promote-modal animate-fadeInUp" (click)="$event.stopPropagation()">
            <h3>✏️ Editar Contacto</h3>
            
            <div class="quick-add-selectors" style="margin-bottom: 12px; display: flex; gap: 8px;">
              <select class="qi auto-width" [(ngModel)]="editTag">
                @for (tag of tagOptions; track tag.value) {
                  <option [value]="tag.value">{{ tag.icon }} {{ tag.label }}</option>
                }
              </select>
              <select class="qi auto-width" [(ngModel)]="editStatus">
                <option value="radar">📡 En el Radar</option>
                <option value="contacted">📨 Contactado</option>
                <option value="promoted">🚀 Promovido</option>
              </select>
            </div>

            <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input class="qi" type="text" [(ngModel)]="editName" placeholder="Nombre completo *" />
              <input class="qi" type="text" [(ngModel)]="editPhone" placeholder="Teléfono *" />
            </div>
            
            <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input class="qi" type="text" [(ngModel)]="editCompany" placeholder="Empresa" />
              <input class="qi" type="email" [(ngModel)]="editEmail" placeholder="Email" />
            </div>

            <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input class="qi" type="text" [(ngModel)]="editProfession" placeholder="Profesión / Cargo" />
              <input class="qi" type="text" [(ngModel)]="editCity" placeholder="Ciudad" />
              <select class="qi auto-width" [(ngModel)]="editInterests">
                <option value="">Producto / Servicio de Interés</option>
                @for (prod of productOptions; track prod) {
                  <option [value]="prod">{{ prod }}</option>
                }
              </select>
            </div>
            
            <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input class="qi" type="text" [(ngModel)]="editAddress" placeholder="Dirección" />
            </div>

            <div class="details-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input class="qi" type="text" [(ngModel)]="editSocialLinks" placeholder="Sitio Web y Redes Sociales" />
            </div>

            <textarea class="qi" [(ngModel)]="editNotes" placeholder="Notas / Información adicional sobre este contacto..." style="margin-bottom: 12px;"></textarea>

            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeEdit()">Cancelar</button>
              <button class="btn-promote" [disabled]="!editName().trim() || !editPhone().trim()" (click)="saveEdit()">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'radar-inventory.scss',
})
export class RadarInventoryComponent {
  private radarService = inject(RadarService);
  private salesService = inject(SalesService);

  showBulkAdd = signal(false);
  searchTerm = signal('');
  filterTag = signal('');
  filterStatus = signal('');
  filterInterest = signal('');
  expandedRowId = signal<string | null>(null);

  // Quick add form
  newName = signal('');
  newLastName = signal('');
  newPhone = signal('');
  newEmail = signal('');
  newCompany = signal('');
  newTag = signal<RelationshipTag>('acquaintance');
  newStatus = signal<RadarStatus>('radar');
  showMoreDetails = signal(false);
  newNotes = signal('');
  newProfession = signal('');
  newCity = signal('');
  newInterests = signal('');
  newSocialLinks = signal('');
  newAddress = signal('');

  // Promote modal
  promoteContact = signal<RadarContact | null>(null);
  promoteFunnelId = signal('');
  promoteStageId = signal('');
  promoteValue = signal<number | null>(null);

  // Edit State
  editContactId = signal<string | null>(null);
  editName = signal('');
  editPhone = signal('');
  editEmail = signal('');
  editCompany = signal('');
  editTag = signal<RelationshipTag>('acquaintance');
  editStatus = signal<RadarStatus>('radar');
  editNotes = signal('');
  editProfession = signal('');
  editCity = signal('');
  editInterests = signal('');
  editSocialLinks = signal('');
  editAddress = signal('');

  funnels = computed(() => this.salesService.funnels());

  selectedFunnelStages = computed(() => {
    const fid = this.promoteFunnelId();
    if (!fid) return [];
    const funnel = this.salesService.getFunnelById(fid);
    return funnel?.stages || [];
  });

  tagOptions = [
    { value: 'family' as RelationshipTag, label: 'Familia', icon: '👨‍👩‍👧' },
    { value: 'university' as RelationshipTag, label: 'Universidad', icon: '🎓' },
    { value: 'former_colleague' as RelationshipTag, label: 'Ex Colega', icon: '💼' },
    { value: 'acquaintance' as RelationshipTag, label: 'Conocido', icon: '🤝' },
    { value: 'client' as RelationshipTag, label: 'Cliente', icon: '👔' },
    { value: 'referral' as RelationshipTag, label: 'Referido', icon: '🔗' },
    { value: 'event' as RelationshipTag, label: 'Evento', icon: '🎪' },
    { value: 'other' as RelationshipTag, label: 'Otro', icon: '✨' },
  ];

  productOptions = [
    'Consultoría',
    'Desarrollo a Medida',
    'Suscripción / SaaS',
    'Marketing',
    'Diseño',
    'Soporte / Mantenimiento',
    'Otro'
  ];

  // Stats
  radarCount = computed(() => this.radarService.radarContacts().length);
  contactedCount = computed(() => this.radarService.contactedContacts().length);
  snoozedCount = computed(() => this.radarService.snoozedContacts().length);
  promotedCount = computed(() => this.radarService.promotedContacts().length);
  totalCount = computed(() => this.radarService.contacts().length);

  filteredContacts = computed(() => {
    let contacts = this.radarService.contacts();
    const search = this.searchTerm().trim().toLowerCase();
    const tag = this.filterTag();
    const status = this.filterStatus();
    const interest = this.filterInterest();

    if (search) {
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.company?.toLowerCase().includes(search))
      );
    }
    if (tag) contacts = contacts.filter(c => c.relationshipTag === tag);
    if (status) contacts = contacts.filter(c => c.status === status);
    if (interest) contacts = contacts.filter(c => c.interests === interest);

    return contacts;
  });

  getTagLabel(tag: RelationshipTag): string { return RELATIONSHIP_LABELS[tag]; }
  getTagIcon(tag: RelationshipTag): string { return RELATIONSHIP_ICONS[tag]; }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { radar: 'En el Radar', contacted: 'Contactado', snoozed: 'En Espera', promoted: 'Promovido' };
    return labels[status] || status;
  }

  addSingle(): void {
    if (!this.newName().trim() || !this.newPhone().trim()) return;
    const fullName = this.newLastName().trim() 
      ? `${this.newName().trim()} ${this.newLastName().trim()}`
      : this.newName().trim();

    this.radarService.addContact({
      name: fullName,
      phone: this.newPhone().trim(),
      email: this.newEmail().trim() || undefined,
      company: this.newCompany().trim() || undefined,
      relationshipTag: this.newTag(),
      status: this.newStatus(),
      notes: this.newNotes().trim() || undefined,
      profession: this.newProfession().trim() || undefined,
      city: this.newCity().trim() || undefined,
      interests: this.newInterests().trim() || undefined,
      socialLinks: this.newSocialLinks().trim() || undefined,
      address: this.newAddress().trim() || undefined,
      hasTappedContactButton: false,
    });
    this.newName.set('');
    this.newLastName.set('');
    this.newPhone.set('');
    this.newEmail.set('');
    this.newCompany.set('');
    this.newTag.set('acquaintance');
    this.newStatus.set('radar');
    this.newNotes.set('');
    this.newProfession.set('');
    this.newCity.set('');
    this.newInterests.set('');
    this.newSocialLinks.set('');
    this.newAddress.set('');
    this.showMoreDetails.set(false);
  }

  markContacted(id: string): void { this.radarService.markContacted(id); }

  contactViaWhatsApp(contact: RadarContact): void {
    const link = this.radarService.triggerWhatsAppContact(contact.id);
    if (link) window.open(link, '_blank');
  }

  contactViaEmail(contact: RadarContact): void {
    if (!contact.email) return;
    this.radarService.markContacted(contact.id);
    window.location.href = `mailto:${contact.email}`;
  }

  snooze(id: string): void { this.radarService.snooze(id, 1); }
  moveBack(id: string): void { this.radarService.moveBackToRadar(id); }

  toggleRowExpand(id: string): void {
    this.expandedRowId.update(current => current === id ? null : id);
  }

  deleteContact(id: string): void { this.radarService.deleteContact(id); }

  openPromote(contact: RadarContact): void {
    this.promoteContact.set(contact);
    const f = this.funnels();
    if (f.length) {
      this.promoteFunnelId.set(f[0].id);
      this.promoteStageId.set(f[0].stages[0]?.id || '');
    }
  }

  closePromote(): void { this.promoteContact.set(null); }

  confirmPromote(): void {
    this.radarService.promoteToDeal(this.promoteContact()!.id, this.promoteFunnelId(), this.promoteStageId(), this.promoteValue() || 0);
    this.closePromote();
  }

  openEdit(c: RadarContact): void {
    this.editContactId.set(c.id);
    this.editName.set(c.name);
    this.editPhone.set(c.phone);
    this.editEmail.set(c.email || '');
    this.editCompany.set(c.company || '');
    this.editTag.set(c.relationshipTag);
    this.editStatus.set(c.status);
    this.editNotes.set(c.notes || '');
    this.editProfession.set(c.profession || '');
    this.editCity.set(c.city || '');
    this.editInterests.set(c.interests || '');
    this.editSocialLinks.set(c.socialLinks || '');
    this.editAddress.set(c.address || '');
  }

  closeEdit(): void {
    this.editContactId.set(null);
  }

  saveEdit(): void {
    const id = this.editContactId();
    if (!id || !this.editName().trim() || !this.editPhone().trim()) return;

    this.radarService.updateContact(id, {
      name: this.editName().trim(),
      phone: this.editPhone().trim(),
      email: this.editEmail().trim() || undefined,
      company: this.editCompany().trim() || undefined,
      relationshipTag: this.editTag(),
      status: this.editStatus(),
      notes: this.editNotes().trim() || undefined,
      profession: this.editProfession().trim() || undefined,
      city: this.editCity().trim() || undefined,
      interests: this.editInterests().trim() || undefined,
      socialLinks: this.editSocialLinks().trim() || undefined,
      address: this.editAddress().trim() || undefined,
    });
    this.closeEdit();
  }

  onFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      let added = 0;
      // Skip header row if it contains 'nombre'
      const startIdx = (rows[0] && rows[0].toLowerCase().includes('nombre')) ? 1 : 0;
      
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          this.radarService.addContact({
            name: cols[0],
            phone: cols[1],
            email: cols[2] || undefined,
            company: cols[3] || undefined,
            relationshipTag: 'other',
            status: 'radar',
            hasTappedContactButton: false
          });
          added++;
        }
      }
      
      if (added > 0) {
        alert(`¡Éxito! Se importaron ${added} contactos desde el archivo CSV.`);
      } else {
        alert('No se encontraron contactos válidos. Asegúrate de que el CSV tenga el formato: Nombre,Teléfono,Email,Empresa');
      }
      input.value = ''; // reset
    };
    reader.readAsText(file);
  }
}
