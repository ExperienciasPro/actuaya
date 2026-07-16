import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { LOGO_FULL } from '../../core/constants/logo.constants';

interface CountryCode {
  flag: string;
  name: string;
  code: string;
}

@Component({
  selector: 'um-welcome',
  standalone: true,
  imports: [FormsModule, UmIconComponent],
  template: `
    <div class="welcome-page">
      <div class="welcome-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-orb orb-3"></div>
      </div>

      <div class="welcome-container">
        <div class="welcome-card animate-fadeInUp">
          <div class="card-top-bar"></div>

          <!-- Header: Full Logo + Tagline -->
          <div class="card-header-col">
            <img class="card-logo" [src]="logoFull" alt="ActuaYa Logo" />
            <p class="tagline">Configura tu perfil para comenzar</p>
          </div>

          <form class="welcome-form" (ngSubmit)="register()">
            <!-- Row 1: Name + Occupation -->
            <div class="form-row">
              <div class="form-group">
                <label for="reg-name">Nombre completo *</label>
                <input id="reg-name" class="form-input" type="text"
                  [(ngModel)]="name" name="name"
                  placeholder="Tu nombre" autofocus required />
              </div>
              <div class="form-group">
                <label for="reg-occupation">Ocupación *</label>
                <input id="reg-occupation" class="form-input" type="text"
                  [(ngModel)]="occupation" name="occupation"
                  placeholder="Ej: Emprendedor" required />
              </div>
            </div>

            <!-- Row 2: Age + Company Size -->
            <div class="form-row">
              <div class="form-group">
                <label for="reg-age">Edad *</label>
                <input id="reg-age" class="form-input" type="number"
                  [(ngModel)]="age" name="age"
                  placeholder="30" min="16" max="99" required />
              </div>
              <div class="form-group">
                <label for="reg-companySize">Tamaño de empresa *</label>
                <select id="reg-companySize" class="form-input"
                  [(ngModel)]="companySize" name="companySize" required>
                  <option value="">Seleccionar...</option>
                  <option value="solo">Solo yo</option>
                  <option value="micro">2-10 personas</option>
                  <option value="small">11-50 personas</option>
                  <option value="medium">51-200 personas</option>
                  <option value="large">200+ personas</option>
                </select>
              </div>
            </div>

            <!-- Row 3: Email + Company -->
            <div class="form-row">
              <div class="form-group">
                <label for="reg-email">Correo electrónico *</label>
                <input id="reg-email" class="form-input" type="email"
                  [(ngModel)]="email" name="email"
                  placeholder="tu@email.com" required />
              </div>
              <div class="form-group">
                <label for="reg-companyName">Empresa / Organización *</label>
                <input id="reg-companyName" class="form-input" type="text"
                  [(ngModel)]="companyName" name="companyName"
                  placeholder="Ej: Mi Empresa S.A.S" required />
              </div>
            </div>

            <!-- Row 3b: Department + City -->
            <div class="form-row">
              <div class="form-group">
                <label for="reg-department">Departamento *</label>
                <select id="reg-department" class="form-input"
                  [(ngModel)]="department" name="department" required>
                  <option value="">Seleccionar...</option>
                  @for (dept of departments; track dept) {
                    <option [value]="dept">{{ dept }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label for="reg-city">Ciudad *</label>
                <input id="reg-city" class="form-input" type="text"
                  [(ngModel)]="city" name="city"
                  placeholder="Ej: Bogotá" required />
              </div>
            </div>

            <!-- Row 4: Phone with Country Code -->
            <div class="form-row">
              <div class="form-group phone-group">
                <label for="reg-phone">Teléfono / WhatsApp *</label>
                <div class="phone-wrap">
                  <select class="country-select"
                    [(ngModel)]="selectedCountryCode" name="countryCode">
                    @for (c of countryCodes; track c.code) {
                      <option [value]="c.code">{{ c.flag }} {{ c.code }}</option>
                    }
                  </select>
                  <input id="reg-phone" class="form-input phone-input" type="tel"
                    [(ngModel)]="phoneNumber" name="phone"
                    placeholder="300 123 4567"
                    maxlength="15" required />
                </div>
                <span class="phone-hint">{{ selectedCountryName }}</span>
              </div>
            </div>

            <!-- Row 5: Password + Confirm -->
            <div class="form-row">
              <div class="form-group">
                <label for="reg-password">Clave *</label>
                <div class="password-wrap">
                  <input id="reg-password" class="form-input" [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password" name="password"
                    placeholder="Mín. 6 caracteres" required minlength="6" />
                  <button type="button" class="pw-toggle" (click)="showPassword = !showPassword" tabindex="-1">
                    {{ showPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="reg-confirm">Confirmar clave *</label>
                <input id="reg-confirm" class="form-input" [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword" name="confirmPassword"
                  placeholder="Repite tu clave" required />
                @if (confirmPassword && password !== confirmPassword) {
                  <span class="field-error">Las claves no coinciden</span>
                }
              </div>
            </div>

            <button type="submit" class="register-btn"
              [disabled]="isLoading || !name.trim() || !occupation.trim() || !age || !companySize || !email.trim() || !companyName.trim() || !phoneNumber.trim() || !department || !city.trim() || password.length < 6 || password !== confirmPassword">
              @if (isLoading) {
                <span>Creando tu cuenta... 🚀</span>
              } @else {
                Comenzar mi camino
                <um-icon name="bolt" [size]="18"></um-icon>
              }
            </button>

          </form>

          <p class="card-footer">
            Planifica en el escritorio, ejecuta en el móvil · Productividad con Enfoque
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrl: 'welcome.scss',
})
export class WelcomeComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private userService = inject(UserService);
  private syncService = inject(DataSyncService);

  isLoading = false;
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  occupation = '';
  companyName = '';
  age: number | null = null;
  companySize = '';
  department = '';
  city = '';

  // Phone
  selectedCountryCode = '+57';
  phoneNumber = '';

  /** Country codes with flag emojis — Latin America focus + key international */
  readonly countryCodes: CountryCode[] = [
    { flag: '🇨🇴', name: 'Colombia',           code: '+57'  },
    { flag: '🇲🇽', name: 'México',              code: '+52'  },
    { flag: '🇦🇷', name: 'Argentina',           code: '+54'  },
    { flag: '🇨🇱', name: 'Chile',               code: '+56'  },
    { flag: '🇵🇪', name: 'Perú',                code: '+51'  },
    { flag: '🇪🇨', name: 'Ecuador',             code: '+593' },
    { flag: '🇻🇪', name: 'Venezuela',           code: '+58'  },
    { flag: '🇧🇴', name: 'Bolivia',             code: '+591' },
    { flag: '🇵🇾', name: 'Paraguay',            code: '+595' },
    { flag: '🇺🇾', name: 'Uruguay',             code: '+598' },
    { flag: '🇵🇦', name: 'Panamá',              code: '+507' },
    { flag: '🇨🇷', name: 'Costa Rica',          code: '+506' },
    { flag: '🇬🇹', name: 'Guatemala',           code: '+502' },
    { flag: '🇭🇳', name: 'Honduras',            code: '+504' },
    { flag: '🇸🇻', name: 'El Salvador',         code: '+503' },
    { flag: '🇳🇮', name: 'Nicaragua',           code: '+505' },
    { flag: '🇩🇴', name: 'Rep. Dominicana',     code: '+1'   },
    { flag: '🇨🇺', name: 'Cuba',                code: '+53'  },
    { flag: '🇧🇷', name: 'Brasil',              code: '+55'  },
    { flag: '🇪🇸', name: 'España',              code: '+34'  },
    { flag: '🇺🇸', name: 'Estados Unidos',      code: '+1'   },
    { flag: '🇨🇦', name: 'Canadá',              code: '+1'   },
    { flag: '🇬🇧', name: 'Reino Unido',         code: '+44'  },
    { flag: '🇫🇷', name: 'Francia',             code: '+33'  },
    { flag: '🇩🇪', name: 'Alemania',            code: '+49'  },
    { flag: '🇮🇹', name: 'Italia',              code: '+39'  },
    { flag: '🇵🇹', name: 'Portugal',            code: '+351' },
  ];

  /** Colombian departments */
  readonly departments: string[] = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar',
    'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar',
    'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila',
    'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander',
    'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
    'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
  ];

  async ngOnInit(): Promise<void> {
    await this.syncService.syncUserList();
  }

  /** Display name of the selected country */
  get selectedCountryName(): string {
    const found = this.countryCodes.find(c => c.code === this.selectedCountryCode);
    return found ? `${found.flag} ${found.name}` : '';
  }

  /** Full phone number with country code */
  get fullPhone(): string {
    const num = this.phoneNumber.replace(/\D/g, '');
    return num ? `${this.selectedCountryCode}${num}` : '';
  }

  async register(): Promise<void> {
    if (this.name.trim() && this.occupation.trim() && this.age && this.companySize && this.email.trim() && this.companyName.trim() && this.phoneNumber.trim() && this.department && this.city.trim() && this.password.length >= 6) {
      
      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email.trim())) {
        alert('Por favor, introduce un correo electrónico válido.');
        return;
      }

      // Phone digit-only cleaning/validation
      const cleanedPhone = this.phoneNumber.replace(/\D/g, '');
      if (cleanedPhone.length < 7 || cleanedPhone.length > 15) {
        alert('El teléfono debe tener entre 7 y 15 dígitos.');
        return;
      }

      // Age bounds (16-99) validation
      if (this.age < 16 || this.age > 99) {
        alert('La edad debe estar entre 16 y 99 años.');
        return;
      }

      this.isLoading = true;

      try {
        // Email uniqueness check via syncUserList() + local check
        try {
          await this.syncService.syncUserList();
        } catch (e) {
          console.warn('Error sincronizando la lista de usuarios:', e);
        }
        const emailExists = this.userService.getAllUsers().some(
          u => u.email?.toLowerCase() === this.email.trim().toLowerCase()
        );
        if (emailExists) {
          alert('El correo electrónico ya está registrado.');
          this.isLoading = false;
          return;
        }

        await this.userService.saveProfile({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password,
          phone: this.fullPhone,
          occupation: this.occupation.trim(),
          companyName: this.companyName.trim(),
          age: this.age,
          companySize: this.companySize,
          department: this.department,
          city: this.city.trim(),
        });

        // Ensure registration data forces a sync right away
        try {
          // Habilitar temporalmente hasSynced para poder subir la nueva cuenta
          (this.syncService as any).hasSynced = true;

          // CRITICAL: First, merge the server's user list with our local list
          // so we don't overwrite other users when we save.
          // syncUserList merges by ID and deduplicates by email, so the new user
          // will be added to the full server list.
          await this.syncService.syncUserList();

          // Now save to server — um_users will contain the full merged list + our new user
          await this.syncService.saveToServer();

          // Sincronizar en background para no demorar la navegación
          this.syncService.syncFromServer().catch(err => {
            console.warn('Error syncFromServer background:', err);
          });
        } catch (e) {
          console.warn('Error en la sincronización inicial de registro:', e);
        }

        this.router.navigate(['/setup']);
      } catch (err: any) {
        console.error('Error during registration process:', err);
        alert('Ocurrió un error al crear la cuenta. Inténtalo de nuevo.');
        this.isLoading = false;
      }
    }
  }
}
