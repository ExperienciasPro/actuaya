import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { Storyboard, DataSource } from '../models/storytelling.model';

@Injectable({ providedIn: 'root' })
export class StorytellingService {
  private storage = inject(StorageService);
  private readonly STORYBOARDS_KEY = 'um_storyboards';
  private readonly DATASOURCES_KEY = 'um_datasources';

  storyboards = signal<Storyboard[]>(this.storage.get<Storyboard[]>(this.STORYBOARDS_KEY) || []);
  dataSources = signal<DataSource[]>(this.storage.get<DataSource[]>(this.DATASOURCES_KEY) || []);

  // — Data Source —
  
  addDataSource(source: DataSource): void {
    const updated = [source, ...this.dataSources()];
    this.dataSources.set(updated);
    this.storage.set(this.DATASOURCES_KEY, updated);
  }

  deleteDataSource(id: string): void {
    const updated = this.dataSources().filter(s => s.id !== id);
    this.dataSources.set(updated);
    this.storage.set(this.DATASOURCES_KEY, updated);
  }

  // — Storyboards —

  saveStoryboard(storyboard: Storyboard): void {
    const all = this.storyboards();
    const index = all.findIndex(s => s.id === storyboard.id);
    let updated: Storyboard[];
    
    if (index >= 0) {
      updated = [...all];
      updated[index] = { ...storyboard, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...storyboard, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...all];
    }
    
    this.storyboards.set(updated);
    this.storage.set(this.STORYBOARDS_KEY, updated);
  }

  deleteStoryboard(id: string): void {
    const updated = this.storyboards().filter(s => s.id !== id);
    this.storyboards.set(updated);
    this.storage.set(this.STORYBOARDS_KEY, updated);
  }

  // — Helpers —

  generateShareId(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
