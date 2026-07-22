import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LOGO_FULL } from '../../core/constants/logo.constants';

@Component({
  selector: 'um-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
      </div>

      <div class="login-container">
        <a class="back-link" routerLink="/login">
          ← Volver a inicio de sesión
        </a>

        <div class="login-brand animate-fadeInUp">
          <img class="login-logo" [src]="logoFull" alt="ActuaYa Logo" />
        </div>

        <div class="login-card animate-fadeInUp">
          <div class="card-top-bar success-bar"></div>
          <h2>🔐 Nueva Contraseña</h2>
          <p class="login-subtitle">Establece tu nueva contraseña para acceder.</p>

          <form class="login-form" (ngSubmit)="resetPassword()">
            <div class="form-group">
              <label for="new-pass">
                Nueva contraseña
              </label>
              <div class="password-wrap">
                <input
                  id="new-pass"
                  class="form-input"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button type="button" class="toggle-pass" (click)="showPassword = !showPassword" tabindex="-1">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="confirm-pass">
                Confirmar contraseña
              </label>
              <div class="password-wrap">
                <input
                  id="confirm-pass"
                  class="form-input"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmNewPassword"
                  name="confirmNewPassword"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
              @if (confirmNewPassword && newPassword !== confirmNewPassword) {
                <span class="field-error">Las contraseñas no coinciden</span>
              }
            </div>

            @if (errorMsg) {
              <p class="error-msg">{{ errorMsg }}</p>
            }

            @if (successMsg) {
              <p class="success-msg">{{ successMsg }}</p>
            }

            <button
              type="submit"
              class="login-btn"
              [disabled]="newPassword.length < 6 || newPassword !== confirmNewPassword || isLoading"
            >
              {{ isLoading ? 'Guardando...' : 'Guardar nueva contraseña' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: '../login/login.scss',
})
export class ResetPasswordComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  token = '';
  newPassword = '';
  confirmNewPassword = '';
  showPassword = false;
  
  errorMsg = '';
  successMsg = '';
  isLoading = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMsg = 'No se proporcionó un token de recuperación válido.';
    }
  }

  async resetPassword(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.token) {
      this.errorMsg = 'Enlace de recuperación inválido.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }

    this.isLoading = true;

    try {
      const url = `${environment.apiUrl}/auth/reset-password`;
      
      const payload = {
        token: this.token,
        newPassword: this.newPassword
      };

      const response = await this.http.post<any>(url, payload).toPromise();

      if (response && response.ok) {
        this.successMsg = '✅ ' + (response.message || 'Contraseña actualizada correctamente');
        
        // Auto-redirect to login after 2s
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMsg = 'Error al actualizar contraseña.';
      }
    } catch (err: any) {
      this.errorMsg = err.error?.error || 'El enlace es inválido o ha expirado. Solicita uno nuevo.';
    } finally {
      this.isLoading = false;
    }
  }
}
