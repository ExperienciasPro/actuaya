import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { DataSyncService } from './core/services/data-sync.service';
import { StorageService } from './core/services/storage.service';
import { UserService } from './core/services/user.service';

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
  private userService = inject(UserService);
  private swUpdate = inject(SwUpdate, { optional: true });

  ngOnInit() {
    // Fix C3: Solo sincronizar si ya hay un usuario autenticado (sesión persistida).
    // Si no hay usuario, la sincronización ocurrirá después del login en login.ts.
    const activeUser = this.userService.profile();
    if (activeUser?.id) {
      this.dataSync.syncFromServer();
    }

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

    // Fix C7: Usar sendBeacon para guardado confiable al cerrar pestaña (Safari compatible)
    if (typeof window !== 'undefined') {
      const beaconSave = () => {
        syncRef.saveToServerBeacon();
      };
      window.addEventListener('beforeunload', beaconSave);
      window.addEventListener('pagehide', beaconSave);
    }
  }

  ngOnDestroy() {
    this.dataSync.saveToServer();
  }
}
