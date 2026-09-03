import { Injectable, signal, computed, Injector, inject } from '@angular/core';
import { TeamMember, Shift, MEMBER_COLORS } from '../models/shifts.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class ShiftsService {
  private readonly MEMBERS_KEY = 'um_team_members';
  private readonly SHIFTS_KEY = 'um_shifts';

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private _membersSignal = signal<TeamMember[]>([]);
  members = computed(() => this._membersSignal().filter(m => !m.isDeleted));

  private _shiftsSignal = signal<Shift[]>([]);
  shifts = computed(() => this._shiftsSignal().filter(s => !s.isDeleted));

  activeMembers = computed(() => this.members().filter(m => m.active));

  constructor(private storage: StorageService) {
    this.load();
  }

  // ─── Members CRUD ───────────────────────

  addMember(member: Omit<TeamMember, 'id' | 'createdAt' | 'active' | 'color' | 'updatedAt'>): void {
    const usedColors = this._membersSignal().map(m => m.color);
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) || MEMBER_COLORS[0];
    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      color,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._membersSignal.update(list => [newMember, ...list]);
    this.persistMembers();
  }

  updateMember(id: string, changes: Partial<TeamMember>): void {
    this._membersSignal.update(list =>
      list.map(m => (m.id === id ? { ...m, ...changes, updatedAt: new Date().toISOString() } : m))
    );
    this.persistMembers();
  }

  removeMember(id: string): void {
    this._membersSignal.update(list => list.map(m => m.id === id ? { ...m, isDeleted: true, updatedAt: new Date().toISOString() } : m));
    this._shiftsSignal.update(list => list.map(s => s.memberId === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s));
    
    this.storage.set(this.MEMBERS_KEY, this._membersSignal());
    this.storage.set(this.SHIFTS_KEY, this._shiftsSignal());
    this.dataSync.trackLocalModification(this.MEMBERS_KEY);
    this.dataSync.trackLocalModification(this.SHIFTS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  getMember(id: string): TeamMember | undefined {
    return this.members().find(m => m.id === id);
  }

  // ─── Shifts CRUD ────────────────────────

  addShift(shift: Omit<Shift, 'id' | 'updatedAt'>): void {
    const newShift: Shift = { ...shift, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    this._shiftsSignal.update(list => [...list, newShift]);
    this.persistShifts();
  }

  removeShift(id: string): void {
    this._shiftsSignal.update(list => list.map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s));
    this.storage.set(this.SHIFTS_KEY, this._shiftsSignal());
    this.dataSync.trackLocalModification(this.SHIFTS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  // ─── Queries ────────────────────────────

  getShiftsForWeek(weekStart: string): Shift[] {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return this.shifts().filter(s => s.date >= startStr && s.date < endStr);
  }

  getShiftsForDay(date: string): Shift[] {
    return this.shifts().filter(s => s.date === date);
  }

  getMemberShiftsForWeek(memberId: string, weekStart: string): Shift[] {
    return this.getShiftsForWeek(weekStart).filter(s => s.memberId === memberId);
  }

  getMemberHoursForWeek(memberId: string, weekStart: string): number {
    const shifts = this.getMemberShiftsForWeek(memberId, weekStart);
    return shifts.reduce((sum, s) => {
      const start = this.timeToMinutes(s.startTime);
      let end = this.timeToMinutes(s.endTime);
      if (end <= start) end += 24 * 60; // overnight
      return sum + (end - start) / 60;
    }, 0);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  // ─── Persistence ────────────────────────

  private load(): void {
    const members = this.storage.get<TeamMember[]>(this.MEMBERS_KEY);
    if (members) this._membersSignal.set(members);
    const shifts = this.storage.get<Shift[]>(this.SHIFTS_KEY);
    if (shifts) this._shiftsSignal.set(shifts);
  }

  private persistMembers(): void {
    this.storage.set(this.MEMBERS_KEY, this._membersSignal());
    this.dataSync.trackLocalModification(this.MEMBERS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistShifts(): void {
    this.storage.set(this.SHIFTS_KEY, this._shiftsSignal());
    this.dataSync.trackLocalModification(this.SHIFTS_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
