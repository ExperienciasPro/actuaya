import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { DataSyncService } from './core/services/data-sync.service';
import { StorageService } from './core/services/storage.service';

@Component({
  selector: 'um-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  private dataSync = inject(DataSyncService);
  private storage = inject(StorageService);
  private swUpdate = inject(SwUpdate, { optional: true });

  ngOnInit() {
    // Sincronizar datos del servidor al iniciar la app
    this.dataSync.syncFromServer();

    // Auto-update PWA service worker
    if (this.swUpdate?.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(evt => {
        if (evt.type === 'VERSION_READY') {
          window.location.reload();
        }
      });
      this.swUpdate.checkForUpdate().catch(() => {});
    }

    // Escuchar cambios en storage para sincronizar al servidor
    const originalSet = this.storage.set.bind(this.storage);
    const syncRef = this.dataSync;
    this.storage.set = function<T>(key: string, value: T) {
      originalSet(key, value);
      if (key.startsWith('um_')) {
        syncRef.saveToServerDebounced();
      }
    };

    // Asegurar guardado inmediato antes de refrescar o cerrar página
    if (typeof window !== 'undefined') {
      const flushSave = () => {
        syncRef.saveToServer();
      };
      window.addEventListener('beforeunload', flushSave);
      window.addEventListener('pagehide', flushSave);
    }
  }

  ngOnDestroy() {
    // Guardar antes de cerrar
    this.dataSync.saveToServer();
  }
}
