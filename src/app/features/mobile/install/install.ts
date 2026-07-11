import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { LOGO_FULL } from '../../../core/constants/logo.constants';

@Component({
  selector: 'um-mobile-install',
  standalone: true,
  template: `
    <div class="install-screen animate-fadeInUp">
      <div class="install-header">
        <img class="install-logo" [src]="logoFull" alt="ActuaYa" />
        <h1>{{ installTitle }}</h1>
        @if (installSubtitle) {
          <p>{{ installSubtitle }}</p>
        }
      </div>

      <div class="install-steps">
        @if (isIos) {
          <div class="step">
            <span class="step-num">1</span>
            <span class="step-text">Toca el ícono Compartir en el menú inferior de Safari.</span>
            <span class="icon-inline">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span class="step-text">Busca y selecciona la opción</span>
            <span class="step-badge">"Agregar a inicio"</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span class="step-text">Confirma tocando el botón superior derecho.</span>
            <span class="step-badge">"Agregar"</span>
          </div>
        } @else {
          <div class="step">
            <span class="step-num">1</span>
            <span class="step-text">Toca los tres puntos en el menú superior de Chrome.</span>
            <span class="icon-inline">⋮</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span class="step-text">Busca y selecciona la opción</span>
            <span class="step-badge">"Instalar aplicación"</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span class="step-text">Confirma la instalación de ActuaYa.</span>
          </div>
        }
      </div>

      <div class="install-footer">
        <div class="icon-identification-box">
          <img src="/assets/icons/coach-app-icon.png" alt="Icono ActuaYa" class="preview-app-icon" />
          <p class="sub-text">Ubica el icono y ábrelo directamente desde tus aplicaciones.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .install-screen {
      background: transparent;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding: 24px 0;
      text-align: center;
      font-family: inherit;
    }
    .install-header { margin-bottom: 32px; }
    .install-logo { height: 72px; width: auto; margin: 0 auto 32px; display: block; animation: bounce 3s infinite ease-in-out; }
    
    h1 { font-size: 1.95rem; font-weight: 800; color: #1a2e35; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { font-size: 0.95rem; color: #5a7a84; line-height: 1.6; margin: 0; }
    
    .install-steps { text-align: left; background: white; padding: 24px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,40,30,0.06); margin-bottom: 24px; }
    
    .step { font-size: 0.95rem; color: #1a2e35; margin-bottom: 20px; font-weight: 500; display: flex; align-items: center; gap: 12px; line-height: 1.4; }
    .step:last-child { margin-bottom: 0; }
    .step-num { flex-shrink: 0; width: 26px; height: 26px; background: rgba(108,60,233,0.1); color: var(--accent); font-weight: 800; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
    .step-text { flex: 1; }
    .step-badge { display: inline-flex; align-items: center; justify-content: center; background: #edf5f2; color: #1a2e35; padding: 6px 12px; border-radius: 10px; font-weight: 800; font-size: 0.9rem; border: 1px solid rgba(0,40,30,0.1); white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.04); }
    .icon-inline { display: inline-flex; align-items: center; justify-content: center; background: #edf5f2; color: #1a2e35; padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 1.3rem; border: 1px solid rgba(0,40,30,0.1); white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.04); }
    
    strong { color: #1a2e35; font-weight: 800; }
    
    .install-footer { margin-top: 8px; padding-top: 0; }
    .icon-identification-box {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      padding: 18px 20px;
      border-radius: 20px;
      border: 1px solid rgba(0, 40, 30, 0.08);
      box-shadow: 0 8px 24px rgba(0, 40, 30, 0.05);
      text-align: left;
    }
    .preview-app-icon {
      width: 68px;
      height: 68px;
      border-radius: 16px;
      flex-shrink: 0;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .sub-text { font-size: 0.92rem; font-weight: 600; color: #1a2e35; margin: 0; line-height: 1.45; }
    .fallback-btn { background: transparent; border: none; color: var(--accent); font-weight: 700; text-decoration: underline; padding: 12px; cursor: pointer; font-size: 0.95rem; opacity: 0.8; }
    
    .animate-fadeInUp { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class MobileInstallComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  
  isIos = false;
  redirectTarget = 'today';
  
  get installTitle(): string {
    return this.redirectTarget === 'ot' ? 'Instala tu Monitoreo Operativo' : 'Instala tu Coach Móvil';
  }

  get installSubtitle(): string {
    return this.redirectTarget === 'ot' 
      ? 'Agrégala a tu pantalla de inicio para gestionar tus órdenes como una App nativa.' 
      : '';
  }
  
  ngOnInit() {
    this.redirectTarget = this.route.snapshot.queryParamMap.get('redirect') || 'today';
    
    // Automatic device detection
    this.isIos = this.detectIos();

    // Query param override for testing only
    const platformParam = this.route.snapshot.queryParamMap.get('platform') || this.route.snapshot.queryParamMap.get('preview');
    if (platformParam === 'android') {
      this.isIos = false;
    } else if (platformParam === 'ios') {
      this.isIos = true;
    }

    // Detect PWA Status natively
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // If the app is launched from Home Screen, skip installer and go to destination!
    if (isStandalone && !platformParam) {
      this.router.navigate(['/m', this.redirectTarget], { replaceUrl: true });
    }
  }

  private detectIos(): boolean {
    const ua = navigator.userAgent || '';
    const isStandardIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isMacTouch = /Macintosh/.test(ua) && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    return Boolean(isStandardIos || isMacTouch);
  }

  forceEnter() {
    this.router.navigate(['/m', this.redirectTarget]);
  }
}
