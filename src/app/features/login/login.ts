import { Component, inject, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { MockSubscriptionService } from '../../core/services/mock-subscription.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { LOGO_FULL } from '../../core/constants/logo.constants';

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
                [disabled]="!recoverEmail.trim()"
              >
                Verificar correo
              </button>
            </form>

            <button class="forgot-link" (click)="view = 'login'; errorMsg = ''">
              ← Volver al inicio de sesión
            </button>
          </div>
        }

        <!-- ═══ RECOVER: STEP 2 — VERIFY IDENTITY ═══ -->
        @if (view === 'recover-verify') {
          <div class="login-card animate-fadeInUp">
            <div class="card-top-bar recover-bar"></div>
            <h2>🛡️ Verificar Identidad</h2>
            <p class="login-subtitle">
              Encontramos la cuenta de <strong>{{ foundUserHint }}</strong>.
              Escribe el nombre completo registrado para confirmar tu identidad.
            </p>

            <form class="login-form" (ngSubmit)="verifyIdentity()">
              <div class="form-group">
                <label for="verify-name">
                  <um-icon name="user" [size]="16"></um-icon>
                  Nombre completo
                </label>
                <input
                  id="verify-name"
                  class="form-input"
                  type="text"
                  [(ngModel)]="verifyName"
                  name="verifyName"
                  placeholder="Tu nombre como lo registraste"
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
                [disabled]="!verifyName.trim()"
              >
                Confirmar identidad
              </button>
            </form>

            <button class="forgot-link" (click)="view = 'recover-email'; errorMsg = ''">
              ← Cambiar correo
            </button>
          </div>
        }

        <!-- ═══ RECOVER: STEP 3 — NEW PASSWORD ═══ -->
        @if (view === 'recover-reset') {
          <div class="login-card animate-fadeInUp">
            <div class="card-top-bar success-bar"></div>
            <h2>🔐 Nueva Contraseña</h2>
            <p class="login-subtitle">Identidad confirmada. Establece tu nueva contraseña.</p>

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
                [disabled]="newPassword.length < 6 || newPassword !== confirmNewPassword"
              >
                Guardar nueva contraseña
              </button>
            </form>
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

  async ngOnInit(): Promise<void> {
    // Sincronizar lista de usuarios ANTES de login/registro
    // para evitar que un navegador con lista incompleta sobreescriba la del servidor
    await this.dataSync.syncUserList();
  }

  // DOM references — needed because Safari autocomplete can desync ngModel
  @ViewChild('usernameInput') usernameInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;

  // View state
  view: 'login' | 'recover-email' | 'recover-verify' | 'recover-reset' = 'login';

  // Login
  username = '';
  password = '';
  showPassword = false;
  errorMsg = '';

  // Recovery
  recoverEmail = '';
  foundUserId = '';
  foundUserHint = '';
  verifyName = '';
  newPassword = '';
  confirmNewPassword = '';
  successMsg = '';

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
      
      const allUsers = this.userService.getAllUsers();
      const matchByEmail = allUsers.find(u => u.email?.toLowerCase() === finalUser.toLowerCase());
      
      // TEMP DEBUG: show diagnostic info on screen
      let debugInfo = `[DEBUG] ${allUsers.length} usuarios cargados. `;
      if (matchByEmail) {
        debugInfo += `Usuario encontrado: ${matchByEmail.name}, activo: ${matchByEmail.isActive}, `;
        debugInfo += `clave tipo: ${matchByEmail.password?.startsWith('sha256$') ? 'hash' : 'texto'}, `;
        debugInfo += `clave guardada: ${matchByEmail.password?.substring(0, 6)}..., `;
        debugInfo += `clave ingresada: ${finalPass.substring(0, 4)}...`;
      } else {
        debugInfo += `NO se encontró email: ${finalUser}`;
      }

      const user = await this.userService.authenticate(finalUser, finalPass);
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
        this.errorMsg = debugInfo;
      }
    } catch (err: any) {
      this.errorMsg = `[ERROR] ${err.message || err}`;
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

  verifyEmail(): void {
    this.errorMsg = '';
    const users = this.userService.getAllUsers();
    const found = users.find(
      u => u.email?.toLowerCase() === this.recoverEmail.trim().toLowerCase()
    );

    if (!found) {
      this.errorMsg = 'No existe una cuenta con ese correo electrónico';
      return;
    }

    this.foundUserId = found.id;
    // Show hint: first name + masked last name
    const parts = found.name.split(' ');
    this.foundUserHint = parts[0] + (parts.length > 1 ? ' ' + parts[1][0] + '***' : '');
    this.view = 'recover-verify';
  }

  verifyIdentity(): void {
    this.errorMsg = '';
    const user = this.userService.getUserById(this.foundUserId);
    if (!user) return;

    if (this.verifyName.trim().toLowerCase() === user.name.toLowerCase()) {
      this.view = 'recover-reset';
      this.showPassword = false;
    } else {
      this.errorMsg = 'El nombre no coincide con la cuenta registrada';
    }
  }

  resetPassword(): void {
    this.errorMsg = '';
    this.successMsg = '';

    if (this.newPassword.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }

    this.userService.updateUserPassword(this.foundUserId, this.newPassword);
    this.successMsg = '✅ Contraseña actualizada correctamente';

    // Auto-redirect to login after 2s
    setTimeout(() => {
      this.view = 'login';
      this.username = this.recoverEmail;
      this.password = '';
      this.successMsg = '';
      this.errorMsg = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    }, 2000);
  }
}
