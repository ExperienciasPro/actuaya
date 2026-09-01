import { Injectable, signal, inject, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
import { Tecnico } from '../models/tecnico.model';

const TECNICOS_KEY = 'um_tecnicos';

@Injectable({ providedIn: 'root' })
export class TecnicoService {
  private storage = inject(StorageService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  tecnicos = signal<Tecnico[]>(this.loadTecnicos());

  private loadTecnicos(): Tecnico[] {
    const data = this.storage.get<Tecnico[]>(TECNICOS_KEY);
    return Array.isArray(data) ? data : [];
  }

  private saveTecnicos(list: Tecnico[]) {
    this.tecnicos.set(list);
    this.storage.set(TECNICOS_KEY, list);
    this.dataSync.trackLocalModification(TECNICOS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  addTecnico(data: Omit<Tecnico, 'id' | 'createdAt' | 'updatedAt' | 'estatus'>) {
    const newTecnico: Tecnico = {
      ...data,
      id: 'tec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      estatus: 'Activo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveTecnicos([newTecnico, ...this.tecnicos()]);
  }

  updateTecnico(id: string, data: Partial<Tecnico>) {
    const list = this.tecnicos().map(t => {
      if (t.id === id) {
        return { ...t, ...data, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    this.saveTecnicos(list);
  }

  deleteTecnico(id: string) {
    this.saveTecnicos(this.tecnicos().filter(t => t.id !== id));
  }
}
