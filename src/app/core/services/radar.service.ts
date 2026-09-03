import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';
import { RadarContact, RadarStatus, RelationshipTag } from '../models/radar-contact.model';
import { StorageService } from './storage.service';
import { SalesService } from './sales.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class RadarService {
  private readonly STORAGE_KEY = 'um_radar';
  private readonly DEFAULT_TEMPLATE = 'Hola [Name], ¿cómo estás? Soy [User]. Me encantaría ponernos al día. ¿Tendrás un momento esta semana para un café virtual? ☕';

  private storage = inject(StorageService);
  private salesService = inject(SalesService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private contactsSignal = signal<RadarContact[]>([]);

  readonly contacts = computed(() => this.contactsSignal().filter(c => !c.isDeleted));

  // — Filtered lists —
  readonly radarContacts = computed(() =>
    this.contacts().filter(c => c.status === 'radar')
  );

  readonly contactedContacts = computed(() =>
    this.contacts().filter(c => c.status === 'contacted')
  );

  readonly snoozedContacts = computed(() =>
    this.contacts().filter(c => c.status === 'snoozed')
  );

  readonly promotedContacts = computed(() =>
    this.contacts().filter(c => c.status === 'promoted')
  );

  // — Stats —
  readonly totalContacts = computed(() =>
    this.contacts().filter(c => c.status !== 'promoted').length
  );

  readonly contactedThisWeek = computed(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return this.contacts().filter(c =>
      c.contactedAt && new Date(c.contactedAt) >= weekStart
    ).length;
  });

  // ═══════════════════════════════════════════
  // PERSISTENCE LOOP — Overdue & Daily 5
  // ═══════════════════════════════════════════

  /** Overdue contacts: assigned but hasTappedContactButton is still false */
  readonly overdueContacts = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.contacts().filter(c => {
      if (c.status !== 'radar') return false;
      if (c.hasTappedContactButton) return false;
      if (!c.assignedDate) return false;
      const assigned = new Date(c.assignedDate);
      assigned.setHours(0, 0, 0, 0);
      return assigned < today; // Was assigned before today, still not contacted
    });
  });

  /** Daily 5 with enforcement: overdues anchor at top, max 5 overdues blocks new feeds */
  readonly dailyFive = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySeed = today.getTime();

    const overdue = this.overdueContacts();

    // If 5+ overdue, NO new contacts — force user to clear backlog
    if (overdue.length >= 5) {
      return overdue.slice(0, 5).map(c => ({ ...c, isOverdue: true }));
    }

    // Fill remaining slots with fresh radar contacts
    const overdueIds = new Set(overdue.map(c => c.id));
    const freshPool = this.contacts().filter(c => {
      if (overdueIds.has(c.id)) return false;
      if (c.hasTappedContactButton) return false;
      if (c.status === 'radar') return true;
      // Include snoozed contacts whose snooze date has passed
      if (c.status === 'snoozed' && c.snoozedUntil) {
        return new Date(c.snoozedUntil) <= today;
      }
      return false;
    });

    // Deterministic shuffle for fresh contacts (same 5 all day)
    const shuffled = [...freshPool].sort((a, b) => {
      const hashA = this.hashCode(a.id + todaySeed);
      const hashB = this.hashCode(b.id + todaySeed);
      return hashA - hashB;
    });

    const slotsLeft = 5 - overdue.length;
    const freshPicks = shuffled.slice(0, slotsLeft);

    return [
      ...overdue.map(c => ({ ...c, isOverdue: true })),
      ...freshPicks.map(c => ({ ...c, isOverdue: false, assignedDate: c.assignedDate || today })),
    ];
  });

  readonly dailyProgress = computed(() => {
    const five = this.dailyFive();
    if (five.length === 0) return 100;
    const contacted = five.filter(c => c.hasTappedContactButton).length;
    return Math.round((contacted / five.length) * 100);
  });

  readonly dailyContactedCount = computed(() =>
    this.dailyFive().filter(c => c.hasTappedContactButton).length
  );

  constructor() {
    this.loadFromStorage();
    this.processOverdues(); // Mark overdue contacts on init
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
        this.processOverdues();
      }
    });
  }

  // ═══════════════════════════════════════════
  // — CRUD —
  // ═══════════════════════════════════════════

  addContact(contact: Omit<RadarContact, 'id' | 'createdAt' | 'updatedAt'>): RadarContact {
    const newContact: RadarContact = {
      ...contact,
      id: crypto.randomUUID(),
      hasTappedContactButton: contact.hasTappedContactButton ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contactsSignal.update(cs => [...cs, newContact]);
    this.save();
    return newContact;
  }

  addBulk(contacts: Omit<RadarContact, 'id' | 'createdAt' | 'updatedAt'>[]): void {
    const newContacts = contacts.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      hasTappedContactButton: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    this.contactsSignal.update(cs => [...cs, ...newContacts]);
    this.save();
  }

  updateContact(id: string, changes: Partial<RadarContact>): void {
    this.contactsSignal.update(cs =>
      cs.map(c => (c.id === id ? { ...c, ...changes, updatedAt: new Date() } : c))
    );
    this.save();
  }

  deleteContact(id: string): void {
    this.contactsSignal.update(cs => 
      cs.map(c => (c.id === id ? { ...c, isDeleted: true, updatedAt: new Date() } : c))
    );
    this.save();
    this.dataSync.saveToServerImmediate();
  }

  getById(id: string): RadarContact | undefined {
    return this.contacts().find(c => c.id === id);
  }

  // ═══════════════════════════════════════════
  // — STATUS TRANSITIONS —
  // ═══════════════════════════════════════════

  triggerWhatsAppContact(id: string): string {
    const contact = this.getById(id);
    if (!contact) return '';

    const template = contact.whatsappTemplate || this.DEFAULT_TEMPLATE;
    const message = template.replace(/\[Name\]/g, contact.name.split(' ')[0]);
    const phone = contact.phone.replace(/[^0-9+]/g, '');
    const deepLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    this.updateContact(id, {
      hasTappedContactButton: true,
      status: 'contacted',
      contactedAt: new Date(),
      overduesSince: undefined,
    });

    return deepLink;
  }

  markContacted(id: string): void {
    this.updateContact(id, {
      status: 'contacted',
      contactedAt: new Date(),
      hasTappedContactButton: true,
      overduesSince: undefined,
    });
  }

  snooze(id: string, months: number): void {
    const snoozedUntil = new Date();
    snoozedUntil.setMonth(snoozedUntil.getMonth() + months);
    this.updateContact(id, {
      status: 'snoozed',
      snoozedUntil,
      snoozeMonths: months,
      overduesSince: undefined,
      assignedDate: undefined,
    });
  }

  snoozeUntilDate(id: string, date: Date): void {
    this.updateContact(id, {
      status: 'snoozed',
      snoozedUntil: date,
      overduesSince: undefined,
      assignedDate: undefined,
    });
  }

  moveBackToRadar(id: string): void {
    this.updateContact(id, {
      status: 'radar',
      snoozedUntil: undefined,
      snoozeMonths: undefined,
      hasTappedContactButton: false,
      overduesSince: undefined,
      assignedDate: undefined,
    });
  }

  promoteToDeal(id: string, funnelId: string, stageId: string, value?: number): void {
    const contact = this.getById(id);
    if (!contact) return;

    const deal = this.salesService.createDeal({
      funnelId,
      stageId,
      contactName: contact.name,
      company: contact.company || '',
      value: value || 0,
      currency: 'MXN',
      status: 'open',
    });

    this.updateContact(id, {
      status: 'promoted',
      promotedAt: new Date(),
      dealId: deal.id,
    });
  }

  // ═══════════════════════════════════════════
  // — PERSISTENCE LOOP ENGINE —
  // ═══════════════════════════════════════════

  private processOverdues(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let changed = false;
    const current = this.contactsSignal().map(c => {
      if (c.status !== 'radar' || c.hasTappedContactButton || !c.assignedDate || c.isDeleted) return c;

      const assigned = new Date(c.assignedDate);
      assigned.setHours(0, 0, 0, 0);

      if (assigned < today && !c.overduesSince) {
        changed = true;
        return { ...c, overduesSince: assigned, updatedAt: new Date() };
      }
      return c;
    });

    if (changed) {
      this.contactsSignal.set(current);
      this.save();
    }
  }

  getReminderForContact(contact: RadarContact): string | null {
    if (contact.hasTappedContactButton) return null;
    if (!contact.assignedDate) return null;

    const now = new Date();
    const hour = now.getHours();
    const assigned = new Date(contact.assignedDate);
    assigned.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (contact.overduesSince) {
      const daysOverdue = Math.floor((today.getTime() - new Date(contact.overduesSince).getTime()) / 86400000);
      return `⚠️ Atrasado ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`;
    }

    if (assigned.getTime() === today.getTime()) {
      if (hour >= 13) {
        return `No dejes a ${contact.name.split(' ')[0]} en visto. Toma 5 segundos saludarlo hoy.`;
      }
    }

    return null;
  }

  // — Helpers —
  getByTag(tag: RelationshipTag): RadarContact[] {
    return this.contacts().filter(c => c.relationshipTag === tag);
  }

  getDefaultTemplate(): string {
    return this.DEFAULT_TEMPLATE;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  hydrateDirectly(serverContacts: any[]): void {
    if (!Array.isArray(serverContacts)) return;
    
    const local = this.contactsSignal();
    const localMap = new Map(local.map(c => [c.id, c]));
    
    for (const serverContact of serverContacts) {
      const c: RadarContact = {
        ...serverContact,
        name: serverContact.name || serverContact.fullName || 'Sin nombre',
        phone: serverContact.phone || serverContact.mobile || '',
        relationshipTag: serverContact.relationshipTag || 'acquaintance',
        status: serverContact.status || 'radar',
        hasTappedContactButton: serverContact.hasTappedContactButton ?? false,
      };
      
      const localC = localMap.get(c.id);
      if (localC) {
        const localTime = new Date(localC.updatedAt || 0).getTime();
        const serverTime = new Date(c.updatedAt || 0).getTime();
        if (serverTime >= localTime) {
          localMap.set(c.id, c);
        }
      } else {
        localMap.set(c.id, c);
      }
    }
    
    this.contactsSignal.set(Array.from(localMap.values()));
  }

  private loadFromStorage(): void {
    const data = this.storage.get<RadarContact[]>(this.STORAGE_KEY);
    if (data) this.hydrateDirectly(data);
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.contactsSignal());
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
