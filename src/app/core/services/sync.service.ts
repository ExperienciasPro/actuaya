import { Injectable, signal, computed } from '@angular/core';

export type DeviceType = 'desktop' | 'mobile';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private deviceTypeSignal = signal<DeviceType>(this.detectDevice());

  readonly deviceType = this.deviceTypeSignal.asReadonly();
  readonly isMobile = computed(() => this.deviceTypeSignal() === 'mobile');
  readonly isDesktop = computed(() => this.deviceTypeSignal() === 'desktop');

  constructor() {
    this.listenToResize();
  }

  private detectDevice(): DeviceType {
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }

  private listenToResize(): void {
    window.addEventListener('resize', () => {
      this.deviceTypeSignal.set(this.detectDevice());
    });
  }

  /**
   * Regla de Bloqueo: verifica si una acción está permitida en el dispositivo actual.
   * Desde móvil no se pueden crear metas maestras nuevas.
   */
  canCreateGoal(): boolean {
    return this.isDesktop();
  }

  /**
   * Verifica si el dispositivo actual puede acceder a la configuración avanzada.
   */
  canAccessSettings(): boolean {
    return this.isDesktop();
  }
}
