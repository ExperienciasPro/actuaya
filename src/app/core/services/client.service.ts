import { Injectable, signal, computed, inject, Injector } from '@angular/core';
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
  clients = computed(() => this.clientsSignal());

  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  constructor() {
    this.loadFromStorage();
    // Re-load if another tab changes the data
    window.addEventListener('storage', (e) => {
      if (e.key === `${this.CLIENTS_KEY}_${this.storage.getActiveUserId()}`) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage() {
    const saved = this.storage.get<Client[]>(this.CLIENTS_KEY) || [];
    this.clientsSignal.set(saved);
  }

  addClient(client: Client) {
    const current = this.clientsSignal();
    const updated = [client, ...current];
    this.clientsSignal.set(updated);
    this.saveAndSync(updated);
  }

  updateClient(updatedClient: Client) {
    const current = this.clientsSignal();
    const updated = current.map((c) => (c.id === updatedClient.id ? updatedClient : c));
    this.clientsSignal.set(updated);
    this.saveAndSync(updated);
  }

  deleteClient(id: string) {
    const current = this.clientsSignal();
    const updated = current.filter((c) => c.id !== id);
    this.clientsSignal.set(updated);
    this.saveAndSync(updated);
  }

  private saveAndSync(data: Client[]) {
    this.storage.set(this.CLIENTS_KEY, data);
    this.dataSync.saveToServerDebounced();
  }

  getClientById(id: string): Client | undefined {
    return this.clientsSignal().find((c) => c.id === id);
  }

  generateQrCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
