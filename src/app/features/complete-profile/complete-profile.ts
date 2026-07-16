import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { LOGO_FULL } from '../../core/constants/logo.constants';

interface CountryCode {
  flag: string;
  name: string;
  code: string;
}

@Component({
  selector: 'um-complete-profile',
  standalone: true,
  imports: [FormsModule, UmIconComponent],
  template: `
    <div class="cp-page">
      <div class="cp-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-orb orb-3"></div>
      </div>

      <div class="cp-container">
        <div class="cp-card animate-fadeInUp">
          <div class="card-top-bar"></div>

          <!-- Header -->
          <div class="card-header-col">
            <img class="card-logo" [src]="logoFull" alt="ActuaYa Logo" />
            <h2>¡Casi listo! 🎉</h2>
            <p class="tagline">Completa tu perfil para personalizar tu experiencia</p>
          </div>

          <!-- Pre-filled info -->
          <div class="user-preview">
            <div class="user-avatar">{{ getInitials() }}</div>
            <div class="user-info">
              <strong>{{ userName }}</strong>
              <span>{{ userEmail }}</span>
            </div>
          </div>

          <form class="cp-form" (ngSubmit)="save()">
            <!-- Row 1: Occupation + Age -->
            <div class="form-row">
              <div class="form-group">
                <label for="cp-occupation">Ocupación</label>
                <input id="cp-occupation" class="form-input" type="text"
                  [(ngModel)]="occupation" name="occupation"
                  placeholder="Ej: Emprendedor, Consultor..." autofocus />
              </div>
              <div class="form-group">
                <label for="cp-age">Edad</label>
                <input id="cp-age" class="form-input" type="number"
                  [(ngModel)]="age" name="age"
                  placeholder="30" min="16" max="99" />
              </div>
            </div>

            <!-- Row 2: Company Size + Company Name -->
            <div class="form-row">
              <div class="form-group">
                <label for="cp-companySize">Tamaño de empresa</label>
                <select id="cp-companySize" class="form-input"
                  [(ngModel)]="companySize" name="companySize">
                  <option value="">Seleccionar...</option>
                  <option value="solo">Solo yo</option>
                  <option value="micro">2-10 personas</option>
                  <option value="small">11-50 personas</option>
                  <option value="medium">51-200 personas</option>
                  <option value="large">200+ personas</option>
                </select>
              </div>
              <div class="form-group">
                <label for="cp-companyName">Empresa / Organización</label>
                <input id="cp-companyName" class="form-input" type="text"
                  [(ngModel)]="companyName" name="companyName"
                  placeholder="Ej: Mi Empresa S.A.S" />
              </div>
            </div>

            <!-- Row 3: Phone with Country Code -->
            <div class="form-row">
              <div class="form-group phone-group">
                <label for="cp-phone">Teléfono / WhatsApp</label>
                <div class="phone-wrap">
                  <select class="country-select"
                    [(ngModel)]="selectedCountryCode" name="countryCode">
                    @for (c of countryCodes; track c.code) {
                      <option [value]="c.code">{{ c.flag }} {{ c.code }}</option>
                    }
                  </select>
                  <input id="cp-phone" class="form-input phone-input" type="tel"
                    [(ngModel)]="phoneNumber" name="phone"
                    placeholder="300 123 4567"
                    maxlength="15" />
                </div>
                <span class="phone-hint">{{ selectedCountryName }}</span>
              </div>
            </div>

            <button type="submit" class="save-btn"
              [disabled]="!occupation.trim() && !companySize">
              Continuar
              <um-icon name="bolt" [size]="18"></um-icon>
            </button>

            <button type="button" class="skip-link" (click)="skip()">
              Completar más tarde →
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: 'complete-profile.scss',
})
export class CompleteProfileComponent {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private userService = inject(UserService);

  userName = '';
  userEmail = '';
  occupation = '';
  companyName = '';
  age: number | null = null;
  companySize = '';

  // Phone
  selectedCountryCode = '+57';
  phoneNumber = '';

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

  constructor() {
    const profile = this.userService.profile();
    if (profile) {
      this.userName = profile.name;
      this.userEmail = profile.email || '';
      this.occupation = profile.occupation || '';
      this.companyName = profile.companyName || '';
      this.age = profile.age || null;
      this.companySize = profile.companySize || '';
      if (profile.phone) {
        // Try to extract country code from phone
        const match = profile.phone.match(/^(\+\d{1,3})(.*)/);
        if (match) {
          this.selectedCountryCode = match[1];
          this.phoneNumber = match[2];
        }
      }
    } else {
      // No profile, redirect to login
      this.router.navigate(['/login']);
    }
  }

  get selectedCountryName(): string {
    const found = this.countryCodes.find(c => c.code === this.selectedCountryCode);
    return found ? `${found.flag} ${found.name}` : '';
  }

  get fullPhone(): string {
    const num = this.phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    return num ? `${this.selectedCountryCode}${num}` : '';
  }

  getInitials(): string {
    return this.userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  async save(): Promise<void> {
    await this.userService.saveProfile({
      occupation: this.occupation.trim() || undefined,
      companyName: this.companyName.trim() || undefined,
      age: this.age || undefined,
      companySize: this.companySize || undefined,
      phone: this.fullPhone || undefined,
    });
    this.router.navigate(['/setup']);
  }

  skip(): void {
    this.router.navigate(['/setup']);
  }
}
