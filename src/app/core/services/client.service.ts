import { Injectable, signal, computed, inject, Injector, effect } from '@angular/core';
import { Client } from '../models/client.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly CLIENTS_KEY = 'um_clients';

  private storage = inject(StorageService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;

  // Signal state
  private clientsSignal = signal<Client[]>([]);

  // Public computed
  clients = computed(() => this.clientsSignal().filter(c => !c.isDeleted));

  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  constructor() {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage() {
    const saved = this.storage.get<Client[]>(this.CLIENTS_KEY) || [];
    this.clientsSignal.set(saved);
  }

  addClient(client: Client) {
    const updatedClient = {
      ...client,
      updatedAt: new Date().toISOString()
    };
    const current = this.clientsSignal();
    const updated = [updatedClient, ...current];
    this.clientsSignal.set(updated);
    this.saveAndSync(updated);
  }

  updateClient(updatedClient: Client) {
    const current = this.clientsSignal();
    const updated = current.map((c) => (c.id === updatedClient.id ? { ...updatedClient, updatedAt: new Date().toISOString() } : c));
    this.clientsSignal.set(updated);
    this.saveAndSync(updated);
  }

  deleteClient(id: string) {
    const current = this.clientsSignal();
    const updated = current.map((c) => (c.id === id ? { ...c, isDeleted: true, updatedAt: new Date().toISOString() } : c));
    this.clientsSignal.set(updated);
    
    this.storage.set(this.CLIENTS_KEY, updated);
    this.dataSync.trackLocalModification(this.CLIENTS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  private saveAndSync(data: Client[]) {
    this.storage.set(this.CLIENTS_KEY, data);
    this.dataSync.trackLocalModification(this.CLIENTS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  getClientById(id: string): Client | undefined {
    return this.clients().find((c) => c.id === id);
  }

  generateQrCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
