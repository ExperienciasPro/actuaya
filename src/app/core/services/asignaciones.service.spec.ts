// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { AsignacionesService } from './asignaciones.service';
import { TecnicoService } from './tecnico.service';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
import { Tecnico } from '../models/tecnico.model';
import { Technician } from '../models/asignaciones.model';

describe('AsignacionesService & TecnicoService unified technician store', () => {
  let asignacionesService: AsignacionesService;
  let tecnicoService: TecnicoService;
  let storageService: StorageService;
  let dataSyncMock: {
    trackLocalModification: ReturnType<typeof vi.fn>;
    saveToServerImmediate: ReturnType<typeof vi.fn>;
  };

  beforeAll(() => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Already initialized by Angular CLI test runner
    }
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    dataSyncMock = {
      trackLocalModification: vi.fn(),
      saveToServerImmediate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        AsignacionesService,
        TecnicoService,
        { provide: DataSyncService, useValue: dataSyncMock },
      ],
    });

    storageService = TestBed.inject(StorageService);
    storageService.setActiveUser('user-test-1');
  });

  it('persists new technicians and exposes them in activeTechnicians() and TecnicoService', () => {
    asignacionesService = TestBed.inject(AsignacionesService);
    tecnicoService = TestBed.inject(TecnicoService);

    const created = asignacionesService.addTechnician({
      firstName: 'Soliner',
      lastName: 'Ingenieria',
      email: 'mantenimientosoliner@gmail.com',
      phone: '3134538411',
      specialty: 'Mantenimiento',
      active: true,
      notes: '',
    });

    expect(asignacionesService.technicians().map(t => t.id)).toContain(created.id);
    expect(asignacionesService.activeTechnicians().map(t => t.id)).toContain(created.id);
    expect(tecnicoService.tecnicos().map(t => t.id)).toContain(created.id);
    expect(dataSyncMock.saveToServerImmediate).toHaveBeenCalled();

    const storedV1 = storageService.get<Technician[]>('um_technicians_v1') || [];
    expect(storedV1.some(t => t.id === created.id)).toBe(true);
  });

  it('migrates legacy technicians from um_tecnicos without duplicating existing technicians', () => {
    const legacyOnly: Tecnico = {
      id: 'legacy-tech-1',
      nombre: 'Carlos Ramirez',
      telefono: '3001112233',
      correo: 'carlos@ejemplo.com',
      especialidad: 'Electricidad',
      estatus: 'Activo',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };
    const duplicateLegacy: Tecnico = {
      id: 'legacy-dup-2',
      nombre: 'Soliner Ingenieria',
      telefono: '3134538411',
      correo: 'mantenimientosoliner@gmail.com',
      estatus: 'Activo',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };
    const existingTech: Technician = {
      id: 'tech-v1-existing',
      firstName: 'Soliner',
      lastName: 'Ingenieria',
      email: 'MANTENIMIENTOSOLINER@GMAIL.COM',
      phone: '3134538411',
      specialty: 'General',
      active: true,
      notes: '',
      createdAt: '2026-10-02T10:00:00.000Z',
    };

    storageService.set('um_technicians_v1', [existingTech]);
    storageService.set('um_tecnicos', [legacyOnly, duplicateLegacy]);

    asignacionesService = TestBed.inject(AsignacionesService);

    const visible = asignacionesService.technicians();
    expect(visible.length).toBe(2);
    expect(visible.some(t => t.id === 'tech-v1-existing')).toBe(true);
    expect(visible.some(t => t.id === 'legacy-tech-1')).toBe(true);
    expect(asignacionesService.activeTechnicians().length).toBe(2);
  });

  it('deletes a technician and immediately removes them from technicians(), activeTechnicians(), and stats', () => {
    asignacionesService = TestBed.inject(AsignacionesService);
    tecnicoService = TestBed.inject(TecnicoService);

    const created = asignacionesService.addTechnician({
      firstName: 'Soliner',
      lastName: 'Ingenieria',
      email: 'mantenimientosoliner@gmail.com',
      phone: '3134538411',
      specialty: 'General',
      active: true,
      notes: '',
    });

    expect(asignacionesService.activeTechnicians().length).toBe(1);
    expect(asignacionesService.estadisticas().tecnicosActivos).toBe(1);

    asignacionesService.deleteTechnician(created.id);

    expect(asignacionesService.technicians().length).toBe(0);
    expect(asignacionesService.activeTechnicians().length).toBe(0);
    expect(asignacionesService.estadisticas().tecnicosActivos).toBe(0);
    expect(tecnicoService.tecnicos().length).toBe(0);

    const rawStored = storageService.get<Technician[]>('um_technicians_v1') || [];
    const deletedRecord = rawStored.find(t => t.id === created.id);
    expect(deletedRecord?.isDeleted).toBe(true);
    expect(deletedRecord?.active).toBe(false);
  });

  it('re-hydrates automatically when StorageService notifies external server sync updates', () => {
    asignacionesService = TestBed.inject(AsignacionesService);
    expect(asignacionesService.technicians().length).toBe(0);

    const syncedFromServer: Technician[] = [
      {
        id: 'synced-tech-99',
        firstName: 'Ana',
        lastName: 'Gomez',
        email: 'ana@ejemplo.com',
        phone: '3109998877',
        specialty: 'Redes',
        active: true,
        notes: '',
        createdAt: '2026-10-30T12:00:00.000Z',
      },
    ];

    storageService.set('um_technicians_v1', syncedFromServer);
    TestBed.flushEffects();

    expect(asignacionesService.technicians().length).toBe(1);
    expect(asignacionesService.activeTechnicians()[0].id).toBe('synced-tech-99');
  });
});
