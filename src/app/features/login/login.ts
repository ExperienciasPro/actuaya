import { Component, inject, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../core/services/user.service';
import { MockSubscriptionService } from '../../core/services/mock-subscription.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { LOGO_FULL } from '../../core/constants/logo.constants';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'um-login',
  standalone: true,
  imports: [FormsModule, RouterLink, UmIconComponent],
  template: `
    <div class="login-page">
      <div class="login-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
      </div>

      <div class="login-container">
        <a class="back-link" routerLink="/">
          ← Volver al inicio
        </a>

        <div class="login-brand animate-fadeInUp">
          <img class="login-logo" [src]="logoFull" alt="ActuaYa Logo" />
        </div>

        <!-- ═══ LOGIN FORM ═══ -->
        @if (view === 'login') {
          <div class="login-card animate-fadeInUp stagger-1">
            <div class="card-top-bar"></div>
            <h2>Acceso Suscriptor</h2>
            <p class="login-subtitle">Ingresa con tu correo y contraseña</p>

            <form class="login-form" (ngSubmit)="login()">
              <div class="form-group">
                <label for="login-user">
                  <um-icon name="user" [size]="16"></um-icon>
                  Correo o usuario
                </label>
                <input
                  #usernameInput
                  id="login-user"
                  class="form-input"
                  type="email"
                  [(ngModel)]="username"
                  name="username"
                  autocomplete="email"
                  placeholder="Tu correo electrónico"
                  autofocus
                  required
                />
              </div>

              <div class="form-group">
                <label for="login-pass">
                  <um-icon name="settings" [size]="16"></um-icon>
                  Contraseña
                </label>
                <div class="password-wrap">
                  <input
                    #passwordInput
                    id="login-pass"
                    class="form-input"
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    autocomplete="current-password"
                    placeholder="Tu contraseña"
                    required
                  />
                  <button type="button" class="toggle-pass" (click)="showPassword = !showPassword" tabindex="-1">
                    {{ showPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              @if (errorMsg) {
                <p class="error-msg">{{ errorMsg }}</p>
              }

              <button
                type="submit"
                class="login-btn"
                [disabled]="!username.trim() || !password.trim()"
              >
                <um-icon name="bolt" [size]="20"></um-icon>
                Ingresar
              </button>
            </form>

            <div class="divider">
              <span>O</span>
            </div>

            <button
              type="button"
              class="google-btn"
              (click)="loginWithGoogle()"
            >
              <img src="/assets/icons/google.svg" alt="Google" class="google-icon" />
              Continuar con Google
            </button>

            <button class="forgot-link" (click)="goToRecover()">
              🔑 ¿Olvidaste tu contraseña?
            </button>

            <p class="register-link">
              ¿No tienes cuenta?
              <a routerLink="/welcome">Regístrate aquí</a>
            </p>
          </div>
        }

        <!-- ═══ RECOVER: STEP 1 — ENTER EMAIL ═══ -->
        @if (view === 'recover-email') {
          <div class="login-card animate-fadeInUp">
            <div class="card-top-bar recover-bar"></div>
            <h2>🔑 Recuperar Contraseña</h2>
            <p class="login-subtitle">Ingresa el correo con el que te registraste</p>

            <form class="login-form" (ngSubmit)="verifyEmail()">
              <div class="form-group">
                <label for="recover-email">
                  <um-icon name="user" [size]="16"></um-icon>
                  Correo electrónico
                </label>
                <input
                  id="recover-email"
                  class="form-input"
                  type="email"
                  [(ngModel)]="recoverEmail"
                  name="recoverEmail"
                  placeholder="ejemplo＠correo.com"
                  autofocus
                  required
                />
              </div>

              @if (errorMsg) {
                <p class="error-msg">{{ errorMsg }}</p>
              }

              <button
                type="submit"
                class="login-btn"
                [disabled]="!recoverEmail.trim() || isLoading"
              >
                {{ isLoading ? 'Enviando...' : 'Verificar correo' }}
              </button>
            </form>

            <button class="forgot-link" (click)="view = 'login'; errorMsg = ''">
              ← Volver al inicio de sesión
            </button>
          </div>
        }

        <!-- ═══ RECOVER: STEP 2 — SENT MESSAGE ═══ -->
        @if (view === 'recover-sent') {
          <div class="login-card animate-fadeInUp">
            <div class="card-top-bar success-bar"></div>
            <h2>📧 Revisa tu correo</h2>
            <p class="login-subtitle">
              {{ successMsg }}
            </p>

            <button class="login-btn" (click)="view = 'login'; errorMsg = ''; successMsg = ''">
              Volver al inicio de sesión
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: 'login.scss',
})
export class LoginComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private mockSubService = inject(MockSubscriptionService);
  private dataSync = inject(DataSyncService);
  private http = inject(HttpClient);

  async ngOnInit(): Promise<void> {
    // Sincronizar lista de usuarios ANTES de login/registro
    // para evitar que un navegador con lista incompleta sobreescriba la del servidor
    await this.dataSync.syncUserList();
  }

  // DOM references — needed because Safari autocomplete can desync ngModel
  @ViewChild('usernameInput') usernameInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;

  // View state
  view: 'login' | 'recover-email' | 'recover-sent' = 'login';

  // Login
  username = '';
  password = '';
  showPassword = false;
  errorMsg = '';

  // Recovery
  recoverEmail = '';
  successMsg = '';
  isLoading = false;

  async login(): Promise<void> {
    // Safari autocomplete can fill fields without updating ngModel.
    // Read values directly from the DOM as a fallback.
    const rawUser = this.usernameInputRef?.nativeElement?.value ?? '';
    const rawPass = this.passwordInputRef?.nativeElement?.value ?? '';
    const finalUser = (this.username || rawUser).trim();
    const finalPass = this.password || rawPass;

    if (!finalUser || !finalPass) {
      this.errorMsg = 'Ingresa tu correo y contraseña';
      return;
    }

    try {
      // Force reload from localStorage before authenticating
      this.userService.reloadUsersFromStorage();

      let user = await this.userService.authenticate(finalUser, finalPass);
      
      // If auth failed, maybe localStorage is empty/stale — sync from server and retry
      if (!user) {
        try {
          await this.dataSync.syncUserList();
          this.userService.reloadUsersFromStorage();
          user = await this.userService.authenticate(finalUser, finalPass);
        } catch (syncErr) {
          console.warn('[Login] Error syncing users for retry:', syncErr);
        }
      }

      if (user) {
        // Sincronizar en segundo plano sin bloquear la redirección
        this.dataSync.syncFromServer().then(() => {
          this.mockSubService.checkAndUpdateStatus();
        });

        // Redirigir de inmediato al dashboard
        if (user.subscriptionStatus === 'expired' && user.role !== 'superadmin') {
          this.router.navigate(['/subscription-required']);
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/d/dashboard';
          this.router.navigateByUrl(returnUrl);
        }
      } else {
        this.errorMsg = 'Correo o contraseña incorrectos';
      }
    } catch (err: any) {
      this.errorMsg = 'Error al iniciar sesión. Intenta de nuevo.';
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.errorMsg = '';
      const user = await this.userService.loginWithGoogle();
      if (user) {
        // Sincronizar en segundo plano
        this.dataSync.syncFromServer().then(() => {
          this.mockSubService.checkAndUpdateStatus();
        });

        if (user.subscriptionStatus === 'expired' && user.role !== 'superadmin') {
          this.router.navigate(['/subscription-required']);
        } else if (!this.userService.isProfileComplete()) {
          // Google users with incomplete profile → complete profile first
          this.router.navigate(['/completar-perfil']);
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/d/dashboard';
          this.router.navigateByUrl(returnUrl);
        }
      }
    } catch (err: any) {
      if (err.message === 'User account is inactive') {
        this.errorMsg = 'Tu cuenta está inactiva. Contacta al administrador.';
      } else {
        this.errorMsg = 'Error: ' + (err.code || '') + ' — ' + (err.message || err);
      }
    }
  }

  goToRecover(): void {
    this.view = 'recover-email';
    this.errorMsg = '';
    this.recoverEmail = this.username; // pre-fill if they already typed something
  }

  async verifyEmail(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    
    if (!this.recoverEmail.trim()) {
      return;
    }

    this.isLoading = true;

    try {
      const url = `${environment.apiUrl}/auth/forgot-password`;
      const response = await this.http.post<any>(url, { email: this.recoverEmail.trim() }).toPromise();
      
      this.successMsg = response?.message || 'Si el correo existe, se ha enviado un enlace.';
      this.view = 'recover-sent';
    } catch (err: any) {
      this.errorMsg = err.error?.error || 'Error al intentar enviar el correo. Intenta de nuevo.';
    } finally {
      this.isLoading = false;
    }
  }
}
