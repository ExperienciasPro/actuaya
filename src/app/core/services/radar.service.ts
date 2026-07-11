import { Injectable, signal, computed, effect } from '@angular/core';
import { RadarContact, RadarStatus, RelationshipTag } from '../models/radar-contact.model';
import { StorageService } from './storage.service';
import { SalesService } from './sales.service';

@Injectable({ providedIn: 'root' })
export class RadarService {
  private readonly STORAGE_KEY = 'um_radar';
  private readonly DEFAULT_TEMPLATE = 'Hola [Name], ¿cómo estás? Soy [User]. Me encantaría ponernos al día. ¿Tendrás un momento esta semana para un café virtual? ☕';

  private contactsSignal = signal<RadarContact[]>([]);

  readonly contacts = this.contactsSignal.asReadonly();

  // — Filtered lists —
  readonly radarContacts = computed(() =>
    this.contactsSignal().filter(c => c.status === 'radar')
  );

  readonly contactedContacts = computed(() =>
    this.contactsSignal().filter(c => c.status === 'contacted')
  );

  readonly snoozedContacts = computed(() =>
    this.contactsSignal().filter(c => c.status === 'snoozed')
  );

  readonly promotedContacts = computed(() =>
    this.contactsSignal().filter(c => c.status === 'promoted')
  );

  // — Stats —
  readonly totalContacts = computed(() =>
    this.contactsSignal().filter(c => c.status !== 'promoted').length
  );

  readonly contactedThisWeek = computed(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return this.contactsSignal().filter(c =>
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
    return this.contactsSignal().filter(c => {
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
    const freshPool = this.contactsSignal().filter(c => {
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

  constructor(
    private storage: StorageService,
    private salesService: SalesService,
  ) {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
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
    this.contactsSignal.update(cs => cs.filter(c => c.id !== id));
    this.save();
  }

  getById(id: string): RadarContact | undefined {
    return this.contactsSignal().find(c => c.id === id);
  }

  // ═══════════════════════════════════════════
  // — STATUS TRANSITIONS —
  // ═══════════════════════════════════════════

  /**
   * Triggered ONLY when user taps "Contactar Ahora" → opens WhatsApp deep link.
   * This is the ONLY way to break the persistence loop.
   */
  triggerWhatsAppContact(id: string): string {
    const contact = this.getById(id);
    if (!contact) return '';

    // Build WhatsApp deep link with pre-filled template
    const template = contact.whatsappTemplate || this.DEFAULT_TEMPLATE;
    const message = template.replace(/\[Name\]/g, contact.name.split(' ')[0]);
    const phone = contact.phone.replace(/[^0-9+]/g, '');
    const deepLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Update state — THIS breaks the persistence loop
    this.updateContact(id, {
      hasTappedContactButton: true,
      status: 'contacted',
      contactedAt: new Date(),
      overduesSince: undefined,
    });

    return deepLink;
  }

  /** Mark as contacted (without WhatsApp — legacy/manual) */
  markContacted(id: string): void {
    this.updateContact(id, {
      status: 'contacted',
      contactedAt: new Date(),
      hasTappedContactButton: true,
      overduesSince: undefined,
    });
  }

  /** Snooze with specific date — forces user to pick a future date */
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

  /** Snooze until a specific date */
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

  // — Promote to Deal (Conversion Trigger) —
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

  /** Process overdues: contacts assigned yesterday+ that were never contacted */
  private processOverdues(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.contactsSignal().forEach(c => {
      if (c.status !== 'radar') return;
      if (c.hasTappedContactButton) return;
      if (!c.assignedDate) return;

      const assigned = new Date(c.assignedDate);
      assigned.setHours(0, 0, 0, 0);

      if (assigned < today && !c.overduesSince) {
        this.updateContact(c.id, { overduesSince: assigned });
      }
    });
  }

  /** Get reminder text based on time-of-day logic */
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
    return this.contactsSignal().filter(c => c.relationshipTag === tag);
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

  hydrateDirectly(contacts: any[]): void {
    if (Array.isArray(contacts)) {
      const migratedData: RadarContact[] = contacts.map(c => ({
        ...c,
        name: c.name || c.fullName || 'Sin nombre',
        phone: c.phone || c.mobile || '',
        relationshipTag: c.relationshipTag || 'acquaintance',
        status: c.status || 'radar',
        hasTappedContactButton: c.hasTappedContactButton ?? false,
      }));
      this.contactsSignal.set(migratedData);
    }
  }

  private loadFromStorage(): void {
    const data = this.storage.get<RadarContact[]>(this.STORAGE_KEY);
    if (data) this.hydrateDirectly(data);
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.contactsSignal());
  }
}
