import { Component, signal, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LOGO_FULL, LOGO_WHITE } from '../../core/constants/logo.constants';

/**
 * ═══════════════════════════════════════════════════════════════
 * HomeComponent — ActuaYa Landing Page
 * ═══════════════════════════════════════════════════════════════
 *
 * Sections:
 *   1. Navbar (fixed, glassmorphism)
 *   2. Hero
 *   3. Pain Points
 *   4. Modules (signal-driven category filter)
 *   5. Two Views / Differentiator
 *   6. Target Audience
 *   7. CTA / Closing
 *   8. Footer
 *
 * Animations:
 *   - IntersectionObserver-based scroll reveal (.reveal, .reveal-left,
 *     .reveal-right, .reveal-scale) with stagger delays (.delay-1..4)
 *
 * ═══════════════════════════════════════════════════════════════
 */

interface ModuleItem {
  emoji: string;
  title: string;
  description: string;
}

interface ModuleCategory {
  key: string;
  icon: string;
  label: string;
  count: number;
  modules: ModuleItem[];
}

@Component({
  selector: 'um-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="landing">
      <!-- ══════════════════════════════════════ -->
      <!-- NAV BAR -->
      <!-- ══════════════════════════════════════ -->
      <nav class="nav">
        <div class="nav-inner">
          <a class="nav-logo" routerLink="/">
            <img class="nav-logo-img" [src]="logoFull" alt="ActuaYa" />
          </a>

          <div class="nav-links">
            <a href="#modulos">Módulos</a>
            <a href="#vistas">Vistas</a>
            <a href="#para-quien">Para quién</a>
          </div>

          <div class="nav-actions">
            <a class="btn-nav-login" routerLink="/login">Iniciar sesión</a>
            <a class="btn-nav-cta" routerLink="/welcome">Empieza Gratis</a>
          </div>
        </div>
      </nav>

      <!-- ══════════════════════════════════════ -->
      <!-- HERO SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="hero" id="inicio">
        <div class="hero-bg"></div>
        <div class="hero-particles">
          <span class="particle p1"></span>
          <span class="particle p2"></span>
          <span class="particle p3"></span>
          <span class="particle p4"></span>
          <span class="particle p5"></span>
          <span class="particle p6"></span>
          <span class="particle p7"></span>
          <span class="particle p8"></span>
        </div>
        <div class="hero-inner">
          <div class="hero-content reveal">
            <span class="hero-badge pulse-anim">✨ App web multipropósito</span>
            <h1>
              Construye la plataforma que tu negocio necesita.
              <span class="gradient-pink">Sin pagar de más.</span>
            </h1>
            <p class="hero-desc">
              ACTUAYA se adapta a ti. Elige tus módulos, planifica desde tu computador y recibe guía diaria en tu celular para alcanzar tus objetivos.
            </p>
            <div class="hero-actions">
              <a class="btn-primary-lg" routerLink="/welcome">
                Crea tu App a Medida Hoy
                <span>→</span>
              </a>
              <a class="btn-outline-lg" href="#modulos">
                Ver módulos ↓
              </a>
            </div>
            <div class="hero-no-card">
              <span class="green-dot"></span>
              No necesitas tarjeta de crédito
            </div>
          </div>
          <!-- La ilustración de fondo se maneja directamente en el CSS del hero container para fundirse e integrarse a la derecha -->
          <div class="hero-spacer"></div>
        </div>

        <!-- Value bar -->
        <div class="hero-values">
          <div class="hero-values-inner">
            <div class="value-item">
              <span class="value-icon">⚡</span>
              <div class="value-text">
                <strong>Flexible</strong>
                <span>Crea tu app, a tu medida</span>
              </div>
            </div>
            <div class="value-item">
              <span class="value-icon">📈</span>
              <div class="value-text">
                <strong>Escalable</strong>
                <span>Crece sin límites</span>
              </div>
            </div>
            <div class="value-item">
              <span class="value-icon">✨</span>
              <div class="value-text">
                <strong>Intuitivo</strong>
                <span>Fácil de usar</span>
              </div>
            </div>
            <div class="value-item">
              <span class="value-icon">💬</span>
              <div class="value-text">
                <strong>Soporte real</strong>
                <span>Acompañamiento humano</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- PAIN POINTS SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="pain-points">
        <div class="pain-inner">
          <div class="pain-text reveal-left">
            <h2>
              ¿Cansado de pagar por software complejo con funciones que
              <span class="highlight-green">nunca usas</span>?
            </h2>
            <p>
              La mayoría de las herramientas para pymes son rígidas, costosas y difíciles de implementar.
              Te obligan a adaptar tu negocio a su sistema. El resultado: frustración, pérdida de tiempo
              y una suscripción mensual que no justifica su valor.
            </p>
            <div class="pain-cards mt-4">
              <div class="pain-card">
                <span class="pain-emoji">🤯</span>
                <span class="pain-label">Interfaces complejas</span>
              </div>
              <div class="pain-card">
                <span class="pain-emoji">🎆</span>
                <span class="pain-label">Funciones que no necesitas</span>
              </div>
              <div class="pain-card">
                <span class="pain-emoji">👩‍🏫</span>
                <span class="pain-label">Implementación eterna</span>
              </div>
              <div class="pain-card">
                <span class="pain-emoji">🧳</span>
                <span class="pain-label">Sin flexibilidad</span>
              </div>
            </div>
          </div>
          <div class="pain-visual reveal-right delay-2">
            <div class="floating-wrapper-slow">
              <img src="/assets/images/pain_points_illustration.png" alt="Software Complejo" class="pain-img" />
            </div>
          </div>
        </div>
        <p class="pain-cta reveal">Es hora de <strong><u>cambiar las reglas del juego.</u></strong></p>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- MODULES SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="modules" id="modulos">
        <div class="modules-inner">
          <div class="section-header reveal">
            <span class="section-badge green">26 MÓDULOS · 7 CATEGORÍAS</span>
            <h2>Activa solo lo que necesitas. <span class="gradient-green">Nada más.</span></h2>
            <p>
              Tu negocio es único. Con ACTUAYA armas tu propia plataforma eligiendo módulos por área.
              Si tu negocio cambia, tu app evoluciona contigo.
            </p>
          </div>

          <!-- Category Tabs -->
          <div class="category-tabs reveal delay-1">
            @for (cat of categories; track cat.key) {
              <button
                class="cat-tab"
                [class.active]="activeCategory() === cat.key"
                (click)="setCategory(cat.key)"
              >
                {{ cat.icon }} {{ cat.label }} ({{ cat.count }})
              </button>
            }
          </div>

          <!-- Module Cards -->
          <div class="module-grid reveal delay-2">
            @for (mod of activeModules(); track mod.title) {
              <div class="module-card">
                <span class="module-emoji">{{ mod.emoji }}</span>
                <div class="module-info">
                  <h4>{{ mod.title }}</h4>
                  <p>{{ mod.description }}</p>
                </div>
              </div>
            }
          </div>

          <div class="modules-cta reveal delay-3">
            <a class="btn-primary-lg" routerLink="/welcome">
              Arma tu plataforma ahora
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- TWO VIEWS / DIFFERENTIATOR SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="views" id="vistas">
        <div class="views-inner">
          <div class="section-header reveal">
            <span class="section-badge green">EL DIFERENCIADOR</span>
            <h2>Dos vistas. Un solo objetivo: <span class="gradient-pink">Tu éxito.</span></h2>
          </div>

          <div class="views-grid">
            <!-- Desktop Card -->
            <div class="view-card desktop reveal-left delay-1">
              <div class="view-card-top blue"></div>
              <div class="view-card-body">
                <span class="view-badge blue">💻 COMPUTADOR</span>
                <h3>El Centro de Comando</h3>
                <p>
                  Diseñado para la estrategia. Aquí es donde gestionas tus módulos, configuras tu semana,
                  programas tareas, estableces recordatorios y analizas el panorama completo de tu empresa
                  con total comodidad.
                </p>
                <ul class="view-features">
                  <li>📊 Dashboard con KPIs en tiempo real</li>
                  <li>🎯 Gestión de metas y objetivos</li>
                  <li>📈 Pipeline comercial visual</li>
                  <li>🗂️ Tablero de proyectos Kanban</li>
                </ul>
              </div>
            </div>

            <!-- Mobile Card -->
            <div class="view-card mobile reveal-right delay-2">
              <div class="view-card-top rainbow"></div>
              <div class="view-card-body">
                <span class="view-badge rainbow">📱 CELULAR</span>
                <h3>Tu Coach de Bolsillo</h3>
                <p>
                  Diseñado para la acción. Una interfaz limpia, práctica y libre de distracciones. Tu celular
                  se convierte en un asistente personal que conoce tus metas, te recuerda qué sigue y te acompaña
                  en el día a día para asegurarse de que las cumplas.
                </p>
                <ul class="view-features">
                  <li>🔥 Enfoque del día: tus 5 prioridades</li>
                  <li>🧠 Recordatorios inteligentes</li>
                  <li>✅ Checklist diario simplificado</li>
                  <li>💬 Acceso rápido a WhatsApp</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- TARGET AUDIENCE SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="audience" id="para-quien">
        <div class="audience-inner">
          <div class="section-header reveal">
            <span class="section-badge green">¿PARA QUIÉN?</span>
            <h2>Hecho a la medida de los que hacen que las cosas pasen.</h2>
          </div>

          <div class="audience-grid">
            <div class="audience-card reveal delay-1">
              <span class="audience-emoji">🚀</span>
              <h3>Emprendedores</h3>
              <p>Que necesitan organizar el caos inicial sin gastar una fortuna.</p>
            </div>
            <div class="audience-card reveal delay-2">
              <span class="audience-emoji">🏢</span>
              <h3>Pequeñas Empresas</h3>
              <p>Que buscan profesionalizar sus procesos operativos de forma amigable.</p>
            </div>
            <div class="audience-card reveal delay-3">
              <span class="audience-emoji">📐</span>
              <h3>Medianas Organizaciones</h3>
              <p>Que requieren una herramienta escalable que se integre a diferentes áreas de trabajo.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- CTA / CLOSING SECTION -->
      <!-- ══════════════════════════════════════ -->
      <section class="closing">
        <div class="closing-inner reveal">
          <h2>
            No te adaptes al software.<br />
            <span class="gradient-pink">Deja que el software se adapte a ti.</span>
          </h2>
          <a class="btn-primary-xl" routerLink="/welcome">
            Empieza Gratis Hoy
            <span>→</span>
          </a>
        </div>
      </section>

      <!-- ══════════════════════════════════════ -->
      <!-- FOOTER -->
      <!-- ══════════════════════════════════════ -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-grid">
            <div class="footer-brand">
              <a class="footer-logo" href="#inicio">
                <img class="footer-logo-img" [src]="logoWhite" alt="ActuaYa" />
              </a>
              <p>La app web multipropósito que se adapta a tu negocio. Elige módulos, planifica y crece.</p>
            </div>

            <div class="footer-links-col">
              <h4>Navegación</h4>
              <ul>
                <li><a href="#inicio">Inicio</a></li>
                <li><a href="#modulos">Módulos</a></li>
                <li><a href="#vistas">Vistas</a></li>
                <li><a href="#para-quien">Para quién</a></li>
              </ul>
            </div>

            <div class="footer-links-col">
              <h4>Plataforma</h4>
              <ul>
                <li><a routerLink="/login">Iniciar Sesión</a></li>
                <li><a routerLink="/welcome">Registrarse</a></li>
                <li><a href="#modulos">Módulos</a></li>
              </ul>
            </div>

            <div class="footer-links-col">
              <h4>Contacto</h4>
              <ul>
                <li class="footer-info">Bogotá, Colombia</li>
                <li class="footer-info">contacto&#64;actuaya.co</li>
                <li class="footer-info">+57 300 123 4567</li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom">
            <p>© 2026 ActuaYa. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styleUrl: 'home.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  readonly logoFull = LOGO_FULL;
  readonly logoWhite = LOGO_WHITE;
  private el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;

  /** Signals */
  formSubmitted = signal(false);
  activeCategory = signal('productividad');

  /** Module category data */
  categories: ModuleCategory[] = [
    {
      key: 'productividad',
      icon: '🎯',
      label: 'Productividad',
      count: 4,
      modules: [
        { emoji: '🎯', title: 'Metas y Objetivos', description: 'Crea metas claras con plazos y hitos. Visualiza tu progreso con indicadores que te mantienen enfocado en lo que importa.' },
        { emoji: '🏗️', title: 'Administrador de Proyectos', description: 'Tablero tipo Kanban para organizar tareas, asignar responsables y hacer seguimiento visual del avance de cada proyecto.' },
        { emoji: '📊', title: 'Analítica Productividad', description: 'Panel unificado con KPIs de metas y proyectos: gráficas de progreso, cumplimiento por área y alertas de retraso.' },
        { emoji: '📱', title: 'Coach Móvil', description: 'Aplicación diseñada para agentes en campo y comerciales. Mira tus tareas del día, registra avances y recibe recordatorios.' },
      ],
    },
    {
      key: 'comercial',
      icon: '🤝',
      label: 'Comercial & Ventas',
      count: 4,
      modules: [
        { emoji: '📈', title: 'Pipeline de Ventas', description: 'Visualiza tu embudo comercial con etapas arrastrables. Mueve oportunidades, asigna valores y pronostica ingresos.' },
        { emoji: '🔍', title: 'Radar de Contactos', description: 'Gestión pre-pipeline de prospectos con tablero Kanban. Organiza leads antes de convertirlos en oportunidades formales.' },
        { emoji: '📦', title: 'Catálogo & Cotizador', description: 'Crea catálogos de productos/servicios con precios configurables. Genera cotizaciones profesionales al instante.' },
        { emoji: '🍽️', title: 'Menú Digital', description: 'Publica un menú online con QR para restaurantes. Actualiza platos, precios y disponibilidad en tiempo real.' },
      ],
    },
    {
      key: 'evaluacion',
      icon: '📋',
      label: 'Evaluación & Diagnóstico',
      count: 4,
      modules: [
        { emoji: '📝', title: 'Formularios', description: 'Constructor de formularios con múltiples tipos de campo. Recopila información estructurada de clientes y equipo.' },
        { emoji: '🧪', title: 'Tests', description: 'Evaluaciones con puntuación automática. Ideal para diagnósticos, encuestas de satisfacción y exámenes internos.' },
        { emoji: '🎓', title: 'Entrenamientos', description: 'Módulo de capacitación con contenido multimedia. Crea rutas de aprendizaje para tu equipo con seguimiento.' },
        { emoji: '📊', title: 'Base de Datos', description: 'Exportación y visualización de respuestas recopiladas. Filtra, analiza y descarga reportes de todas tus evaluaciones.' },
      ],
    },
    {
      key: 'finanzas',
      icon: '💰',
      label: 'Finanzas & Rentabilidad',
      count: 5,
      modules: [
        { emoji: '💰', title: 'Flujo de Caja', description: 'Registro de ingresos y egresos con categorías personalizables. Visualiza tu balance en gráficas claras.' },
        { emoji: '📊', title: 'Rentabilidad', description: 'Calculadora de márgenes y punto de equilibrio. Entiende la salud financiera de cada producto o servicio.' },
        { emoji: '💼', title: 'Presupuestos', description: 'Planificador de presupuestos por proyecto o área. Controla gastos vs. lo planificado con alertas automáticas.' },
        { emoji: '📈', title: 'Ingresos Admin', description: 'Panel de control de ingresos del negocio con métricas consolidadas y comparativos por periodo.' },
        { emoji: '📉', title: 'Inversiones', description: 'Seguimiento de inversiones y retorno. Registra capital invertido, calcula ROI y proyecta recuperación.' },
      ],
    },
    {
      key: 'operaciones',
      icon: '⚙️',
      label: 'Operaciones & Equipo',
      count: 3,
      modules: [
        { emoji: '📋', title: 'Órdenes de Trabajo', description: 'Asignación y seguimiento de OT en campo. Controla estados, prioridades y tiempos de ejecución.' },
        { emoji: '📦', title: 'Inventario', description: 'Control de stock con alertas de mínimos. Registra entradas, salidas y movimientos entre bodegas.' },
        { emoji: '⏰', title: 'Turnos', description: 'Gestión de horarios y turnos del equipo. Planifica semanas, asigna coberturas y evita conflictos.' },
      ],
    },
    {
      key: 'mantenimiento',
      icon: '🔧',
      label: 'Gestión de Mantenimiento',
      count: 4,
      modules: [
        { emoji: '🔧', title: 'Asignaciones', description: 'Asigna tareas de mantenimiento al equipo con prioridades, fechas límite y evidencia fotográfica.' },
        { emoji: '📱', title: 'Monitoreo Móvil', description: 'Supervisión de actividades en campo desde el celular. Valida avances, registra novedades y firma digital.' },
        { emoji: '👤', title: 'Soy Cliente', description: 'Portal de autogestión para clientes. Reportan solicitudes, consultan estado y califican el servicio.' },
        { emoji: '📊', title: 'CEO Dashboard', description: 'Panel ejecutivo con métricas clave de mantenimiento: cumplimiento, tiempos y satisfacción del cliente.' },
      ],
    },
  ];

  /** Computed: modules for the active category */
  activeModules = () => {
    const cat = this.categories.find((c) => c.key === this.activeCategory());
    return cat ? cat.modules : [];
  };

  setCategory(key: string): void {
    this.activeCategory.set(key);
  }

  ngAfterViewInit(): void {
    // Scroll reveal intersection observer setup
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('revealed');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    // Query elements with animation classes and observe them
    const targets = this.el.nativeElement.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );
    targets.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  onSubmitForm(event: Event): void {
    event.preventDefault();
    this.formSubmitted.set(true);
  }

  resetForm(): void {
    this.formSubmitted.set(false);
  }
}
