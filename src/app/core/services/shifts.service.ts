import { Injectable, signal, computed } from '@angular/core';
import { TeamMember, Shift, MEMBER_COLORS } from '../models/shifts.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ShiftsService {
  private readonly MEMBERS_KEY = 'um_team_members';
  private readonly SHIFTS_KEY = 'um_shifts';

  private _members = signal<TeamMember[]>([]);
  members = this._members.asReadonly();

  private _shifts = signal<Shift[]>([]);
  shifts = this._shifts.asReadonly();

  activeMembers = computed(() => this._members().filter(m => m.active));

  constructor(private storage: StorageService) {
    this.load();
  }

  // ─── Members CRUD ───────────────────────

  addMember(member: Omit<TeamMember, 'id' | 'createdAt' | 'active' | 'color'>): void {
    const usedColors = this._members().map(m => m.color);
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) || MEMBER_COLORS[0];
    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      color,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this._members.update(list => [newMember, ...list]);
    this.persistMembers();
  }

  updateMember(id: string, changes: Partial<TeamMember>): void {
    this._members.update(list =>
      list.map(m => (m.id === id ? { ...m, ...changes } : m))
    );
    this.persistMembers();
  }

  removeMember(id: string): void {
    this._members.update(list => list.filter(m => m.id !== id));
    this._shifts.update(list => list.filter(s => s.memberId !== id));
    this.persistMembers();
    this.persistShifts();
  }

  getMember(id: string): TeamMember | undefined {
    return this._members().find(m => m.id === id);
  }

  // ─── Shifts CRUD ────────────────────────

  addShift(shift: Omit<Shift, 'id'>): void {
    const newShift: Shift = { ...shift, id: crypto.randomUUID() };
    this._shifts.update(list => [...list, newShift]);
    this.persistShifts();
  }

  removeShift(id: string): void {
    this._shifts.update(list => list.filter(s => s.id !== id));
    this.persistShifts();
  }

  // ─── Queries ────────────────────────────

  getShiftsForWeek(weekStart: string): Shift[] {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return this._shifts().filter(s => s.date >= startStr && s.date < endStr);
  }

  getShiftsForDay(date: string): Shift[] {
    return this._shifts().filter(s => s.date === date);
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
    if (members) this._members.set(members);
    const shifts = this.storage.get<Shift[]>(this.SHIFTS_KEY);
    if (shifts) this._shifts.set(shifts);
  }

  private persistMembers(): void {
    this.storage.set(this.MEMBERS_KEY, this._members());
  }

  private persistShifts(): void {
    this.storage.set(this.SHIFTS_KEY, this._shifts());
  }
}
