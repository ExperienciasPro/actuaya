import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
import { Equipo } from '../models/equipo.model';

const EQUIPOS_KEY = 'um_equipos';

@Injectable({ providedIn: 'root' })
export class EquipoService {
  private storage = inject(StorageService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private equiposSignal = signal<Equipo[]>(this.loadEquipos());
  equipos = computed(() => this.equiposSignal().filter(e => !e.isDeleted));

  categorias = computed(() => {
    const cats = new Set(this.equipos().map(e => e.categoria).filter(Boolean));
    return Array.from(cats);
  });

  subcategorias = computed(() => {
    const subcats = new Set(this.equipos().map(e => e.subcategoria).filter(Boolean));
    return Array.from(subcats);
  });

  private loadEquipos(): Equipo[] {
    const data = this.storage.get<Equipo[]>(EQUIPOS_KEY);
    return Array.isArray(data) ? data : [];
  }

  private saveEquipos(list: Equipo[]) {
    this.equiposSignal.set(list);
    this.storage.set(EQUIPOS_KEY, list);
    this.dataSync.trackLocalModification(EQUIPOS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  addEquipo(data: Omit<Equipo, 'id' | 'createdAt' | 'updatedAt'>) {
    const newEquipo: Equipo = {
      ...data,
      id: 'eq-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveEquipos([newEquipo, ...this.equiposSignal()]);
  }

  updateEquipo(id: string, data: Partial<Equipo>) {
    const list = this.equiposSignal().map(e => {
      if (e.id === id) {
        return { ...e, ...data, updatedAt: new Date().toISOString() };
      }
      return e;
    });
    this.saveEquipos(list);
  }

  deleteEquipo(id: string) {
    this.saveEquipos(this.equiposSignal().map(e => e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e));
  }
}
