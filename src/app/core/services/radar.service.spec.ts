// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ApplicationRef, ɵresolveComponentResources } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { RadarService } from './radar.service';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { SalesService } from './sales.service';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
import { RadarInventoryComponent } from '../../features/desktop/radar/radar-inventory/radar-inventory';
import { RadarContact } from '../models/radar-contact.model';

describe('RadarService & RadarInventoryComponent regression suite', () => {
  let storageService: StorageService;
  let dataSyncMock: {
    trackLocalModification: ReturnType<typeof vi.fn>;
    saveToServerDebounced: ReturnType<typeof vi.fn>;
    saveToServerImmediate: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Already initialized by Angular CLI runner
    }
    await ɵresolveComponentResources(() => Promise.resolve(''));
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    dataSyncMock = {
      trackLocalModification: vi.fn(),
      saveToServerDebounced: vi.fn(),
      saveToServerImmediate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [RadarInventoryComponent],
      providers: [
        provideRouter([]),
        StorageService,
        TaskService,
        GoalService,
        { provide: SalesService, useValue: { funnels: () => [], getFunnelById: () => undefined, createDeal: vi.fn() } },
        RadarService,
        { provide: DataSyncService, useValue: dataSyncMock },
      ],
    });

    storageService = TestBed.inject(StorageService);
    storageService.setActiveUser('user-radar-1');
  });

  it('creates a new contact in RadarInventoryComponent without freezing in an infinite effect loop', () => {
    storageService.set('um_radar', [
      {
        id: 'c1',
        name: 'Contacto Uno',
        phone: '3001112233',
        relationshipTag: 'acquaintance',
        status: 'radar',
        hasTappedContactButton: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'c2',
        name: 'Contacto Dos',
        phone: '3002223344',
        relationshipTag: 'client',
        status: 'radar',
        hasTappedContactButton: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'c3',
        name: 'Contacto Tres',
        phone: '3003334455',
        relationshipTag: 'referral',
        status: 'radar',
        hasTappedContactButton: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const radarService = TestBed.inject(RadarService);
    const fixture = TestBed.createComponent(RadarInventoryComponent);
    const appRef = TestBed.inject(ApplicationRef);

    fixture.detectChanges();
    appRef.tick();

    expect(radarService.contacts().length).toBe(3);

    const comp = fixture.componentInstance;
    comp.showBulkAdd.set(true);
    comp.showMoreDetails.set(true);
    comp.newName.set('Carlos');
    comp.newLastName.set('Perez');
    comp.newPhone.set('3110001122');
    comp.newNotes.set('Cliente potencial');
    fixture.detectChanges();

    comp.addSingle();
    fixture.detectChanges();
    appRef.tick();

    expect(radarService.contacts().length).toBe(4);
    expect(radarService.contacts().some(c => c.name === 'Carlos Perez')).toBe(true);
    expect(dataSyncMock.saveToServerDebounced).toHaveBeenCalled();

    const stored = storageService.get<RadarContact[]>('um_radar') || [];
    expect(stored.length).toBe(4);
  });

  it('flushes GoalService, TaskService, and RadarService effects cleanly when all three stores contain data', () => {
    storageService.set('um_goals', [
      {
        id: 'g1',
        title: 'Meta Q4',
        description: 'Cerrar ventas',
        mode: 'business',
        status: 'in_progress',
        progress: 25,
        childGoalIds: [],
        taskIds: [],
        microSteps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    storageService.set('um_tasks', [
      {
        id: 't1',
        goalId: 'g1',
        title: 'Llamar prospectos',
        status: 'pending',
        priority: 'high',
        order: 0,
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    storageService.set('um_radar', [
      {
        id: 'c1',
        name: 'Laura Diaz',
        phone: '3159998877',
        relationshipTag: 'client',
        status: 'radar',
        hasTappedContactButton: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const goalService = TestBed.inject(GoalService);
    const taskService = TestBed.inject(TaskService);
    const radarService = TestBed.inject(RadarService);
    const appRef = TestBed.inject(ApplicationRef);

    TestBed.flushEffects();
    appRef.tick();

    expect(goalService.goals().length).toBe(1);
    expect(taskService.tasks().length).toBe(1);
    expect(radarService.contacts().length).toBe(1);

    // Triggering another storage change should not cause any infinite loop
    storageService.set('um_other_key', { ok: true });
    TestBed.flushEffects();
    appRef.tick();

    expect(radarService.contacts().length).toBe(1);
  });

  it('hydrates server contacts without looping and isolates data on user logout/switch', () => {
    const radarService = TestBed.inject(RadarService);
    const appRef = TestBed.inject(ApplicationRef);

    radarService.hydrateDirectly([
      {
        id: 'srv-1',
        name: 'Contacto Servidor',
        phone: '3201234567',
        relationshipTag: 'event',
        status: 'radar',
        hasTappedContactButton: false,
        createdAt: '2026-10-30T10:00:00.000Z',
        updatedAt: '2026-10-30T10:00:00.000Z',
      },
    ]);
    TestBed.flushEffects();
    appRef.tick();

    expect(radarService.contacts().length).toBe(1);

    // Switch to another user with empty radar
    storageService.setActiveUser('user-radar-2');
    TestBed.flushEffects();
    appRef.tick();

    expect(radarService.contacts().length).toBe(0);
  });
});
