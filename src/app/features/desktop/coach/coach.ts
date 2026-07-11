import { Component, ElementRef, AfterViewInit, inject } from '@angular/core';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'um-coach-desktop',
  standalone: true,
  imports: [],
  template: `
    <div class="page-container animate-fadeInUp">
      <div class="page-header">
        <h1>📱 Coach Móvil</h1>
        <p class="subtitle">Conecta tu dispositivo móvil y lleva tu productividad en el bolsillo.</p>
      </div>

      <div class="hero-layout">
        <!-- Tarjeta Izquierda (Contenedor Blanco) -->
        <div class="coach-card">
          <div class="coach-badge">📱 ASISTENTE TÁCTICO</div>
          <h3>Tu comando de ejecución diaria</h3>
          
          <div class="coach-benefits">
            <div class="benefit-item">
              <span class="b-icon">🎯</span>
              <div>
                <strong>Enfoque en una sola cosa</strong>
                <p>Olvida la abrumadora lista de la PC. El celular te mostrará solo la tarea #1 más importante para avanzar en tu día.</p>
              </div>
            </div>
            <div class="benefit-item">
              <span class="b-icon">⚡️</span>
              <div>
                <strong>Vacíado mental rápido</strong>
                <p>Ingresa ideas, recordatorios o contactos al instante con un solo botón mientras andas en la calle.</p>
              </div>
            </div>
            <div class="benefit-item">
              <span class="b-icon">📡</span>
              <div>
                <strong>Seguimiento de Radar</strong>
                <p>Lleva el seguimiento ágil de qué contactos en frío debes llamar sin abrir enormes gráficas.</p>
              </div>
            </div>
          </div>

          <div class="coach-actions-panel">
            <div class="action-qr-box">
              <canvas #qrCanvas class="qr-canvas"></canvas>
              <div class="qr-text">👆 <strong>ESCANEA AQUÍ</strong><br/>con la cámara de tu celular</div>
            </div>
            <div class="action-separator">
              <span>ó</span>
            </div>
            <div class="action-btn-box">
              <button class="coach-btn whatsapp" (click)="sendWhatsApp()">
                💬 Enviar link por WhatsApp
              </button>
            </div>
          </div>
        </div>

        <!-- Mockup Flotante (Fuera del contenedor) -->
        <div class="mockup-container">
          <div class="css-phone">
            <div class="screen-mask">
              <img class="inner-app-screenshot" src="/assets/images/mobile-preview.png" alt="ActuaYa Mobile App Preview" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 40px;
      h1 { font-size: 2.2rem; font-weight: 800; color: #1a2e35; margin-bottom: 8px; }
      .subtitle { color: #5a7a84; font-size: 1.15rem; }
    }
    
    .hero-layout {
      display: flex;
      align-items: center;
      gap: 60px;
      @media (max-width: 1000px) { flex-direction: column; gap: 40px; }
    }

    .coach-card {
      flex: 1;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid rgba(0, 40, 30, 0.08);
      box-shadow: 0 15px 40px rgba(0, 40, 30, 0.05);
      padding: 48px;
      background: linear-gradient(135deg, rgba(108, 60, 233, 0.02), transparent);
    }
    
    .coach-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(108, 60, 233, 0.1);
      color: var(--accent);
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
    }
    h3 { font-size: 1.85rem; font-weight: 800; color: #1a2e35; margin-bottom: 30px; letter-spacing: -0.02em; }
    
    .coach-benefits {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 40px;
    }
    .benefit-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      strong { display: block; font-size: 1.1rem; color: #1a2e35; margin-bottom: 6px; font-weight: 700; }
      p { font-size: 0.95rem; color: #5a7a84; line-height: 1.5; margin: 0; }
      .b-icon { font-size: 1.6rem; line-height: 1; margin-top: 2px; }
    }
    
    .coach-actions-panel {
      display: flex;
      align-items: center;
      gap: 24px;
      background: #FAFCFC;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(0,40,30,0.06);
      flex-wrap: wrap;
    }

    .action-qr-box {
      display: flex;
      align-items: center;
      gap: 16px;
      .qr-canvas { width: 100px; height: 100px; display: block; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .qr-text { font-size: 0.85rem; color: #5a7a84; line-height: 1.4; strong { color: #1a2e35; font-weight: 800; font-size: 0.9rem;} }
    }

    .action-separator {
      font-size: 0.9rem;
      font-weight: 600;
      color: #8fa8b0;
      padding: 0 8px;
    }

    .coach-btn {
      padding: 16px 24px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 250ms ease;
      border: none;
      display: flex; align-items: center; gap: 10px;
      
      &.whatsapp {
        background: #00d592; color: white;
        box-shadow: 0 8px 16px rgba(0, 213, 146, 0.25);
        &:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0, 213, 146, 0.35); }
      }
    }
    
    .mockup-container {
      width: 300px; 
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      perspective: 1200px; 
      @media (max-width: 1000px) { width: 100%; margin-top: 20px; }
    }
    
    .css-phone {
      width: 304px;
      height: 608px;
      background: #121316; /* Dark realistic bezel */
      border-radius: 46px;
      padding: 11px; /* Thicker bezel */
      box-shadow: 0 40px 80px rgba(0,40,30,0.2), inset 0 0 0 2px #2a2a2c;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 11px; left: 50%;
        transform: translateX(-50%);
        width: 114px;
        height: 23px;
        background: #121316;
        border-radius: 0 0 16px 16px;
        z-index: 10;
      }
    }
    
    .screen-mask {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border-radius: 36px;
      overflow: hidden;
      position: relative;
    }
    
    .inner-app-screenshot {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .animate-fadeInUp { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class CoachDesktopComponent implements AfterViewInit {
  private el = inject(ElementRef);
  private userService = inject(UserService);

  get mobileUrl(): string {
    const userId = this.userService.profile()?.id;
    return `https://www.actuaya.co/m/install?auth=${userId || ''}&redirect=today`;
  }

  ngAfterViewInit(): void {
    this.generateQR();
  }

  private async generateQR(): Promise<void> {
    const canvas = this.el.nativeElement.querySelector('.qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    try {
      const qrModule = await import('qrcode');
      const QRCode = qrModule.default || qrModule;
      await QRCode.toCanvas(canvas, this.mobileUrl, {
        width: 160, // Render at 160px for high visual fidelity, CSS scales down to 100px
        margin: 2,
        color: { dark: '#1a2e35', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('QR_ERROR', e);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 160;
        canvas.height = 160;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 160, 160);
        ctx.fillStyle = '#1a2e35';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR disponible', 80, 75);
        ctx.fillText('en producción', 80, 92);
      }
    }
  }

  sendWhatsApp(): void {
    const text = encodeURIComponent(
      `📱 Entra aquí para abrir tu Coach Móvil de ActuaYa:\n${this.mobileUrl}\n\nConecta tu celular, olvida la abrumadora PC y concéntrate en tus prioridades del día en la calle. 🎯🚀`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}
