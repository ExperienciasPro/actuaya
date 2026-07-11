import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface SprintDetalle {
  semana: number;
  habilidad: string;
  estado: string;
  sprintTemplateId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  diaInspiracion: { contenido?: string; tipo?: string; completado: boolean; fechaCompletado?: string };
  diaMicroAccion: { instruccion?: string; completado: boolean; fechaCompletado?: string };
  diaCheckIn: { respuesta?: string; fechaCompletado?: string };
}

interface RegistroEmocional {
  fecha: string;
  nivel: number;
  emocion: string;
  pensamiento?: string;
  contexto?: string;
}

interface Victoria {
  fecha: string;
  descripcion: string;
}

interface PlanEntrenamiento {
  _id: string;
  candidatoNombre: string;
  candidatoEmail: string;
  origenTipo: 'test' | 'bateria' | 'manual';
  origenNombre: string;
  puntajeBase: number;
  dimensionesDetectadas: { nombre: string; puntaje: number; nivel: string }[];
  sprints: SprintDetalle[];
  registrosEmocionales?: RegistroEmocional[];
  victorias?: Victoria[];
  estado: 'activo' | 'pausado' | 'completado';
  progreso: number;
  tokenAcceso: string;
  semanasIgnoradas?: number;
  createdAt: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-admin-entrenamientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="ent-layout" style="padding: 24px;">

  <!-- Sidebar -->
  <aside class="ent-aside">
    <div class="ent-aside-card">
      <div class="module-banner" style="background: linear-gradient(135deg, var(--accent), var(--accent)); height: 6px; border-radius: 24px 24px 0 0; margin: -40px -30px 24px -30px;"></div>
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 6px;">
        <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(var(--accent-rgb, 14, 165, 233), 0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="width: 22px; height: 22px;"><rect x="3" y="7" width="4" height="10" rx="2"></rect><rect x="17" y="7" width="4" height="10" rx="2"></rect><line x1="7" y1="12" x2="17" y2="12"></line></svg>
        </div>
        <h1 class="ent-title" style="margin: 0;">Gestión<br>Entrenamiento</h1>
      </div>
      <p style="font-size: 12px; color: #94a3b8; font-weight: 600; margin: 0 0 12px 0;">{{ planes.length }} plan{{ planes.length !== 1 ? 'es' : '' }} · {{ planesEnProgreso }} en progreso · {{ planesCompletados }} completado{{ planesCompletados !== 1 ? 's' : '' }}</p>
      <p class="ent-subtitle">Planes de mejora personalizados generados a partir de los resultados de tests y baterías.</p>

      <button class="btn-pill-amber" (click)="generarPlanManual()">+ Generar Plan Manual</button>

      <button class="btn-pill-secondary" (click)="abrirBiblioteca()" style="margin-top: 10px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        Biblioteca de Sprints
      </button>

      <div style="margin-top: 24px; width: 100%;">
        <p style="font-size: 12px; font-weight: 800; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; text-transform: uppercase;">Filtrar estado</p>
        <select class="ent-select" [(ngModel)]="filtroEstado">
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="pausado">Pausados</option>
          <option value="completado">Completados</option>
        </select>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="ent-main">

    <!-- Search bar + View Toggles -->
    <div class="search-and-toggles" *ngIf="!loading && planes.length > 0">
      <div class="search-bar-container">
        <input type="text" class="search-input" placeholder="Buscar por candidato, test o área..." [(ngModel)]="searchTerm">
        <button class="search-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      <div class="view-toggles">
        <button class="toggle-btn" [class.activo]="vistaActual === 'cuadricula'" (click)="cambiarVista('cuadricula')" title="Vista de Cuadrícula">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </button>
        <button class="toggle-btn" [class.activo]="vistaActual === 'lista'" (click)="cambiarVista('lista')" title="Vista de Lista">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </button>
      </div>
    </div>

    <!-- Skeleton -->
    <div *ngIf="loading" class="ent-grid">
      <div *ngFor="let s of [1,2,3]" class="skeleton-card">
        <div class="skeleton-banner skeleton-pulse"></div>
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-pulse" style="width: 65%; height: 14px;"></div>
          <div class="skeleton-line skeleton-pulse" style="width: 85%; height: 10px; margin-top: 12px;"></div>
          <div class="skeleton-line skeleton-pulse" style="width: 45%; height: 10px; margin-top: 8px;"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="!loading && planesFiltrados.length === 0" class="ent-empty">
      <div style="width: 120px; height: 120px; margin-bottom: 24px;">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="55" fill="url(#emptyGradEnt)" opacity="0.12"/>
          <circle cx="60" cy="60" r="38" fill="url(#emptyGradEnt)" opacity="0.08"/>
          <path d="M35 45h50v35a5 5 0 0 1-5 5H40a5 5 0 0 1-5-5V45z" fill="var(--accent)" opacity="0.15" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M35 45l25-15 25 15" fill="#7dd3fc" opacity="0.3" stroke="var(--accent)" stroke-width="1.5"/>
          <rect x="48" y="55" width="24" height="3" rx="1.5" fill="var(--accent)" opacity="0.5"/>
          <rect x="48" y="62" width="18" height="3" rx="1.5" fill="var(--accent)" opacity="0.35"/>
          <rect x="48" y="69" width="20" height="3" rx="1.5" fill="var(--accent)" opacity="0.25"/>
          <circle cx="95" cy="35" r="12" fill="var(--accent)" opacity="0.15"/>
          <circle cx="95" cy="35" r="8" fill="var(--accent)"/>
          <line x1="95" y1="31" x2="95" y2="39" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <line x1="91" y1="35" x2="99" y2="35" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <defs><linearGradient id="emptyGradEnt" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>
        </svg>
      </div>
      <h3 *ngIf="planes.length === 0">Aún no hay planes de entrenamiento</h3>
      <h3 *ngIf="planes.length > 0">Sin resultados</h3>
      <p *ngIf="planes.length === 0">Los planes se generan automáticamente cuando un candidato finaliza un test o batería. También puedes crear uno manualmente.</p>
      <p *ngIf="planes.length > 0">No se encontraron planes que coincidan con los filtros aplicados.</p>

      <div *ngIf="planes.length === 0" style="display: flex; gap: 24px; margin-bottom: 28px; flex-wrap: wrap; justify-content: center;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="var(--accent)" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Basado en resultados reales
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="var(--accent)" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Áreas débiles identificadas
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="var(--accent)" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Módulos de mejora
        </div>
      </div>

      <button *ngIf="planes.length === 0" (click)="generarPlanManual()" style="
        padding: 14px 32px; background: linear-gradient(135deg, var(--accent), var(--accent));
        color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
        cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(var(--accent-rgb, 14, 165, 233), 0.3);"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(var(--accent-rgb, 14, 165, 233), 0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(var(--accent-rgb, 14, 165, 233), 0.3)'">
        + Generar mi primer plan
      </button>
    </div>

    <!-- Cards Grid / List -->
    <div *ngIf="!loading && planesFiltrados.length > 0" class="ent-grid" [class.modo-lista]="vistaActual === 'lista'">
      <div class="ent-card" *ngFor="let plan of planesFiltrados; let i = index" [style.animation-delay]="(i * 60) + 'ms'">
        <!-- Header banner -->
        <div class="ent-card-banner" [ngClass]="{
          'banner-pendiente': plan.estado === 'activo',
          'banner-progreso': plan.estado === 'pausado',
          'banner-completado': plan.estado === 'completado'
        }">
          <div class="ent-card-estado">
            <span class="estado-badge" [ngClass]="{
              'badge-pendiente': plan.estado === 'activo',
              'badge-progreso': plan.estado === 'pausado',
              'badge-completado': plan.estado === 'completado'
            }">{{ plan.estado === 'activo' ? 'Activo' : plan.estado === 'pausado' ? 'Pausado' : 'Completado' }}</span>
          </div>
          <svg class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="7" width="4" height="10" rx="2"></rect><rect x="17" y="7" width="4" height="10" rx="2"></rect><line x1="7" y1="12" x2="17" y2="12"></line>
          </svg>
        </div>

        <div class="ent-card-body">
          <h4 class="ent-card-title" [title]="plan.candidatoNombre">{{ plan.candidatoNombre }}</h4>
          <p class="ent-card-desc">{{ plan.origenNombre || 'Plan manual' }}</p>

          <!-- Origen -->
          <div class="ent-card-origin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; flex-shrink: 0;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>{{ plan.origenTipo === 'test' ? 'Test' : plan.origenTipo === 'bateria' ? 'Batería' : 'Manual' }}: {{ plan.origenNombre || '—' }}</span>
          </div>

          <!-- Sprints info -->
          <div class="ent-card-candidate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; flex-shrink: 0;">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>{{ plan.sprints?.length || 0 }} sprints · {{ getSprintsCompletados(plan) }} completados</span>
          </div>

          <!-- Score -->
          <div class="ent-card-score">
            <span class="score-label">Puntaje Base:</span>
            <span class="score-value" [ngClass]="{
              'score-low': plan.puntajeBase < 50,
              'score-mid': plan.puntajeBase >= 50 && plan.puntajeBase < 70,
              'score-high': plan.puntajeBase >= 70
            }">{{ plan.puntajeBase }}/100</span>
          </div>

          <!-- Dimensiones detectadas -->
          <div class="ent-card-areas">
            <span class="area-tag" *ngFor="let dim of plan.dimensionesDetectadas?.slice(0, 3)">{{ dim.nombre }}</span>
          </div>

          <!-- Progress bar -->
          <div class="progress-container">
            <div class="progress-label">
              <span>Progreso</span>
              <span class="progress-pct">{{ plan.progreso }}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" [style.width.%]="plan.progreso" [ngClass]="{
                'fill-pendiente': plan.estado === 'activo',
                'fill-progreso': plan.estado === 'pausado',
                'fill-completado': plan.estado === 'completado'
              }"></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="ent-card-actions">
            <button class="action-btn-view" title="Ver detalle" (click)="verDetalle(plan)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Ver
            </button>
            <button class="action-btn-send" title="Copiar enlace público" (click)="copiarEnlace(plan)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Enviar
            </button>
            <button class="action-btn-delete" title="Eliminar" (click)="eliminarPlan(plan)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14H7L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- ═══ DETAIL PANEL OVERLAY ═══ -->
<div class="detail-overlay" *ngIf="planSeleccionado" (click)="cerrarDetalle()">
  <div class="detail-panel" (click)="$event.stopPropagation()">

    <!-- Close -->
    <button class="detail-close" (click)="cerrarDetalle()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 20px; height: 20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>

    <!-- Loading detail -->
    <div *ngIf="loadingDetalle" style="display: flex; align-items: center; justify-content: center; min-height: 300px;">
      <div style="width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <div *ngIf="!loadingDetalle && planDetalle">
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-avatar">{{ planDetalle.candidatoNombre?.charAt(0) || 'P' }}</div>
        <div>
          <h2 class="detail-nombre">{{ planDetalle.candidatoNombre }}</h2>
          <p class="detail-email">{{ planDetalle.candidatoEmail || 'Sin correo' }}</p>
        </div>
        <span class="detail-badge" [ngClass]="{
          'dbadge-activo': planDetalle.estado === 'activo',
          'dbadge-pausado': planDetalle.estado === 'pausado',
          'dbadge-completado': planDetalle.estado === 'completado'
        }">{{ planDetalle.estado | titlecase }}</span>
      </div>

      <!-- Info strip -->
      <div class="detail-info-strip">
        <div class="info-chip">
          <span class="info-val">{{ planDetalle.puntajeBase }}</span>
          <span class="info-lbl">Puntaje</span>
        </div>
        <div class="info-chip">
          <span class="info-val">{{ planDetalle.sprints?.length || 0 }}</span>
          <span class="info-lbl">Sprints</span>
        </div>
        <div class="info-chip">
          <span class="info-val">{{ planDetalle.progreso }}%</span>
          <span class="info-lbl">Progreso</span>
        </div>
        <div class="info-chip">
          <span class="info-val">{{ planDetalle.victorias?.length || 0 }}</span>
          <span class="info-lbl">Victorias</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div style="margin: 0 0 24px 0;">
        <div class="detail-progress-bg">
          <div class="detail-progress-fill" [style.width.%]="planDetalle.progreso"></div>
        </div>
      </div>

      <!-- ── Dimensiones ── -->
      <div class="detail-section" *ngIf="planDetalle.dimensionesDetectadas?.length">
        <h3 class="detail-section-title">🎯 Dimensiones Detectadas</h3>
        <div class="dim-list">
          <div class="dim-item" *ngFor="let dim of planDetalle.dimensionesDetectadas">
            <div class="dim-row">
              <span class="dim-name">{{ dim.nombre }}</span>
              <span class="dim-score" [ngClass]="{'dim-low': dim.nivel === 'bajo', 'dim-mid': dim.nivel === 'medio', 'dim-high': dim.nivel === 'alto'}">{{ dim.puntaje }}%</span>
            </div>
            <div class="dim-bar-bg">
              <div class="dim-bar-fill" [style.width.%]="dim.puntaje" [ngClass]="{'dim-fill-low': dim.nivel === 'bajo', 'dim-fill-mid': dim.nivel === 'medio', 'dim-fill-high': dim.nivel === 'alto'}"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sprint Timeline ── -->
      <div class="detail-section">
        <h3 class="detail-section-title">📅 Timeline de Sprints</h3>
        <div class="sprint-timeline">
          <div class="sprint-row" *ngFor="let sprint of planDetalle.sprints" [ngClass]="{
            'sprint-activo': sprint.estado === 'activo',
            'sprint-completado': sprint.estado === 'completado',
            'sprint-omitido': sprint.estado === 'omitido'
          }">
            <div class="sprint-indicator">
              <div class="sprint-dot" [ngClass]="{
                'dot-pendiente': sprint.estado === 'pendiente',
                'dot-activo': sprint.estado === 'activo',
                'dot-completado': sprint.estado === 'completado',
                'dot-omitido': sprint.estado === 'omitido'
              }"></div>
              <div class="sprint-line" *ngIf="sprint.semana < planDetalle.sprints.length"></div>
            </div>
            <div class="sprint-content">
              <div class="sprint-header-row">
                <span class="sprint-semana">Semana {{ sprint.semana }}</span>
                <span class="sprint-estado-tag" [ngClass]="'tag-' + sprint.estado">{{ sprint.estado | titlecase }}</span>
              </div>
              <p class="sprint-habilidad">{{ sprint.habilidad }}</p>
              <!-- Day progress -->
              <div class="sprint-days">
                <div class="day-chip" [class.day-done]="sprint.diaInspiracion?.completado" title="Día Inspiración">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px;"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path></svg>
                  Inspiración
                </div>
                <div class="day-chip" [class.day-done]="sprint.diaMicroAccion?.completado" title="Micro-Acción">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Acción
                </div>
                <div class="day-chip" [class.day-done]="sprint.diaCheckIn?.respuesta" title="Check-In">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  {{ sprint.diaCheckIn?.respuesta || 'Pendiente' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Termómetro Emocional ── -->
      <div class="detail-section" *ngIf="planDetalle.registrosEmocionales?.length">
        <h3 class="detail-section-title">🌡️ Termómetro Emocional <small>(últimos {{ (planDetalle.registrosEmocionales || []).length }} registros)</small></h3>
        <div class="emo-sparkline">
          <div class="emo-bar" *ngFor="let reg of (planDetalle.registrosEmocionales || []).slice(-20)"
               [style.height.%]="reg.nivel * 10"
               [title]="reg.emocion + ' — Nivel ' + reg.nivel + '/10'"
               [ngClass]="{'emo-low': reg.nivel <= 3, 'emo-mid': reg.nivel > 3 && reg.nivel <= 6, 'emo-high': reg.nivel > 6}">
          </div>
        </div>
        <div class="emo-scale">
          <span>😌 Tranquilo</span>
          <span>😰 Alta tensión</span>
        </div>
      </div>

      <!-- ── Victorias ── -->
      <div class="detail-section" *ngIf="planDetalle.victorias?.length">
        <h3 class="detail-section-title">🏆 Victorias</h3>
        <div class="victory-list">
          <div class="victory-item" *ngFor="let v of (planDetalle.victorias || []).slice(-5)">
            <span class="victory-date">{{ v.fecha | date:'dd/MM' }}</span>
            <span class="victory-text">{{ v.descripcion }}</span>
          </div>
        </div>
      </div>

      <!-- ── Actions ── -->
      <div class="detail-actions">
        <button class="dact-btn dact-link" (click)="copiarEnlace(planDetalle)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          Copiar Enlace Público
        </button>
        <button class="dact-btn dact-toggle" (click)="toggleEstado(planDetalle)">
          {{ planDetalle.estado === 'activo' ? '⏸ Pausar' : planDetalle.estado === 'pausado' ? '▶ Reactivar' : '✅ Completado' }}
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Success toast -->
<div class="toast-success" *ngIf="mensajeExito">
  ✅ {{ mensajeExito }}
</div>

<!-- ═══ TEMPLATES LIBRARY MODAL ═══ -->
<div class="detail-overlay" *ngIf="mostrarBiblioteca" (click)="cerrarBiblioteca()">
  <div class="templates-modal" (click)="$event.stopPropagation()">
    <button class="detail-close" (click)="cerrarBiblioteca()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 20px; height: 20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>

    <div class="tpl-header">
      <h2 class="tpl-title">📚 Biblioteca de Sprint Templates</h2>
      <p class="tpl-desc">Crea y gestiona los sprints reutilizables que se asignan a los planes de entrenamiento.</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="tpl-add-btn" (click)="nuevoTemplate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo Template
        </button>
        <button class="tpl-add-btn" style="background: linear-gradient(135deg, var(--accent), var(--accent));" (click)="mostrarImportJSON = true" *ngIf="esSuperAdmin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Importar JSON
        </button>
      </div>
    </div>

    <!-- Loading -->  
    <div *ngIf="loadingTemplates" style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>

    <!-- Empty -->  
    <div *ngIf="!loadingTemplates && templates.length === 0 && !editandoTemplate" class="tpl-empty">
      <p>Aún no hay sprint templates. Crea el primero para empezar a construir planes.</p>
    </div>

    <!-- Template Cards Grid -->  
    <div *ngIf="!loadingTemplates && templates.length > 0 && !editandoTemplate" class="tpl-grid">
      <div class="tpl-card" *ngFor="let tpl of templates">
        <div class="tpl-card-top">
          <span class="tpl-nivel-tag" [ngClass]="'nivel-' + tpl.nivelObjetivo">{{ tpl.nivelObjetivo | titlecase }}</span>
          <div class="tpl-diff">
            <span *ngFor="let s of [1,2,3,4,5]" [class.star-filled]="s <= tpl.dificultad">★</span>
          </div>
        </div>
        <h4 class="tpl-card-name">{{ tpl.nombre }}</h4>
        <p class="tpl-card-skill">{{ tpl.habilidad }}</p>
        <div class="tpl-card-days">
          <span class="tpl-day"><strong>D1:</strong> {{ tpl.contenidoInspiracion?.tipo | titlecase }}</span>
          <span class="tpl-day"><strong>D3:</strong> {{ (tpl.microAccion?.instruccion || '').slice(0, 30) }}...</span>
        </div>
        <div class="tpl-card-tags">
          <span class="tpl-tag" *ngFor="let tag of tpl.tags?.slice(0, 3)">{{ tag }}</span>
        </div>
        <div class="tpl-card-actions">
          <button class="tpl-act edit" (click)="editarTemplate(tpl)">Editar</button>
          <button class="tpl-act del" (click)="eliminarTemplate(tpl)">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form -->  
    <div *ngIf="editandoTemplate" class="tpl-form">
      <h3 class="tpl-form-title">{{ templateForm._id ? 'Editar' : 'Nuevo' }} Sprint Template</h3>

      <div class="tpl-form-grid">
        <div class="tpl-field">
          <label>Nombre del Sprint</label>
          <input type="text" [(ngModel)]="templateForm.nombre" placeholder="Pausa Socrática">
        </div>
        <div class="tpl-field">
          <label>Habilidad</label>
          <input type="text" [(ngModel)]="templateForm.habilidad" placeholder="Tolerancia a la Frustración">
        </div>
        <div class="tpl-field">
          <label>Nivel Objetivo</label>
          <select [(ngModel)]="templateForm.nivelObjetivo">
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
        <div class="tpl-field">
          <label>Dificultad (1–5)</label>
          <select [(ngModel)]="templateForm.dificultad">
            <option [ngValue]="1">1 ★</option>
            <option [ngValue]="2">2 ★★</option>
            <option [ngValue]="3">3 ★★★</option>
            <option [ngValue]="4">4 ★★★★</option>
            <option [ngValue]="5">5 ★★★★★</option>
          </select>
        </div>
      </div>

      <h4 class="tpl-form-subtitle">🌟 Día 1 — Inspiración</h4>
      <div class="tpl-form-grid">
        <div class="tpl-field">
          <label>Tipo</label>
          <select [(ngModel)]="templateForm.contenidoInspiracion.tipo">
            <option value="texto">Texto</option>
            <option value="audio">Audio</option>
            <option value="visual">Visual</option>
          </select>
        </div>
        <div class="tpl-field">
          <label>Título</label>
          <input type="text" [(ngModel)]="templateForm.contenidoInspiracion.titulo" placeholder="Título del contenido">
        </div>
        <div class="tpl-field full">
          <label>Contenido (URL o texto)</label>
          <textarea [(ngModel)]="templateForm.contenidoInspiracion.contenido" rows="3" placeholder="URL de audio o texto del contenido inspiracional..."></textarea>
        </div>
      </div>

      <h4 class="tpl-form-subtitle">✅ Día 3 — Micro-Acción</h4>
      <div class="tpl-form-grid">
        <div class="tpl-field full">
          <label>Instrucción</label>
          <textarea [(ngModel)]="templateForm.microAccion.instruccion" rows="2" placeholder="En tu próxima reunión, practica..."></textarea>
        </div>
        <div class="tpl-field">
          <label>Ejemplo</label>
          <input type="text" [(ngModel)]="templateForm.microAccion.ejemplo" placeholder="Ejemplo concreto">
        </div>
        <div class="tpl-field">
          <label>Contexto</label>
          <input type="text" [(ngModel)]="templateForm.microAccion.contexto" placeholder="En qué contexto aplicar">
        </div>
      </div>

      <h4 class="tpl-form-subtitle">💬 Día 5 — Check-In</h4>
      <div class="tpl-field full">
        <label>Pregunta de Check-In</label>
        <input type="text" [(ngModel)]="templateForm.checkInPregunta" placeholder="¿Lograste aplicar la micro-acción esta semana?">
      </div>

      <div class="tpl-field full" style="margin-top: 12px;">
        <label>Tags (separados por coma)</label>
        <input type="text" [(ngModel)]="templateForm.tagsInput" placeholder="liderazgo, estrés, comunicación">
      </div>

      <div class="tpl-form-actions">
        <button class="tpl-cancel" (click)="cancelarEdicion()">Cancelar</button>
        <button class="tpl-save" (click)="guardarTemplate()" [disabled]="!templateForm.nombre || !templateForm.habilidad">Guardar Template</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══ IMPORT JSON MODAL ═══ -->
<div class="detail-overlay" *ngIf="mostrarImportJSON" (click)="mostrarImportJSON = false">
  <div class="templates-modal" (click)="$event.stopPropagation()" style="max-width: 680px;">
    <button class="detail-close" (click)="mostrarImportJSON = false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 20px; height: 20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>

    <div class="tpl-header">
      <h2 class="tpl-title">📥 Importar Entrenamiento desde JSON</h2>
      <p class="tpl-desc">Pega el JSON generado por Gemini para crear automáticamente el Sprint Template y el plan de entrenamiento.</p>
    </div>

    <!-- Textarea -->
    <div class="tpl-field full" style="margin-bottom: 16px;">
      <label>JSON de Gemini</label>
      <textarea [(ngModel)]="importJsonText" rows="12" placeholder='Pega aquí el JSON generado por Gemini...' style="font-family: 'Fira Code', 'Courier New', monospace; font-size: 12px; line-height: 1.5; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 12px; padding: 16px; resize: vertical;"></textarea>
    </div>

    <!-- Preview parsed -->
    <div *ngIf="importPreview" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px; color: #166534; font-size: 14px;">✅ JSON válido — Vista previa:</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #1e293b;">
        <span><strong>Sprint:</strong> {{ importPreview.template?.nombre }}</span>
        <span><strong>Habilidad:</strong> {{ importPreview.template?.habilidad }}</span>
        <span><strong>Nivel:</strong> {{ importPreview.template?.nivelObjetivo | titlecase }}</span>
        <span><strong>Categoría:</strong> {{ importPreview.template?.categoria }}</span>
        <span style="grid-column: 1 / -1;"><strong>Día 1:</strong> {{ importPreview.template?.contenidoInspiracion?.titulo }}</span>
        <span style="grid-column: 1 / -1;"><strong>Micro-Acción:</strong> {{ (importPreview.template?.microAccion?.instruccion || '').slice(0, 80) }}...</span>
      </div>
    </div>

    <!-- Error -->
    <div *ngIf="importJsonError" style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; color: #991b1b; font-size: 13px;">
      ❌ {{ importJsonError }}
    </div>

    <div class="tpl-form-actions">
      <button class="tpl-cancel" (click)="mostrarImportJSON = false">Cancelar</button>
      <button class="tpl-add-btn" style="padding: 10px 16px; font-size: 13px;" (click)="validarImportJSON()">👁️ Previsualizar</button>
      <button class="tpl-save" (click)="ejecutarImportJSON()" [disabled]="!importPreview || importandoJSON">
        {{ importandoJSON ? 'Importando...' : '🚀 Importar a Testea' }}
      </button>
    </div>
  </div>
</div>

<!-- ═══ CREATE PLAN MANUAL MODAL ═══ -->
<div class="detail-overlay" *ngIf="mostrarCrearPlan" (click)="cerrarCrearPlan()">
  <div class="templates-modal" (click)="$event.stopPropagation()">
    <button class="detail-close" (click)="cerrarCrearPlan()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 20px; height: 20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>

    <div class="tpl-header">
      <h2 class="tpl-title">🎯 Crear Plan de Entrenamiento Manual</h2>
      <p class="tpl-desc">Configura un plan personalizado seleccionando al participante y los sprints a incluir.</p>
    </div>

    <!-- Step 1: Candidate info -->
    <div class="plan-step">
      <h3 class="plan-step-title">
        <span class="plan-step-num">1</span>
        Información del Participante
      </h3>
      <div class="tpl-form-grid">
        <div class="tpl-field">
          <label>Nombre</label>
          <input type="text" [(ngModel)]="planManualForm.candidatoNombre" placeholder="Nombre del participante">
        </div>
        <div class="tpl-field">
          <label>Email</label>
          <input type="email" [(ngModel)]="planManualForm.candidatoEmail" placeholder="correo@email.com">
        </div>
        <div class="tpl-field">
          <label>Origen</label>
          <select [(ngModel)]="planManualForm.origenTipo">
            <option value="manual">Manual</option>
            <option value="test">Test</option>
            <option value="bateria">Batería</option>
          </select>
        </div>
        <div class="tpl-field">
          <label>Nombre del Origen (opcional)</label>
          <input type="text" [(ngModel)]="planManualForm.origenNombre" placeholder="Nombre del test o batería">
        </div>
        <div class="tpl-field">
          <label>Puntaje Base (0–100)</label>
          <input type="number" [(ngModel)]="planManualForm.puntajeBase" min="0" max="100" placeholder="50">
        </div>
      </div>
    </div>

    <!-- Step 2: Select sprints from library -->
    <div class="plan-step">
      <h3 class="plan-step-title">
        <span class="plan-step-num">2</span>
        Seleccionar Sprints
        <span class="plan-selected-count" *ngIf="sprintsSeleccionados.length">
          {{ sprintsSeleccionados.length }} seleccionado{{ sprintsSeleccionados.length > 1 ? 's' : '' }}
        </span>
      </h3>

      <div *ngIf="loadingTemplatesPlan" style="display: flex; justify-content: center; padding: 24px;">
        <div style="width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>

      <div *ngIf="!loadingTemplatesPlan && templatesPlan.length === 0" class="tpl-empty">
        <p>No hay templates disponibles. Crea templates primero en la Biblioteca de Sprints.</p>
      </div>

      <div *ngIf="!loadingTemplatesPlan && templatesPlan.length > 0" class="plan-sprint-list">
        <div class="plan-sprint-item" *ngFor="let tpl of templatesPlan"
             [class.sprint-selected]="isSprintSelected(tpl._id)"
             (click)="toggleSprintSelection(tpl)">
          <div class="plan-sprint-check">
            <svg *ngIf="isSprintSelected(tpl._id)" viewBox="0 0 24 24" fill="var(--accent)" style="width: 20px; height: 20px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            <div *ngIf="!isSprintSelected(tpl._id)" style="width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 4px;"></div>
          </div>
          <div class="plan-sprint-info">
            <span class="plan-sprint-name">{{ tpl.nombre }}</span>
            <span class="plan-sprint-skill">{{ tpl.habilidad }} · {{ tpl.nivelObjetivo | titlecase }}</span>
          </div>
          <div class="plan-sprint-stars">
            <span *ngFor="let s of [1,2,3,4,5]" [class.star-filled]="s <= tpl.dificultad" style="font-size: 10px;">★</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="tpl-form-actions">
      <button class="tpl-cancel" (click)="cerrarCrearPlan()">Cancelar</button>
      <button class="tpl-save" (click)="crearPlanManual()"
              [disabled]="!planManualForm.candidatoNombre || sprintsSeleccionados.length === 0 || creandoPlan">
        {{ creandoPlan ? 'Creando...' : 'Crear Plan (' + sprintsSeleccionados.length + ' sprints)' }}
      </button>
    </div>
  </div>
</div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    .ent-layout { display: flex; flex-direction: row; min-height: calc(100vh - 70px); width: 100%; background-color: transparent; gap: 40px; }
    @media (max-width: 1024px) { .ent-layout { flex-direction: column; gap: 20px; } }

    .ent-aside { width: 320px; flex-shrink: 0; }
    @media (max-width: 1024px) { .ent-aside { width: 100%; } }

    .ent-aside-card {
      background-color: #ffffff; border-radius: 24px; padding: 40px 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
      text-align: left; display: flex; flex-direction: column;
      position: sticky; top: 40px;
    }
    @media (max-width: 1024px) { .ent-aside-card { position: relative; top: 0; padding: 24px 20px; } }

    .ent-title { font-size: 34px; color: #2b3a4a; font-weight: 800; line-height: 1.1; }
    .ent-subtitle { font-size: 15px; color: #798d9f; line-height: 1.5; margin: 12px 0 24px 0; }

    .ent-stats { display: flex; gap: 10px; margin-bottom: 24px; }
    .stat-chip { flex: 1; text-align: center; padding: 12px 8px; border-radius: 14px; background: #f8fafc; }
    .stat-chip .stat-value { display: block; font-size: 22px; font-weight: 800; color: #1e293b; }
    .stat-chip .stat-label { display: block; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 2px; }
    .stat-progress { background: rgba(var(--accent-rgb, 14, 165, 233), 0.08); }
    .stat-progress .stat-value { color: var(--accent); }
    .stat-completed { background: rgba(16,185,129,0.08); }
    .stat-completed .stat-value { color: var(--accent); }

    .btn-pill-amber {
      width: 100%; padding: 16px 20px; background: linear-gradient(135deg, var(--accent), var(--accent));
      color: #ffffff; border-radius: 50px; border: none; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 20px rgba(var(--accent-rgb, 6, 182, 212), 0.25);
      display: flex; align-items: center; justify-content: center;
    }
    .btn-pill-amber:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(var(--accent-rgb, 6, 182, 212), 0.35); }

    .ent-select {
      width: 100%; padding: 10px 15px; border: 1px solid #d1d5db; border-radius: 8px;
      background-color: white; color: #374151; font-size: 14px; outline: none; cursor: pointer; appearance: auto;
    }

    /* Main */
    .ent-main { flex: 1; display: flex; flex-direction: column; }

    .search-and-toggles { position: relative; margin-bottom: 30px; display: flex; align-items: center; gap: 16px; }
    .search-bar-container { flex: 1; display: flex; align-items: center; position: relative; }
    .search-input {
      width: 100%; background-color: #ffffff; border: none; border-radius: 50px;
      padding: 18px 60px 18px 30px; font-size: 16px; color: #2b3a4a;
      box-shadow: 0 8px 25px rgba(0,0,0,0.03); outline: none; transition: box-shadow 0.3s ease;
    }
    .search-input:focus { box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .search-input::placeholder { color: #aeb9c3; }
    .search-btn {
      position: absolute; right: 15px; background: #2b3a4a; border: none; color: #ffffff;
      width: 44px; height: 44px; border-radius: 50%; display: flex; justify-content: center;
      align-items: center; cursor: pointer; transition: transform 0.2s ease;
    }
    .search-btn:hover { transform: scale(1.05); }
    .search-btn svg { width: 20px; height: 20px; }

    /* View Toggles */
    .view-toggles { display: flex; gap: 8px; background-color: #ffffff; padding: 10px 15px; border-radius: 50px; box-shadow: 0 8px 25px rgba(0,0,0,0.03); }
    .toggle-btn { background: transparent; border: none; color: #aeb9c3; padding: 8px 12px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
    .toggle-btn:hover { color: #2b3a4a; background-color: #f8fafc; }
    .toggle-btn.activo { background-color: #ecfeff; color: var(--accent); }
    .toggle-btn svg { width: 20px; height: 20px; }

    /* Skeleton */
    .skeleton-card { background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
    .skeleton-banner { height: 100px; background-color: #e2e8f0; }
    .skeleton-body { padding: 20px; }
    .skeleton-line { background-color: #e2e8f0; border-radius: 6px; }
    @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .skeleton-pulse { animation: skeletonPulse 1.5s ease-in-out infinite; }

    /* Empty state */
    .ent-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 30px; text-align: center;
      background: linear-gradient(135deg, rgba(var(--accent-rgb, 6, 182, 212), 0.03) 0%, rgba(8,145,178,0.05) 100%);
      border: 2px dashed #cbd5e1; border-radius: 20px; margin-top: 8px;
      animation: emptyFadeIn 0.6s ease-out;
    }
    .ent-empty h3 { margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #1e293b; }
    .ent-empty p { margin: 0 0 20px 0; font-size: 15px; color: #64748b; max-width: 450px; line-height: 1.6; }
    @keyframes emptyFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* Grid */
    .ent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; padding-bottom: 40px; }

    /* === MODO LISTA: Cards como filas horizontales compactas === */
    .ent-grid.modo-lista {
      display: flex !important; flex-direction: column !important;
      width: 100% !important; gap: 12px !important;
    }
    .ent-grid.modo-lista .ent-card {
      display: flex !important; flex-direction: row !important;
      align-items: center !important; width: 100% !important;
      height: 80px !important; min-height: 80px !important; max-height: 80px !important;
      padding: 0 20px !important; box-sizing: border-box !important;
      margin: 0 !important; border-radius: 16px !important;
    }
    .ent-grid.modo-lista .ent-card:hover {
      transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    }
    .ent-grid.modo-lista .ent-card-banner {
      flex: 0 0 48px !important; width: 48px !important; height: 48px !important;
      margin-right: 20px !important; border-radius: 12px !important;
      display: flex; justify-content: center; align-items: center;
    }
    .ent-grid.modo-lista .banner-icon { width: 24px; height: 24px; }
    .ent-grid.modo-lista .ent-card-estado { display: none; }
    .ent-grid.modo-lista .ent-card-body {
      display: flex !important; flex-direction: row !important;
      flex: 1 !important; justify-content: space-between !important;
      align-items: center !important; height: 100% !important;
      padding: 0 !important; gap: 16px !important;
    }
    .ent-grid.modo-lista .ent-card-title {
      font-size: 14px; margin: 0; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 240px;
    }
    .ent-grid.modo-lista .ent-card-desc,
    .ent-grid.modo-lista .ent-card-origin,
    .ent-grid.modo-lista .ent-card-candidate,
    .ent-grid.modo-lista .ent-card-areas,
    .ent-grid.modo-lista .progress-container { display: none !important; }
    .ent-grid.modo-lista .ent-card-score { display: flex; align-items: center; gap: 4px; }
    .ent-grid.modo-lista .ent-card-score .score-label { display: none; }
    .ent-grid.modo-lista .ent-card-actions {
      margin-top: 0 !important; padding-top: 0 !important; border-top: none !important;
      gap: 6px !important;
    }

    @keyframes cardSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .ent-card {
      background-color: #ffffff; border-radius: 20px; overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.02);
      display: flex; flex-direction: column;
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1);
      animation: cardSlideIn 0.5s ease-out both;
    }
    .ent-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.06), 0 5px 10px rgba(0,0,0,0.03); }

    .ent-card-banner {
      height: 100px; display: flex; justify-content: center; align-items: center; position: relative;
    }
    .banner-pendiente { background: linear-gradient(135deg, var(--accent), var(--accent)); }
    .banner-progreso { background: linear-gradient(135deg, var(--accent), var(--accent)); }
    .banner-completado { background: linear-gradient(135deg, var(--accent), var(--accent)); }

    .banner-icon { width: 50px; height: 50px; color: rgba(255,255,255,0.9); }

    .ent-card-estado { position: absolute; top: 12px; right: 12px; }
    .estado-badge {
      padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-pendiente { background: rgba(255,255,255,0.9); color: var(--accent); }
    .badge-progreso { background: rgba(255,255,255,0.9); color: var(--accent); }
    .badge-completado { background: rgba(255,255,255,0.9); color: var(--accent); }

    .ent-card-body { padding: 20px; display: flex; flex-direction: column; flex: 1; gap: 10px; }
    .ent-card-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ent-card-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .ent-card-origin, .ent-card-candidate { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; }
    .ent-card-score { display: flex; align-items: center; gap: 8px; }
    .score-label { font-size: 12px; color: #94a3b8; font-weight: 600; }
    .score-value { font-size: 14px; font-weight: 800; }
    .score-low { color: #ef4444; }
    .score-mid { color: var(--accent); }
    .score-high { color: var(--accent); }

    .ent-card-areas { display: flex; flex-wrap: wrap; gap: 6px; }
    .area-tag {
      font-size: 11px; padding: 3px 10px; border-radius: 50px; font-weight: 600;
      background: #ecfeff; color: #155e75; border: 1px solid #a5f3fc;
    }

    .progress-container { margin-top: 4px; }
    .progress-label { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .progress-label span { font-size: 11px; color: #94a3b8; font-weight: 600; }
    .progress-pct { color: #1e293b !important; font-weight: 800 !important; }
    .progress-bar-bg { width: 100%; height: 6px; border-radius: 3px; background: #f1f5f9; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
    .fill-pendiente { background: linear-gradient(90deg, var(--accent), var(--accent)); }
    .fill-progreso { background: linear-gradient(90deg, var(--accent), var(--accent)); }
    .fill-completado { background: linear-gradient(90deg, var(--accent), var(--accent)); }

    .ent-card-actions {
      display: flex; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9;
    }
    .action-btn-view, .action-btn-send {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 600;
      border: none; cursor: pointer; transition: all 0.2s ease;
    }
    .action-btn-view { background: #f8fafc; color: #475569; }
    .action-btn-view:hover { background: #e2e8f0; }
    .action-btn-send { background: rgba(var(--accent-rgb, 6, 182, 212), 0.1); color: var(--accent); }
    .action-btn-send:hover { background: rgba(var(--accent-rgb, 6, 182, 212), 0.2); }
    .action-btn-delete {
      flex: 0 0 40px; width: 40px; display: flex; align-items: center; justify-content: center;
      padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
      border: none; cursor: pointer; transition: all 0.2s ease;
      background: rgba(239,68,68,0.08); color: #ef4444;
    }
    .action-btn-delete:hover { background: rgba(239,68,68,0.18); }


    /* Dark mode support */
    :host-context(.dark-mode) .ent-aside-card { background-color: #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    :host-context(.dark-mode) .ent-title { color: #f1f5f9; }
    :host-context(.dark-mode) .ent-subtitle { color: #94a3b8; }
    :host-context(.dark-mode) .stat-chip { background: #0f172a; }
    :host-context(.dark-mode) .stat-chip .stat-value { color: #f1f5f9; }
    :host-context(.dark-mode) .ent-card { background-color: #1e293b; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
    :host-context(.dark-mode) .ent-card-title { color: #f1f5f9; }
    :host-context(.dark-mode) .ent-card-desc { color: #94a3b8; }
    :host-context(.dark-mode) .search-input { background-color: #1e293b; color: #f1f5f9; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    :host-context(.dark-mode) .ent-select { background-color: #0f172a; border-color: #334155; color: #e2e8f0; }

    /* ═══ DETAIL PANEL ═══ */
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .detail-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
      z-index: 1000; display: flex; justify-content: flex-end;
      animation: overlayIn 0.2s ease;
    }
    @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

    .detail-panel {
      width: 560px; max-width: 90vw; height: 100vh; background: #fff;
      overflow-y: auto; padding: 32px; position: relative;
      box-shadow: -10px 0 40px rgba(0,0,0,0.12);
      animation: panelSlideIn 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes panelSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .detail-close {
      position: absolute; top: 16px; right: 16px;
      background: #f1f5f9; border: none; border-radius: 10px;
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #64748b; transition: all 0.2s;
    }
    .detail-close:hover { background: #e2e8f0; color: #1e293b; }

    .detail-header {
      display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-right: 40px;
    }
    .detail-avatar {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent));
      color: white; font-size: 20px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .detail-nombre { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .detail-email { font-size: 12px; color: #94a3b8; margin: 2px 0 0 0; }
    .detail-badge {
      margin-left: auto; padding: 4px 14px; border-radius: 50px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .dbadge-activo { background: #ecfeff; color: var(--accent); }
    .dbadge-pausado { background: #fef3c7; color: var(--accent); }
    .dbadge-completado { background: #dcfce7; color: #16a34a; }

    .detail-info-strip {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
    }
    .info-chip {
      background: #f8fafc; border-radius: 12px; padding: 12px 8px; text-align: center;
      display: flex; flex-direction: column; gap: 2px;
    }
    .info-val { font-size: 20px; font-weight: 800; color: #0f172a; }
    .info-lbl { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; }

    .detail-progress-bg { width: 100%; height: 8px; border-radius: 4px; background: #f1f5f9; overflow: hidden; }
    .detail-progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent), var(--accent)); transition: width 0.6s; }

    .detail-section { margin-bottom: 24px; }
    .detail-section-title {
      font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;
    }
    .detail-section-title small { font-weight: 400; color: #94a3b8; }

    /* Dimensions */
    .dim-list { display: flex; flex-direction: column; gap: 10px; }
    .dim-item { }
    .dim-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .dim-name { font-size: 13px; font-weight: 500; color: #475569; }
    .dim-score { font-size: 13px; font-weight: 700; }
    .dim-low { color: #ef4444; }
    .dim-mid { color: var(--accent); }
    .dim-high { color: var(--accent); }
    .dim-bar-bg { height: 6px; border-radius: 3px; background: #f1f5f9; overflow: hidden; }
    .dim-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s; }
    .dim-fill-low { background: linear-gradient(90deg, #ef4444, #f87171); }
    .dim-fill-mid { background: linear-gradient(90deg, var(--accent), var(--accent)); }
    .dim-fill-high { background: linear-gradient(90deg, var(--accent), var(--accent)); }

    /* Sprint Timeline */
    .sprint-timeline { display: flex; flex-direction: column; }
    .sprint-row { display: flex; gap: 14px; }
    .sprint-indicator { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
    .sprint-dot {
      width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
      border: 3px solid #e2e8f0;
    }
    .dot-pendiente { border-color: #e2e8f0; background: #fff; }
    .dot-activo { border-color: var(--accent); background: var(--accent); box-shadow: 0 0 0 4px rgba(var(--accent-rgb, 6, 182, 212), 0.15); }
    .dot-completado { border-color: var(--accent); background: var(--accent); }
    .dot-omitido { border-color: var(--accent); background: #fef3c7; }
    .sprint-line { width: 2px; flex: 1; background: #e2e8f0; min-height: 20px; }
    .sprint-completado .sprint-line { background: var(--accent); }
    .sprint-activo .sprint-line { background: linear-gradient(180deg, var(--accent), #e2e8f0); }

    .sprint-content {
      flex: 1; padding-bottom: 18px;
    }
    .sprint-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .sprint-semana { font-size: 13px; font-weight: 700; color: #0f172a; }
    .sprint-estado-tag {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 50px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .tag-pendiente { background: #f1f5f9; color: #94a3b8; }
    .tag-activo { background: #ecfeff; color: var(--accent); }
    .tag-completado { background: #dcfce7; color: #16a34a; }
    .tag-omitido { background: #fef3c7; color: var(--accent); }
    .sprint-habilidad { font-size: 12px; color: #64748b; margin: 0 0 8px 0; }

    .sprint-days { display: flex; gap: 6px; flex-wrap: wrap; }
    .day-chip {
      display: flex; align-items: center; gap: 4px; padding: 3px 10px;
      border-radius: 50px; font-size: 10px; font-weight: 600;
      background: #f8fafc; color: #94a3b8; border: 1px solid #f1f5f9;
    }
    .day-done { background: #ecfdf5; color: var(--accent); border-color: #a7f3d0; }

    /* Emotional Sparkline */
    .emo-sparkline {
      display: flex; align-items: flex-end; gap: 3px; height: 80px;
      padding: 8px 0; border-bottom: 1px solid #f1f5f9;
    }
    .emo-bar {
      flex: 1; min-width: 8px; border-radius: 3px 3px 0 0;
      transition: height 0.4s; cursor: pointer;
    }
    .emo-low { background: #86efac; }
    .emo-mid { background: #fde68a; }
    .emo-high { background: #fca5a5; }
    .emo-scale {
      display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px;
    }

    /* Victories */
    .victory-list { display: flex; flex-direction: column; gap: 8px; }
    .victory-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: #fffbeb; border-radius: 10px; border: 1px solid #fde68a;
    }
    .victory-date { font-size: 11px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
    .victory-text { font-size: 13px; color: #475569; }

    /* Actions */
    .detail-actions {
      display: flex; gap: 10px; margin-top: 8px; padding-top: 20px; border-top: 1px solid #f1f5f9;
    }
    .dact-btn {
      flex: 1; padding: 12px; border-radius: 12px; border: none;
      font-size: 13px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s;
    }
    .dact-link { background: linear-gradient(135deg, var(--accent), var(--accent)); color: #fff; }
    .dact-link:hover { box-shadow: 0 4px 15px rgba(var(--accent-rgb, 6, 182, 212), 0.35); transform: translateY(-1px); }
    .dact-toggle { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .dact-toggle:hover { background: #e2e8f0; }

    /* Toast */
    .toast-success {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--accent); color: #fff; padding: 12px 24px; border-radius: 12px;
      font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(5,150,105,0.3);
      z-index: 2000; animation: toastIn 0.3s ease;
    }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    @media (max-width: 640px) {
      .detail-panel { width: 100vw; padding: 20px; }
      .detail-info-strip { grid-template-columns: repeat(2, 1fr); }
      .sprint-days { flex-direction: column; }
    }

    /* ═══ SIDEBAR BUTTON SECONDARY ═══ */
    .btn-pill-secondary {
      width: 100%; padding: 14px 20px; background: #f8fafc;
      color: #475569; border-radius: 50px; border: 1px solid #e2e8f0; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.3s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-pill-secondary:hover { background: #e2e8f0; color: #1e293b; }

    /* ═══ TEMPLATES MODAL ═══ */
    .templates-modal {
      width: 800px; max-width: 95vw; max-height: 90vh;
      background: #fff; border-radius: 24px; padding: 32px;
      overflow-y: auto; position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: modalScaleIn 0.3s cubic-bezier(0.4,0,0.2,1);
      margin: auto;
    }
    @keyframes modalScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    .tpl-header { margin-bottom: 24px; }
    .tpl-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .tpl-desc { font-size: 13px; color: #94a3b8; margin: 0 0 16px 0; }
    .tpl-add-btn {
      padding: 10px 20px; background: linear-gradient(135deg, var(--accent), var(--accent));
      color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .tpl-add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(var(--accent-rgb, 6, 182, 212), 0.3); }
    .tpl-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }

    .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .tpl-card {
      background: #f8fafc; border-radius: 16px; padding: 18px;
      border: 1px solid #e2e8f0; transition: all 0.2s;
    }
    .tpl-card:hover { border-color: var(--accent); box-shadow: 0 4px 15px rgba(var(--accent-rgb, 6, 182, 212), 0.08); }
    .tpl-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .tpl-nivel-tag {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 50px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .nivel-bajo { background: #fef2f2; color: #dc2626; }
    .nivel-medio { background: #fef3c7; color: var(--accent); }
    .nivel-alto { background: #dcfce7; color: #16a34a; }
    .tpl-diff { font-size: 12px; color: #e2e8f0; }
    .star-filled { color: var(--accent); }
    .tpl-card-name { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .tpl-card-skill { font-size: 12px; color: #64748b; margin: 0 0 10px 0; }
    .tpl-card-days { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .tpl-day { font-size: 11px; color: #94a3b8; }
    .tpl-day strong { color: #475569; }
    .tpl-card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .tpl-tag {
      font-size: 10px; padding: 2px 8px; border-radius: 50px;
      background: #ecfeff; color: var(--accent); font-weight: 600;
    }
    .tpl-card-actions { display: flex; gap: 6px; }
    .tpl-act {
      flex: 1; padding: 7px; border-radius: 8px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .tpl-act.edit { background: #f1f5f9; color: #475569; }
    .tpl-act.edit:hover { background: #e2e8f0; }
    .tpl-act.del { background: rgba(239,68,68,0.08); color: #ef4444; }
    .tpl-act.del:hover { background: rgba(239,68,68,0.15); }

    /* Form */
    .tpl-form { animation: modalScaleIn 0.2s ease; }
    .tpl-form-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 20px 0; }
    .tpl-form-subtitle { font-size: 13px; font-weight: 700; color: var(--accent); margin: 20px 0 10px 0; }
    .tpl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .tpl-field { display: flex; flex-direction: column; gap: 4px; }
    .tpl-field.full { grid-column: 1 / -1; }
    .tpl-field label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
    .tpl-field input, .tpl-field select, .tpl-field textarea {
      padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px;
      font-size: 14px; color: #1e293b; background: #fff; outline: none;
      transition: border 0.2s; font-family: inherit; resize: vertical;
    }
    .tpl-field input:focus, .tpl-field select:focus, .tpl-field textarea:focus { border-color: var(--accent); }
    .tpl-form-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }
    .tpl-cancel {
      padding: 12px 24px; background: #f1f5f9; color: #475569; border: none;
      border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .tpl-cancel:hover { background: #e2e8f0; }
    .tpl-save {
      padding: 12px 28px; background: linear-gradient(135deg, var(--accent), var(--accent));
      color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
    }
    .tpl-save:hover { box-shadow: 0 4px 15px rgba(var(--accent-rgb, 6, 182, 212), 0.3); transform: translateY(-1px); }
    .tpl-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    @media (max-width: 640px) {
      .templates-modal { padding: 20px; }
      .tpl-grid { grid-template-columns: 1fr; }
      .tpl-form-grid { grid-template-columns: 1fr; }
    }

    /* ═══ PLAN MANUAL MODAL ═══ */
    .plan-step { margin-bottom: 24px; }
    .plan-step-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0;
    }
    .plan-step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent));
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; flex-shrink: 0;
    }
    .plan-selected-count {
      margin-left: auto; font-size: 12px; font-weight: 600;
      color: var(--accent); background: #ecfeff; padding: 3px 12px; border-radius: 50px;
    }

    .plan-sprint-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
    .plan-sprint-item {
      display: flex; align-items: center; gap: 14px; padding: 12px 16px;
      background: #f8fafc; border-radius: 12px; border: 2px solid #e2e8f0;
      cursor: pointer; transition: all 0.2s;
    }
    .plan-sprint-item:hover { border-color: #cbd5e1; background: #f1f5f9; }
    .plan-sprint-item.sprint-selected { border-color: var(--accent); background: #ecfeff; }
    .plan-sprint-check { flex-shrink: 0; }
    .plan-sprint-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .plan-sprint-name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .plan-sprint-skill { font-size: 11px; color: #64748b; }
    .plan-sprint-stars { flex-shrink: 0; color: #e2e8f0; font-size: 10px; }
  `]
})
export class AdminEntrenamientosComponent implements OnInit {
  planes: PlanEntrenamiento[] = [];
  loading = true;
  searchTerm = '';
  filtroEstado = '';
  vistaActual: 'cuadricula' | 'lista' = 'cuadricula';
  planSeleccionado: PlanEntrenamiento | null = null;
  planDetalle: PlanEntrenamiento | null = null;
  loadingDetalle = false;
  mensajeExito = '';

  // Templates library
  mostrarBiblioteca = false;
  templates: any[] = [];
  loadingTemplates = false;
  editandoTemplate = false;
  templateForm: any = {
    _id: null, nombre: '', habilidad: '', descripcion: '', nivelObjetivo: 'bajo', dificultad: 2,
    contenidoInspiracion: { tipo: 'texto', titulo: '', contenido: '', duracionMinutos: 2 },
    microAccion: { instruccion: '', ejemplo: '', contexto: '' },
    checkInPregunta: '¿Lograste aplicar la micro-acción esta semana?', tagsInput: '', tags: [] as string[]
  };

  // Plan manual
  mostrarCrearPlan = false;
  planManualForm = {
    candidatoNombre: '', candidatoEmail: '', origenTipo: 'manual',
    origenNombre: '', puntajeBase: 50
  };
  sprintsSeleccionados: string[] = [];
  templatesPlan: any[] = [];
  loadingTemplatesPlan = false;
  creandoPlan = false;

  // JSON Import
  mostrarImportJSON = false;
  importJsonText = '';
  importPreview: any = null;
  importJsonError = '';
  importandoJSON = false;
  esSuperAdmin = false;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.cargarPlanes();
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.esSuperAdmin = (user.rol || '').toLowerCase().includes('super administrador');
    } catch { this.esSuperAdmin = false; }
  }

  cargarPlanes() {
    this.loading = true;
    this.http.get<{ status: string; data: PlanEntrenamiento[] }>('/api/entrenamientos').subscribe({
      next: (res) => {
        this.planes = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('[Entrenamientos] Error cargando planes:', err);
        this.planes = [];
        this.loading = false;
      }
    });
  }

  get planesEnProgreso(): number {
    return this.planes.filter(p => p.estado === 'activo').length;
  }

  get planesCompletados(): number {
    return this.planes.filter(p => p.estado === 'completado').length;
  }

  get planesFiltrados(): PlanEntrenamiento[] {
    return this.planes.filter(p => {
      const matchSearch = !this.searchTerm ||
        p.candidatoNombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.origenNombre || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.dimensionesDetectadas || []).some(d => d.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()));
      const matchEstado = !this.filtroEstado || p.estado === this.filtroEstado;
      return matchSearch && matchEstado;
    });
  }

  getSprintsCompletados(plan: PlanEntrenamiento): number {
    return (plan.sprints || []).filter(s => s.estado === 'completado').length;
  }

  generarPlanManual() {
    this.mostrarCrearPlan = true;
    this.sprintsSeleccionados = [];
    this.planManualForm = {
      candidatoNombre: '', candidatoEmail: '', origenTipo: 'manual',
      origenNombre: '', puntajeBase: 50
    };
    this.loadingTemplatesPlan = true;
    this.http.get<{ status: string; data: any[] }>('/api/entrenamientos/templates/all').subscribe({
      next: (res) => {
        this.templatesPlan = res.data || [];
        this.loadingTemplatesPlan = false;
      },
      error: () => {
        this.templatesPlan = [];
        this.loadingTemplatesPlan = false;
      }
    });
  }

  cerrarCrearPlan() {
    this.mostrarCrearPlan = false;
  }

  isSprintSelected(id: string): boolean {
    return this.sprintsSeleccionados.includes(id);
  }

  toggleSprintSelection(tpl: any) {
    const idx = this.sprintsSeleccionados.indexOf(tpl._id);
    if (idx === -1) {
      this.sprintsSeleccionados.push(tpl._id);
    } else {
      this.sprintsSeleccionados.splice(idx, 1);
    }
  }

  crearPlanManual() {
    if (!this.planManualForm.candidatoNombre || this.sprintsSeleccionados.length === 0) return;
    this.creandoPlan = true;

    // Build sprints from selected templates
    const sprints = this.sprintsSeleccionados.map((id, i) => {
      const tpl = this.templatesPlan.find((t: any) => t._id === id);
      return {
        semana: i + 1,
        habilidad: tpl?.habilidad || 'General',
        sprintTemplateId: id,
        estado: i === 0 ? 'activo' : 'pendiente',
        diaInspiracion: {
          contenido: tpl?.contenidoInspiracion?.contenido || '',
          tipo: tpl?.contenidoInspiracion?.tipo || 'texto',
          completado: false
        },
        diaMicroAccion: {
          instruccion: tpl?.microAccion?.instruccion || '',
          completado: false
        },
        diaCheckIn: {
          respuesta: null
        }
      };
    });

    const planData = {
      candidatoNombre: this.planManualForm.candidatoNombre,
      candidatoEmail: this.planManualForm.candidatoEmail,
      origenTipo: this.planManualForm.origenTipo,
      origenNombre: this.planManualForm.origenNombre || 'Plan manual',
      puntajeBase: this.planManualForm.puntajeBase || 50,
      sprints,
      estado: 'activo',
      progreso: 0,
      dimensionesDetectadas: []
    };

    this.http.post<{ status: string; data: any }>('/api/entrenamientos', planData).subscribe({
      next: (res) => {
        this.creandoPlan = false;
        this.mostrarCrearPlan = false;
        this.mensajeExito = `Plan creado para ${this.planManualForm.candidatoNombre}`;
        setTimeout(() => this.mensajeExito = '', 3000);
        this.cargarPlanes(); // Refresh list
      },
      error: (err) => {
        this.creandoPlan = false;
        console.error('Error creando plan:', err);
        alert('Error al crear el plan de entrenamiento');
      }
    });
  }

  verDetalle(plan: PlanEntrenamiento) {
    this.planSeleccionado = plan;
    this.loadingDetalle = true;
    this.planDetalle = null;

    // Fetch full detail with all sub-documents
    this.http.get<{ status: string; data: PlanEntrenamiento }>(`/api/entrenamientos/${plan._id}`).subscribe({
      next: (res) => {
        this.planDetalle = res.data;
        this.loadingDetalle = false;
      },
      error: () => {
        // Fallback: use the plan from the list (without full detail)
        this.planDetalle = plan;
        this.loadingDetalle = false;
      }
    });
  }

  cerrarDetalle() {
    this.planSeleccionado = null;
    this.planDetalle = null;
  }

  copiarEnlace(plan: PlanEntrenamiento) {
    if (!plan.tokenAcceso) {
      alert('Este plan no tiene token de acceso público');
      return;
    }
    const url = `${window.location.origin}/entrenamiento/${plan.tokenAcceso}`;
    navigator.clipboard.writeText(url).then(() => {
      this.mensajeExito = `Enlace copiado para ${plan.candidatoNombre}`;
      setTimeout(() => this.mensajeExito = '', 3000);
    }).catch(() => {
      prompt('Copia este enlace:', url);
    });
  }

  eliminarPlan(plan: PlanEntrenamiento) {
    if (!confirm(`¿Eliminar el plan de ${plan.candidatoNombre}?`)) return;
    this.http.delete(`/api/entrenamientos/${plan._id}`).subscribe({
      next: () => {
        this.planes = this.planes.filter(p => p._id !== plan._id);
        this.mensajeExito = 'Plan eliminado';
        setTimeout(() => this.mensajeExito = '', 3000);
        if (this.planSeleccionado?._id === plan._id) this.cerrarDetalle();
      },
      error: (err) => {
        console.error('Error eliminando:', err);
        alert('Error al eliminar el plan');
      }
    });
  }

  toggleEstado(plan: PlanEntrenamiento) {
    if (plan.estado === 'completado') return;
    const nuevoEstado = plan.estado === 'activo' ? 'pausado' : 'activo';
    this.http.put<{ status: string; data: PlanEntrenamiento }>(`/api/entrenamientos/${plan._id}`, { estado: nuevoEstado }).subscribe({
      next: (res) => {
        if (this.planDetalle) this.planDetalle.estado = nuevoEstado;
        const idx = this.planes.findIndex(p => p._id === plan._id);
        if (idx !== -1) this.planes[idx].estado = nuevoEstado;
        this.mensajeExito = `Plan ${nuevoEstado === 'activo' ? 'reactivado' : 'pausado'}`;
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: () => alert('Error al cambiar estado')
    });
  }

  cambiarVista(vista: 'cuadricula' | 'lista') {
    this.vistaActual = vista;
  }

  // ═══ TEMPLATES LIBRARY ═══

  getTemplateFormVacio() {
    return {
      _id: null, nombre: '', habilidad: '', descripcion: '', nivelObjetivo: 'bajo', dificultad: 2,
      contenidoInspiracion: { tipo: 'texto', titulo: '', contenido: '', duracionMinutos: 2 },
      microAccion: { instruccion: '', ejemplo: '', contexto: '' },
      checkInPregunta: '¿Lograste aplicar la micro-acción esta semana?', tagsInput: '', tags: [] as string[]
    };
  }

  abrirBiblioteca() {
    this.mostrarBiblioteca = true;
    this.editandoTemplate = false;
    this.cargarTemplates();
  }

  cerrarBiblioteca() {
    this.mostrarBiblioteca = false;
    this.editandoTemplate = false;
  }

  cargarTemplates() {
    this.loadingTemplates = true;
    this.http.get<{ status: string; data: any[] }>('/api/entrenamientos/templates/all').subscribe({
      next: (res) => {
        this.templates = res.data || [];
        this.loadingTemplates = false;
      },
      error: () => {
        this.templates = [];
        this.loadingTemplates = false;
      }
    });
  }

  nuevoTemplate() {
    this.templateForm = this.getTemplateFormVacio();
    this.editandoTemplate = true;
  }

  editarTemplate(tpl: any) {
    this.templateForm = {
      _id: tpl._id,
      nombre: tpl.nombre || '',
      habilidad: tpl.habilidad || '',
      descripcion: tpl.descripcion || '',
      nivelObjetivo: tpl.nivelObjetivo || 'bajo',
      dificultad: tpl.dificultad || 2,
      contenidoInspiracion: {
        tipo: tpl.contenidoInspiracion?.tipo || 'texto',
        titulo: tpl.contenidoInspiracion?.titulo || '',
        contenido: tpl.contenidoInspiracion?.contenido || '',
        duracionMinutos: tpl.contenidoInspiracion?.duracionMinutos || 2
      },
      microAccion: {
        instruccion: tpl.microAccion?.instruccion || '',
        ejemplo: tpl.microAccion?.ejemplo || '',
        contexto: tpl.microAccion?.contexto || ''
      },
      checkInPregunta: tpl.checkInPregunta || '',
      tagsInput: (tpl.tags || []).join(', '),
      tags: tpl.tags || []
    };
    this.editandoTemplate = true;
  }

  cancelarEdicion() {
    this.editandoTemplate = false;
    this.templateForm = this.getTemplateFormVacio();
  }

  guardarTemplate() {
    const data = { ...this.templateForm };
    data.tags = (data.tagsInput || '').split(',').map((t: string) => t.trim()).filter((t: string) => t);
    delete data.tagsInput;
    const id = data._id;
    delete data._id;

    if (id) {
      this.http.put(`/api/entrenamientos/templates/${id}`, data).subscribe({
        next: () => {
          this.mensajeExito = 'Template actualizado';
          setTimeout(() => this.mensajeExito = '', 3000);
          this.editandoTemplate = false;
          this.cargarTemplates();
        },
        error: () => alert('Error al actualizar template')
      });
    } else {
      this.http.post('/api/entrenamientos/templates', data).subscribe({
        next: () => {
          this.mensajeExito = 'Template creado';
          setTimeout(() => this.mensajeExito = '', 3000);
          this.editandoTemplate = false;
          this.cargarTemplates();
        },
        error: () => alert('Error al crear template')
      });
    }
  }

  eliminarTemplate(tpl: any) {
    if (!confirm(`¿Eliminar el template "${tpl.nombre}"?`)) return;
    this.http.delete(`/api/entrenamientos/templates/${tpl._id}`).subscribe({
      next: () => {
        this.templates = this.templates.filter((t: any) => t._id !== tpl._id);
        this.mensajeExito = 'Template eliminado';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: () => alert('Error al eliminar')
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // JSON IMPORT (from Gemini)
  // ═══════════════════════════════════════════════════════════════

  validarImportJSON() {
    this.importJsonError = '';
    this.importPreview = null;
    try {
      const parsed = JSON.parse(this.importJsonText);
      if (!parsed.template) {
        this.importJsonError = 'El JSON no contiene la clave "template". Asegúrate de pegar el JSON completo de Gemini.';
        return;
      }
      if (!parsed.template.nombre || !parsed.template.habilidad) {
        this.importJsonError = 'El template debe tener al menos "nombre" y "habilidad".';
        return;
      }
      if (!parsed.entrenamiento) {
        // Auto-generate entrenamiento data if missing
        parsed.entrenamiento = {
          candidatoNombre: `Demo — ${parsed.template.habilidad}`,
          candidatoEmail: 'demo@testea.pro',
          origenTipo: 'manual',
          origenNombre: `IA — ${parsed.template.habilidad}`,
          puntajeBase: 40
        };
      }
      this.importPreview = parsed;
    } catch (e: any) {
      this.importJsonError = `JSON inválido: ${e.message}. Verifica que sea un JSON válido.`;
    }
  }

  ejecutarImportJSON() {
    if (!this.importPreview) return;
    this.importandoJSON = true;
    this.importJsonError = '';

    const tplData = this.importPreview.template;
    const entData = this.importPreview.entrenamiento;

    // Step 1: Create SprintTemplate
    this.http.post<any>('/api/entrenamientos/templates', tplData).subscribe({
      next: (tplRes) => {
        const templateId = tplRes.data?._id || tplRes._id;
        const nivel = tplData.nivelObjetivo || 'bajo';

        // Step 2: Create Entrenamiento
        const planData = {
          candidatoNombre: entData.candidatoNombre || `Demo — ${tplData.habilidad}`,
          candidatoEmail: entData.candidatoEmail || 'demo@testea.pro',
          origenTipo: entData.origenTipo || 'manual',
          origenNombre: entData.origenNombre || `IA — ${tplData.habilidad}`,
          puntajeBase: entData.puntajeBase || 40,
          dimensionesDetectadas: [{
            nombre: tplData.habilidad,
            puntaje: entData.puntajeBase || 40,
            nivel: nivel,
            sprintAsignado: templateId
          }],
          sprints: [{
            semana: 1,
            habilidad: tplData.habilidad,
            sprintTemplateId: templateId,
            estado: 'activo',
            fechaInicio: new Date().toISOString(),
            diaInspiracion: {
              contenido: tplData.contenidoInspiracion?.contenido || '',
              tipo: tplData.contenidoInspiracion?.tipo || 'texto',
              completado: false
            },
            diaMicroAccion: {
              instruccion: tplData.microAccion?.instruccion || '',
              completado: false
            },
            diaCheckIn: { respuesta: null }
          }],
          estado: 'activo',
          progreso: 0
        };

        this.http.post<any>('/api/entrenamientos', planData).subscribe({
          next: (entRes) => {
            const plan = entRes.data || entRes;
            this.importandoJSON = false;
            this.mostrarImportJSON = false;
            this.importJsonText = '';
            this.importPreview = null;

            // Refresh lists
            this.cargarPlanes();
            if (this.mostrarBiblioteca) this.cargarTemplates();

            this.mensajeExito = `✅ Importado: "${tplData.nombre}" — Token: ${plan.tokenAcceso}`;
            setTimeout(() => this.mensajeExito = '', 8000);
          },
          error: (err) => {
            this.importandoJSON = false;
            this.importJsonError = `Error creando el plan: ${err.error?.message || err.message}`;
          }
        });
      },
      error: (err) => {
        this.importandoJSON = false;
        this.importJsonError = `Error creando el template: ${err.error?.message || err.message}`;
      }
    });
  }
}
