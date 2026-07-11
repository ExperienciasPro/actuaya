import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'um-subscription-required',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="sub-required-page">
      <div class="sub-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
      </div>

      <div class="sub-container animate-fadeInUp">
        <div class="sub-card">
          <div class="card-top-bar expired-bar"></div>

          <div class="sub-icon">🔒</div>
          <h1>Tu período de prueba ha finalizado</h1>
          <p class="sub-message">
            Hola <strong>{{ userName }}</strong>, tu prueba gratuita de 30 días ha expirado.
            Para continuar usando todas las funcionalidades de <strong>ACTUAYA</strong>,
            necesitas activar una suscripción.
          </p>

          <div class="plan-card">
            <div class="plan-header">
              <span class="plan-badge">⭐ RECOMENDADO</span>
              <h3>Plan Profesional</h3>
            </div>
            <div class="plan-features">
              <div class="feature-item">✅ Acceso a todos los módulos</div>
              <div class="feature-item">✅ Coach Móvil incluido</div>
              <div class="feature-item">✅ Soporte prioritario</div>
              <div class="feature-item">✅ Actualizaciones automáticas</div>
              <div class="feature-item">✅ Almacenamiento expandido</div>
            </div>
            <div class="plan-cta">
              <a class="btn-primary-lg" href="https://wa.me/573001234567?text=Hola,%20quiero%20activar%20mi%20suscripción%20de%20ACTUAYA" target="_blank">
                💬 Contactar para Activar
                <span class="btn-arrow">→</span>
              </a>
            </div>
          </div>

          <div class="sub-alternatives">
            <p class="alt-text">¿Ya realizaste el pago? El administrador activará tu cuenta en breve.</p>
            <button class="btn-outline" (click)="refreshStatus()">
              🔄 Verificar mi estado
            </button>
          </div>

          <div class="sub-footer">
            <button class="btn-link" (click)="logout()">← Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sub-required-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary, #0a0a1a);
      position: relative;
      overflow: hidden;
      padding: 24px;
    }

    .sub-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;
    }

    .bg-orb.orb-1 {
      width: 400px;
      height: 400px;
      background: linear-gradient(135deg, #6c5ce7, #a29bfe);
      top: -100px;
      right: -100px;
    }

    .bg-orb.orb-2 {
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, #e84393, #fd79a8);
      bottom: -80px;
      left: -80px;
    }

    .sub-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 520px;
    }

    .sub-card {
      background: var(--bg-card, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      backdrop-filter: blur(20px);
    }

    .card-top-bar {
      height: 4px;
      border-radius: 4px 4px 0 0;
      margin: -40px -32px 28px;
    }

    .expired-bar {
      background: linear-gradient(90deg, #e84393, #fd79a8, #fdcb6e);
    }

    .sub-icon {
      font-size: 56px;
      margin-bottom: 16px;
      animation: pulse-lock 2s ease-in-out infinite;
    }

    @keyframes pulse-lock {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
      margin-bottom: 12px;
      line-height: 1.3;
    }

    .sub-message {
      color: var(--text-secondary, rgba(255, 255, 255, 0.6));
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .plan-card {
      background: linear-gradient(135deg, rgba(108, 92, 231, 0.12), rgba(162, 155, 254, 0.08));
      border: 1px solid rgba(108, 92, 231, 0.25);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .plan-header {
      margin-bottom: 16px;
    }

    .plan-badge {
      display: inline-block;
      background: linear-gradient(135deg, #6c5ce7, #a29bfe);
      color: #fff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .plan-header h3 {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }

    .plan-features {
      text-align: left;
      margin-bottom: 20px;
    }

    .feature-item {
      padding: 6px 0;
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
      font-size: 0.88rem;
    }

    .plan-cta {
      text-align: center;
    }

    .btn-primary-lg {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #6c5ce7, #a29bfe);
      color: #fff;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-primary-lg:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(108, 92, 231, 0.3);
    }

    .btn-arrow {
      font-size: 1.1rem;
      transition: transform 0.2s;
    }

    .btn-primary-lg:hover .btn-arrow {
      transform: translateX(4px);
    }

    .sub-alternatives {
      margin-top: 4px;
      padding-top: 20px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .alt-text {
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
      font-size: 0.82rem;
      margin-bottom: 12px;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline:hover {
      border-color: #6c5ce7;
      color: #a29bfe;
      background: rgba(108, 92, 231, 0.08);
    }

    .sub-footer {
      margin-top: 20px;
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
      font-size: 0.82rem;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s;
    }

    .btn-link:hover {
      color: var(--text-secondary, rgba(255, 255, 255, 0.6));
    }

    /* ── Fade-in animation ── */
    .animate-fadeInUp {
      animation: fadeInUp 0.5s ease-out;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class SubscriptionRequiredComponent {
  private router = inject(Router);
  private userService = inject(UserService);

  userName = this.userService.firstName() || 'Usuario';

  refreshStatus(): void {
    // Re-read profile from storage (in case admin activated it)
    const userId = this.userService.profile()?.id;
    if (userId) {
      const fresh = this.userService.getUserById(userId);
      if (fresh && fresh.subscriptionStatus !== 'expired') {
        // Admin activated it! Refresh and redirect
        this.userService.saveProfile(fresh);
        this.router.navigate(['/d/dashboard']);
        return;
      }
    }
    // Still expired — show message
    alert('Tu suscripción aún no ha sido activada. Contacta al administrador.');
  }

  logout(): void {
    this.userService.clearProfile();
    this.router.navigate(['/']);
  }
}
