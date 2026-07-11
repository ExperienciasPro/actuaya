import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { StorageService } from '../../core/services/storage.service';
import { LOGO_FULL } from '../../core/constants/logo.constants';

@Component({
  selector: 'um-onboarding-welcome',
  standalone: true,
  template: `
    <div class="onboarding-page" [class.visible]="ready()">

      <!-- Animated background -->
      <div class="ob-bg">
        <div class="bg-gradient"></div>
        <div class="bg-particles">
          @for (p of particles; track p.id) {
            <div class="particle" [style.left.%]="p.x" [style.animation-delay.s]="p.delay"
                 [style.animation-duration.s]="p.dur" [style.font-size.px]="p.size">
              {{ p.char }}
            </div>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="ob-content">

        <!-- Logo pulse -->
        <div class="ob-logo-wrap fadeIn-d1">
          <img class="ob-logo" [src]="logoFull" alt="ActuaYa Logo" />
          <div class="logo-ring"></div>
        </div>

        <!-- Headline -->
        <h1 class="ob-headline fadeIn-d2">
          ¡Bienvenido{{ userName ? ', ' + userName : '' }}! 🎉
        </h1>

        <p class="ob-subheadline fadeIn-d3">
          Tu viaje empresarial comienza <strong>ahora</strong>.
        </p>

        <!-- Inspirational quote -->
        <div class="ob-quote fadeIn-d4">
          <span class="quote-mark">"</span>
          <p>El mejor momento para empezar fue ayer.<br><strong>El segundo mejor momento es ahora.</strong></p>
        </div>

        <!-- Steps preview -->
        <div class="ob-steps fadeIn-d5">
          @for (step of steps; track step.icon; let i = $index) {
            <div class="step-item" [style.animation-delay.ms]="800 + i * 150">
              <span class="step-icon">{{ step.icon }}</span>
              <div class="step-text">
                <strong>{{ step.title }}</strong>
                <span>{{ step.desc }}</span>
              </div>
              @if (i < steps.length - 1) {
                <div class="step-connector"></div>
              }
            </div>
          }
        </div>

        <!-- CTA -->
        <div class="ob-cta fadeIn-d6">
          <button class="btn-start" (click)="goToDashboard()">
            <span class="btn-text">¡Vamos allá!</span>
            <span class="btn-rocket">🚀</span>
          </button>
          <p class="ob-trial-hint">
            ⏳ Tienes <strong>30 días gratis</strong> para explorar todo.
          </p>
        </div>

        <!-- Motivational footer -->
        <p class="ob-footer fadeIn-d7">
          Cada acción que tomes hoy es un paso hacia el lugar donde sueñas estar.
        </p>

      </div>
    </div>
  `,
  styleUrl: 'onboarding-welcome.scss',
})
export class OnboardingWelcomeComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private router = inject(Router);
  private userService = inject(UserService);
  private storage = inject(StorageService);

  ready = signal(false);

  userName = this.userService.firstName() || '';

  steps = [
    { icon: '🎯', title: 'Define tu norte',       desc: 'Crea metas claras y alcanzables' },
    { icon: '⚡', title: 'Toma acción',            desc: 'Convierte ideas en tareas ejecutables' },
    { icon: '📊', title: 'Mide tu progreso',       desc: 'Visualiza cómo creces semana a semana' },
    { icon: '🏆', title: 'Logra lo extraordinario', desc: 'Celebra cada victoria, grande o pequeña' },
  ];

  /** Floating particles for ambient effect */
  particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    char: ['✦', '◆', '●', '▲', '★', '✧', '♦', '◇'][i % 8],
    x: Math.random() * 100,
    delay: Math.random() * 6,
    dur: 8 + Math.random() * 12,
    size: 6 + Math.random() * 10,
  }));

  ngOnInit(): void {
    // Check if already seen — redirect immediately
    if (this.storage.has('um_onboarding_welcome_seen')) {
      this.router.navigate(['/d/dashboard']);
      return;
    }
    // Trigger entrance animation
    setTimeout(() => this.ready.set(true), 50);
  }

  goToDashboard(): void {
    this.storage.set('um_onboarding_welcome_seen', '1');
    this.router.navigate(['/d/dashboard']);
  }
}
