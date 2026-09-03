import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { DataSyncService } from './data-sync.service';
import { StorageService } from './storage.service';
import { Storyboard, DataSource } from '../models/storytelling.model';

@Injectable({ providedIn: 'root' })
export class StorytellingService {
  private storage = inject(StorageService);
  private readonly STORYBOARDS_KEY = 'um_storyboards';
  private readonly DATASOURCES_KEY = 'um_datasources';

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private storyboardsSignal = signal<Storyboard[]>(this.storage.get<Storyboard[]>(this.STORYBOARDS_KEY) || []);
  private dataSourcesSignal = signal<DataSource[]>(this.storage.get<DataSource[]>(this.DATASOURCES_KEY) || []);
  storyboards = computed(() => this.storyboardsSignal().filter(s => !s.isDeleted));
  dataSources = computed(() => this.dataSourcesSignal().filter(s => !s.isDeleted));

  // — Data Source —
  
  addDataSource(source: DataSource): void {
    const updated = [source, ...this.dataSourcesSignal()];
    this.dataSourcesSignal.set(updated);
    this.storage.set(this.DATASOURCES_KEY, updated);
    this.dataSync.trackLocalModification(this.DATASOURCES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  deleteDataSource(id: string): void {
    const updated = this.dataSourcesSignal().map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s);
    this.dataSync.saveToServerImmediate();
    this.dataSourcesSignal.set(updated);
    this.storage.set(this.DATASOURCES_KEY, updated);
    this.dataSync.trackLocalModification(this.DATASOURCES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  // — Storyboards —

  saveStoryboard(storyboard: Storyboard): void {
    const all = this.storyboardsSignal();
    const index = all.findIndex(s => s.id === storyboard.id);
    let updated: Storyboard[];
    
    if (index >= 0) {
      updated = [...all];
      updated[index] = { ...storyboard, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...storyboard, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...all];
    }
    
    this.storyboardsSignal.set(updated);
    this.storage.set(this.STORYBOARDS_KEY, updated);
    this.dataSync.trackLocalModification(this.STORYBOARDS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  deleteStoryboard(id: string): void {
    const updated = this.storyboardsSignal().map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s);
    this.dataSync.saveToServerImmediate();
    this.storyboardsSignal.set(updated);
    this.storage.set(this.STORYBOARDS_KEY, updated);
    this.dataSync.trackLocalModification(this.STORYBOARDS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  // — Helpers —

  generateShareId(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
