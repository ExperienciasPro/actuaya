import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { UserService } from '../../core/services/user.service';

interface AppModule {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  description: string;
  example: string;
  color: string;
  superAdminOnly?: boolean;
}

interface ModuleCategory {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  modules: AppModule[];
}

@Component({
  selector: 'um-module-picker',
  standalone: true,
  imports: [],
  template: `
    <div class="picker-page">
      <div class="picker-bg">
        <div class="bg-orb orb-a"></div>
        <div class="bg-orb orb-b"></div>
      </div>

      <div class="picker-container">
        <!-- Header -->
        <header class="picker-header animate-up">
          <span class="header-icon">✨</span>
          <h1>Arma tu ActuaYa</h1>
          <p class="picker-subtitle">
            Selecciona los módulos que necesitas hoy. Puedes activar o desactivar más adelante.
          </p>
          <div class="selected-count">
            <span class="count-badge" [class.has-selection]="selectedCount() > 0" [class.bump]="countBump()">
              {{ selectedCount() }} {{ selectedCount() === 1 ? 'módulo' : 'módulos' }}
            </span>
            seleccionados
          </div>
        </header>

        <!-- Category Blocks -->
        @for (cat of categories(); track cat.id; let ci = $index) {
          <section class="category-block animate-up" [style.animation-delay.ms]="100 + ci * 80">
            <div class="category-header">
              <span class="category-icon">{{ cat.icon }}</span>
              <div>
                <h2 class="category-title">{{ cat.title }}</h2>
                <p class="category-subtitle">{{ cat.subtitle }}</p>
              </div>
              <button class="btn-select-all" (click)="selectCategory(cat)">
                {{ isCategoryFullySelected(cat) ? '✓ Todos activos' : 'Activar todos' }}
              </button>
            </div>

            <div class="modules-grid">
              @for (mod of cat.modules; track mod.id; let i = $index) {
                <div
                  class="module-card"
                  [class.selected]="isSelected(mod.id)"
                  [class.just-selected]="justSelected() === mod.id"
                  [class.expanded]="isExpanded(mod.id)"
                  [style.--accent]="mod.color">

                  <!-- Confetti particles -->
                  <div class="confetti-container">
                    <span class="confetti c1">✦</span>
                    <span class="confetti c2">●</span>
                    <span class="confetti c3">▲</span>
                    <span class="confetti c4">♦</span>
                    <span class="confetti c5">★</span>
                    <span class="confetti c6">●</span>
                    <span class="confetti c7">✦</span>
                    <span class="confetti c8">▲</span>
                  </div>

                  <!-- Compact top row (always visible) -->
                  <button class="card-top" (click)="toggle(mod.id)">
                    <span class="card-icon">{{ mod.icon }}</span>
                    <div class="card-info">
                      <h3>{{ mod.name }}</h3>
                      <p class="card-tagline">{{ mod.tagline }}</p>
                    </div>
                    <div class="card-check">
                      @if (isSelected(mod.id)) {
                        <span class="check-icon">✓</span>
                      } @else {
                        <span class="check-empty"></span>
                      }
                    </div>
                  </button>

                  <!-- Details (always visible now) -->
                  <div class="card-details">
                    <p class="card-desc">{{ mod.description }}</p>
                    <div class="card-example">
                      <span class="example-label">💡 Ejemplo:</span>
                      <span class="example-text">{{ mod.example }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Footer CTA -->
        <div class="picker-footer animate-up" style="animation-delay: 600ms">
          <p class="footer-hint">No te preocupes, podrás cambiar tu selección cuando quieras.</p>
          <button
            class="btn-continue"
            [disabled]="selectedCount() === 0"
            (click)="continue()">
            Comenzar con {{ selectedCount() }} {{ selectedCount() === 1 ? 'módulo' : 'módulos' }}
            <span class="btn-arrow">→</span>
          </button>
          <button class="btn-skip" (click)="skipAll()">
            Activar todos y explorar
          </button>
        </div>
      </div>

      <!-- Intro Modal -->
      @if (showIntroModal()) {
        <div class="intro-overlay animate-fadeIn">
          <div class="intro-modal animate-scaleIn">
            <div class="intro-top-bar"></div>

            <div class="intro-icon">🧩</div>

            <h2 class="intro-title">¡Personaliza tu experiencia!</h2>

            <p class="intro-desc">
              A continuación verás los <strong>módulos disponibles</strong> para tu aplicación.
              Cada módulo es una herramienta que puedes activar según lo que necesites.
            </p>

            <div class="intro-points">
              <div class="intro-point">
                <span class="point-icon">✅</span>
                <p><strong>Selecciona</strong> los que quieras usar tocando sobre cada tarjeta.</p>
              </div>
              <div class="intro-point">
                <span class="point-icon">🔄</span>
                <p><strong>Cambia en cualquier momento</strong> desde la configuración de tu cuenta.</p>
              </div>
              <div class="intro-point">
                <span class="point-icon">🚀</span>
                <p><strong>No necesitas todos</strong> — elige solo lo que te sirva hoy y activa más después.</p>
              </div>
            </div>

            <button class="intro-cta" (click)="dismissIntro()">
              ¡Entendido, vamos!
              <span class="cta-arrow">→</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'module-picker.scss',
})
export class ModulePickerComponent {
  private router = inject(Router);
  private storage = inject(StorageService);
  private userService = inject(UserService);

  selected = signal<Set<string>>(new Set());
  justSelected = signal<string | null>(null);
  countBump = signal(false);
  expanded = signal<Set<string>>(new Set());

  /** Intro modal — only shown once per account */
  showIntroModal = signal(!this.storage.has('um_setup_intro_seen'));

  selectedCount = () => this.selected().size;

  private allCategories: ModuleCategory[] = [
    {
      id: 'strategy',
      icon: '🚀',
      title: 'Productividad',
      subtitle: 'Define tu rumbo y mantén el enfoque',
      modules: [
        {
          id: 'goals',
          icon: '🎯',
          name: 'Metas y Objetivos',
          tagline: 'Define hacia dónde vas',
          description: 'Crea metas claras con plazos y hitos. Visualiza tu progreso con el Árbol de Metas y mantén el enfoque en lo que importa.',
          example: '"Aumentar ventas un 30% en Q2" → define sub‑metas semanales.',
          color: '#6c5ce7',
        },
        {
          id: 'projects',
          icon: '📋',
          name: 'Administrador de Proyectos',
          tagline: 'Cumple plazos sin estrés',
          description: 'Tablero tipo Kanban para organizar tareas, asignar responsables y hacer seguimiento al avance de tus proyectos.',
          example: '"Remodelación oficina" → creas columnas: Por hacer, En proceso, Hecho → mueves tareas conforme avanzan.',
          color: '#3498db',
        },
        {
          id: 'analytics',
          icon: '📊',
          name: 'Analítica Productividad',
          tagline: 'Datos que cuentan una historia',
          description: 'Panel unificado con KPIs de metas y proyectos: progreso, productividad y tendencias.',
          example: 'Abres tu dashboard y ves gráficas de tus metas, proyectos y tu score semanal.',
          color: '#f39c12',
        },
        {
          id: 'coach',
          icon: '📱',
          name: 'Coach Móvil',
          tagline: 'Prioridades del día en tu bolsillo',
          description: 'Aplicación diseñada para agentes en campo y comerciales. Mira las metas del día, actualiza tratos y agrega notas desde tu celular.',
          example: 'Tu asesor de ventas cierra un trato en la calle y lo marca como "Ganado" desde su celular, impactando el dashboard inmediatamente.',
          color: '#8e44ad',
        },
      ],
    },
    {
      id: 'commercial',
      icon: '🤝',
      title: 'Comercial & Ventas',
      subtitle: 'Captura leads y cierra tratos más rápido',
      modules: [
        {
          id: 'radar',
          icon: '📡',
          name: 'El Radar',
          tagline: 'Tu CRM pre-pipeline',
          description: 'Gestiona contactos antes de que sean prospectos reales. Configura recordatorios automáticos para no perder oportunidades.',
          example: 'Agregas a un contacto de una feria y programas un recordatorio para llamarlo en 3 días.',
          color: '#e74c3c'
        },
        {
          id: 'sales',
          icon: '📈',
          name: 'Marketing y Ventas',
          tagline: 'Controla tu embudo comercial',
          description: 'Visualiza tus prospectos y deals en un pipeline claro. Mueve los tratos entre etapas hasta el cierre.',
          example: 'Mueves un cliente de "Propuesta Enviada" a "Negociación final".',
          color: '#f1c40f'
        },
        {
          id: 'catalog',
          icon: '🏷️',
          name: 'Catálogo & Cotizador',
          tagline: 'Vende en segundos',
          description: 'Crea cotizaciones rápidas vinculadas a tus productos y envíalas por WhatsApp o correo al instante.',
          example: 'Seleccionas 3 productos, generas PDF y lo envías por WhatsApp al cliente en segundos.',
          color: '#1abc9c',
        },

      ],
    },
    {
      id: 'evaluacion',
      icon: '📋',
      title: 'Evaluación & Diagnóstico',
      subtitle: 'Captura y analiza la realidad de tu entorno',
      modules: [
        {
          id: 'formularios',
          icon: '📋',
          name: 'Formularios Custom',
          tagline: 'Captura datos a tu medida',
          description: 'Crea formularios dinámicos para captura de leads, encuestas de satisfacción o reportes de campo.',
          example: 'Creas una encuesta NPS para tus clientes.',
          color: '#9b59b6',
        },
        {
          id: 'tests',
          icon: '🧪',
          name: 'Tests & Evaluaciones',
          tagline: 'Mide conocimientos y aptitudes',
          description: 'Aplica evaluaciones psicotécnicas, de conocimientos técnicos o tests psicológicos integrados al expediente.',
          example: 'Envías un test a un participante evaluando sus aptitudes.',
          color: '#e67e22',
        },
        {
          id: 'datos',
          icon: '🗄️',
          name: 'Base de Datos',
          tagline: 'Toda tu info centralizada',
          description: 'Repositorio centralizado de toda la información capturada a través de formularios y tests.',
          example: 'Descargas en Excel todas las respuestas recolectadas.',
          color: '#34495e',
        },
        {
          id: 'resultados',
          icon: '📊',
          name: 'Análisis de Datos',
          tagline: 'Inteligencia analítica',
          description: 'Cruza información de diferentes módulos para obtener insights profundos sobre tus evaluaciones y formularios.',
          example: 'Visualizas métricas poblacionales o gráficas de diagnósticos.',
          color: '#273c75',
        }
      ],
    },
    {
      id: 'finance',
      icon: '💰',
      title: 'Finanzas & Rentabilidad',
      subtitle: 'Controla cada centavo de tu empresa',
      modules: [
        {
          id: 'income',
          icon: '💰',
          name: 'Ingresos',
          tagline: 'Registra tus ventas',
          description: 'Lleva el control de todas tus facturas y órdenes de compra. Genera reportes de ingresos mensuales y anuales.',
          example: 'Registras el pago de un proyecto y ves cómo afecta tu meta de ingresos mensual.',
          color: '#27ae60',
          superAdminOnly: true,
        },
        {
          id: 'cashflow',
          icon: '💸',
          name: 'Flujo de Caja',
          tagline: 'Salud financiera real',
          description: 'Balance diario entre ingresos y egresos. Proyecta tu liquidez y evita sorpresas a fin de mes.',
          example: 'Ves que el próximo lunes tienes pagos de nómina y revisas si tienes caja disponible.',
          color: '#16a085'
        },
        {
          id: 'investments',
          icon: '💎',
          name: 'Gestión de Inversiones',
          tagline: 'Haz crecer tu capital',
          description: 'Controla tu portafolio de inversiones, sigue retornos y mantén una visión clara de tu crecimiento patrimonial.',
          example: 'Registras un dividendo y ves cómo afecta el retorno global de tu portafolio.',
          color: '#8e44ad',
          superAdminOnly: true,
        },
        {
          id: 'education',
          icon: '🎓',
          name: 'Proyectos Educativos',
          tagline: 'Controla tus programas',
          description: 'Lleva registro independiente de ingresos y gastos por cada curso, taller o diplomado.',
          example: 'Registras 20 inscritos a un diplomado y mides su rentabilidad real.',
          color: '#3498db',
          superAdminOnly: true,
        },
        {
          id: 'profitability',
          icon: '📐',
          name: 'Calculadora de Rentabilidad',
          tagline: 'No pierdas dinero',
          description: 'Calcula el margen real de tus productos o servicios considerando costos fijos y variables.',
          example: 'Ingresas el costo de materiales y horas hombre para determinar el precio de venta ideal.',
          color: '#2c3e50'
        },
        {
          id: 'budget_planner',
          icon: '💰',
          name: 'Planeación Financiera',
          tagline: 'Capital vs. inversiones',
          description: 'Registra tu capital disponible y planifica las inversiones del año. Visualiza cuánto puedes comprometer.',
          example: 'Registras tu capital total y restas inversiones planeadas para saber tu saldo real proyectado.',
          color: '#f39c12'
        }
      ],
    },
    {
      id: 'operations',
      icon: '⚙️',
      title: 'Operaciones & Equipo',
      subtitle: 'Gestión interna eficiente',
      modules: [
        {
          id: 'inventory',
          icon: '📦',
          name: 'Control de Inventario',
          tagline: 'Stock inteligente',
          description: 'Control de existencias con alertas de stock mínimo y trazabilidad de movimientos.',
          example: 'Recibes una alerta de que solo quedan 5 unidades de tu producto estrella.',
          color: '#d35400'
        },
        {
          id: 'menu_digital',
          icon: '🍽️',
          name: 'Menú Digital',
          tagline: 'Tu carta online en segundos',
          description: 'Crea y gestiona el menú de tu restaurante o bar. Ultra personalizable, ligero y fácil de actualizar. Tus clientes lo ven instantáneamente.',
          example: 'Actualizas el plato del día y tus clientes lo ven al instante escaneando el QR de la mesa.',
          color: '#e67e22'
        },
        {
          id: 'shifts',
          icon: '🕐',
          name: 'Gestión de Turnos',
          tagline: 'Horarios sin conflictos',
          description: 'Organiza los horarios de tu equipo por semanas o meses. Evita cruces y simplifica la comunicación.',
          example: 'Asignas el turno de la mañana a Juan y el de la tarde a María de lunes a viernes.',
          color: '#2980b9'
        }
      ],
    },
    {
      id: 'gestion_mant',
      icon: '🔧',
      title: 'Gestión de Mantenimiento',
      subtitle: 'Control operativo para máxima eficiencia',
      modules: [
        {
          id: 'ceo_teo',
          icon: '⏲️',
          name: 'Soy Administrador',
          tagline: 'Visión ejecutiva de tus operaciones',
          description: 'Panel centralizado con KPIs operativos: órdenes de trabajo abiertas, tiempos de resolución, costos y rendimiento de técnicos.',
          example: 'Ves en tiempo real cuántas OTs están abiertas, cuál es el costo operativo del día y qué técnico tiene más carga.',
          color: '#f39c12',
        },
        {
          id: 'asignaciones',
          icon: '📅',
          name: 'Asignaciones',
          tagline: 'Calendario inteligente para Asignar OTs',
          description: 'Despacha a tus técnicos de forma organizada y en calendario. Evita sobre-asignaciones y ten visibilidad del día a día.',
          example: 'Ves un espacio libre en la agenda y asignas una visita de mantenimiento preventivo para un cliente.',
          color: 'var(--accent)',
        },
        {
          id: 'monitoreo',
          icon: '🛠️',
          name: 'Soy Técnico',
          tagline: 'Control GPS de tus operaciones',
          description: 'Asigna órdenes de trabajo a tus técnicos en terreno. Supervísalos en vivo sobre un mapa y monitorea los tiempos y costos operativos (SLA).',
          example: 'Envías a un técnico a una emergencia, el técnico avanza el estado y ves el costo subir en tiempo real mientras transcurre la OT.',
          color: '#e74c3c',
        },
        {
          id: 'soy_cliente',
          icon: '👤',
          name: 'Soy Cliente',
          tagline: 'Portal de monitoreo para tus clientes',
          description: 'Tu cliente monitorea sus equipos, ve alertas de mantenimientos próximos/vencidos, descarga documentación de técnicos y contacta por WhatsApp para programar.',
          example: 'Tu cliente recibe alerta de mantenimiento vencido de su aire acondicionado, da clic y te contacta directo por WhatsApp.',
          color: '#25d366',
        }
      ],
    },
  ];

  /** Filtered categories based on user role */
  categories = computed(() => {
    const isSuperAdmin = this.userService.isSuperAdmin();
    return this.allCategories
      .map(cat => ({
        ...cat,
        modules: cat.modules.filter(m => !m.superAdminOnly || isSuperAdmin),
      }))
      .filter(cat => cat.modules.length > 0);
  });

  /** Flat list of all visible modules (used for "select all") */
  get modules(): AppModule[] {
    return this.categories().flatMap(c => c.modules);
  }

  isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  toggleExpand(id: string): void {
    const next = new Set(this.expanded());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expanded.set(next);
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.selected());
    const isAdding = !next.has(id);
    if (isAdding) {
      next.add(id);
      this.justSelected.set(id);
      this.countBump.set(true);
      setTimeout(() => this.justSelected.set(null), 700);
      setTimeout(() => this.countBump.set(false), 500);
    } else {
      next.delete(id);
    }
    this.selected.set(next);
  }

  isCategoryFullySelected(cat: ModuleCategory): boolean {
    return cat.modules.every(m => this.selected().has(m.id));
  }

  selectCategory(cat: ModuleCategory): void {
    const next = new Set(this.selected());
    const allSelected = this.isCategoryFullySelected(cat);
    cat.modules.forEach(m => {
      if (allSelected) {
        next.delete(m.id);
      } else {
        next.add(m.id);
      }
    });
    this.selected.set(next);
    if (!allSelected) {
      this.countBump.set(true);
      setTimeout(() => this.countBump.set(false), 500);
    }
  }

  continue(): void {
    this.saveAndNavigate();
  }

  skipAll(): void {
    const all = new Set(this.modules.map(m => m.id));
    this.selected.set(all);
    this.saveAndNavigate();
  }

  dismissIntro(): void {
    this.storage.set('um_setup_intro_seen', '1');
    this.showIntroModal.set(false);
  }

  private saveAndNavigate(): void {
    let enabledModules = Array.from(this.selected());

    // Auto-activar Base de Datos y Análisis de Datos si 'tests', 'encuestas' o 'formularios' están presentes
    const dataTriggerModules = ['tests', 'encuestas', 'formularios'];
    const shouldEnableData = enabledModules.some(m => dataTriggerModules.includes(m));
    
    if (shouldEnableData) {
      if (!enabledModules.includes('datos')) enabledModules.push('datos');
      if (!enabledModules.includes('resultados')) enabledModules.push('resultados');
    }

    this.storage.set('um_enabled_modules', enabledModules);
    this.router.navigate(['/bienvenida']);
  }
}

