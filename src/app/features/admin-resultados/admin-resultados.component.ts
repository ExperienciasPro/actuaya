import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BateriasDataService } from '../../shared/services/baterias-data.service';
import { SimuladorDataService } from '../../shared/services/simulador-data.service';
import { EncuestasDataService } from '../../shared/services/encuestas-data.service';
import { BitacorasDataService } from '../../shared/services/bitacoras-data.service';
import { EntrenamientosDataService } from '../../shared/services/entrenamientos-data.service';
import { ToastService } from '../../shared/services/toast.service';

interface ResultadoItem {
  id: string;
  fecha: string;
  nombreUsuario: string;
  nombreTest: string;
  puntaje: number;
  resultado?: string;
  tipo?: string;
}

interface TestAgrupadoItem {
  id: string;
  nombre: string;
  totalEvaluados: number;
  colorClass: string;
  activo: boolean;
  tipo: 'Test' | 'Batería';
  creado_por?: string;
  fechaAlta?: string;
}

@Component({
  selector: 'app-admin-resultados',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="test-layout-wrapper flex-col" style="padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Encabezado Estilo ActuaYa -->
      <header *ngIf="!vistaDetalleGenerico" style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 6px;">
              <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(81,182,165,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#51B6A5" stroke-width="2" style="width: 22px; height: 22px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <h1 style="font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.02em;">Módulo Base de Datos</h1>
            </div>
            <p style="color: #64748b; margin: 0; font-size: 0.95rem;">Visualiza y exporta los datos crudos de las pruebas aplicadas.</p>
          </div>
        </div>

        <div class="menu-tabs horizontal-tabs" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
           <button class="btn-menu-tab" [class.active-tab]="activeTab === 'tests'" (click)="cambiarTab('tests')" style="display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 50px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 14px; color: #475569;" onmouseover="if(!this.classList.contains('active-tab')) this.style.borderColor='#cbd5e1'" onmouseout="if(!this.classList.contains('active-tab')) this.style.borderColor='#e2e8f0'">
             <span class="tab-icon tab-icon-teal" style="display: flex; width: 18px; height: 18px; color: #51B6A5;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             </span>
             <span class="tab-label">Evaluaciones</span>
           </button>
           <button class="btn-menu-tab" [class.active-tab]="activeTab === 'encuestas'" (click)="cambiarTab('encuestas')" style="display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 50px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 14px; color: #475569;" onmouseover="if(!this.classList.contains('active-tab')) this.style.borderColor='#cbd5e1'" onmouseout="if(!this.classList.contains('active-tab')) this.style.borderColor='#e2e8f0'">
             <span class="tab-icon tab-icon-purple" style="display: flex; width: 18px; height: 18px; color: var(--accent);">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
             </span>
             <span class="tab-label">Formularios</span>
           </button>
        </div>
      </header>

      <main class="main-content-area w-full overflow-hidden" style="flex: 1;">

        <!-- ===================== CONTENIDO NORMAL (TABS) ===================== -->
        <div *ngIf="!vistaDetalleGenerico">

        <!-- STATS CARDS + REFRESH -->
        <div class="stats-header">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon stat-icon-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ statsInstrumentos }}</span>
                <span class="stat-label">Instrumentos</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ statsEvaluados }}</span>
                <span class="stat-label">Evaluados</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon-amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ statsPromedio }}<small style="font-size: 12px; color: #94a3b8;">/100</small></span>
                <span class="stat-label">Promedio</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="stat-info">
                <span class="stat-value stat-value-sm">{{ statsUltimoEnvio }}</span>
                <span class="stat-label">Último envío</span>
              </div>
            </div>
          </div>
          <div class="refresh-row">
            <span class="last-updated" *ngIf="ultimaActualizacion">Actualizado {{ tiempoDesdeActualizacion }}</span>
            <button class="btn-cleanup-toggle" (click)="toggleCleanupPanel()" [class.active]="showCleanupPanel" title="Limpieza de datos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              Limpieza
            </button>
            <button class="btn-pro-toggle" (click)="toggleProPanel()" [class.active]="showProPanel" title="Herramientas Pro">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Pro
            </button>
            <button class="btn-refresh" (click)="refrescarDatos()" [class.refreshing]="cargandoDatos" [disabled]="cargandoDatos" title="Refrescar datos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              {{ cargandoDatos ? 'Cargando...' : 'Refrescar' }}
            </button>
          </div>

          <!-- PANEL DE LIMPIEZA DE DATOS -->
          <div class="cleanup-panel" *ngIf="showCleanupPanel">
            <div class="cleanup-header">
              <div>
                <h3 class="cleanup-title">🧹 Limpieza de Datos</h3>
                <p class="cleanup-desc">Analiza y limpia registros innecesarios de la base de datos.</p>
              </div>
              <button class="btn-analyze" (click)="analizarLimpieza()" [disabled]="analizandoLimpieza">
                <svg *ngIf="!analizandoLimpieza" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <svg *ngIf="analizandoLimpieza" class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                {{ analizandoLimpieza ? 'Analizando...' : 'Analizar Base de Datos' }}
              </button>
            </div>

            <div class="cleanup-grid" *ngIf="cleanupAnalysis">
              <!-- Tool 1: Respuestas Incompletas -->
              <div class="cleanup-card" [class.has-items]="cleanupAnalysis.incomplete > 0">
                <div class="cleanup-card-icon cleanup-icon-orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div class="cleanup-card-info">
                  <span class="cleanup-card-title">Respuestas Incompletas</span>
                  <span class="cleanup-card-desc">Evaluaciones abandonadas o sin datos.</span>
                  <span class="cleanup-card-count" [class.zero]="cleanupAnalysis.incomplete === 0">
                    {{ cleanupAnalysis.incomplete }} registro(s)
                  </span>
                </div>
                <button class="btn-cleanup-action" [disabled]="cleanupAnalysis.incomplete === 0 || ejecutandoLimpieza" (click)="confirmarLimpieza('incomplete', 'Respuestas Incompletas', cleanupAnalysis.incomplete)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                  Limpiar
                </button>
              </div>

              <!-- Tool 2: Duplicados -->
              <div class="cleanup-card" [class.has-items]="cleanupAnalysis.duplicates > 0">
                <div class="cleanup-card-icon cleanup-icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </div>
                <div class="cleanup-card-info">
                  <span class="cleanup-card-title">Respuestas Duplicadas</span>
                  <span class="cleanup-card-desc">Mismo candidato + mismo test. Conserva la más reciente.</span>
                  <span class="cleanup-card-count" [class.zero]="cleanupAnalysis.duplicates === 0">
                    {{ cleanupAnalysis.duplicates }} registro(s)
                  </span>
                </div>
                <button class="btn-cleanup-action" [disabled]="cleanupAnalysis.duplicates === 0 || ejecutandoLimpieza" (click)="confirmarLimpieza('duplicates', 'Duplicados', cleanupAnalysis.duplicates)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                  Limpiar
                </button>
              </div>

              <!-- Tool 3: Datos Antiguos -->
              <div class="cleanup-card" [class.has-items]="cleanupAnalysis.oldData > 0">
                <div class="cleanup-card-icon cleanup-icon-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div class="cleanup-card-info">
                  <span class="cleanup-card-title">Datos Antiguos</span>
                  <span class="cleanup-card-desc">Respuestas anteriores a la fecha seleccionada.</span>
                  <div class="cleanup-date-row">
                    <input type="date" class="cleanup-date-input" [value]="cleanupCutoffDate" (change)="onCutoffDateChange($event)" />
                    <button class="btn-reanalyze" (click)="analizarLimpieza()" title="Re-analizar con esta fecha">↻</button>
                  </div>
                  <span class="cleanup-card-count" [class.zero]="cleanupAnalysis.oldData === 0">
                    {{ cleanupAnalysis.oldData }} registro(s)
                  </span>
                </div>
                <button class="btn-cleanup-action" [disabled]="cleanupAnalysis.oldData === 0 || ejecutandoLimpieza" (click)="confirmarLimpieza('old-data', 'Datos Anteriores a ' + cleanupCutoffDate, cleanupAnalysis.oldData)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                  Limpiar
                </button>
              </div>

              <!-- Tool 4: Datos de Prueba -->
              <div class="cleanup-card" [class.has-items]="cleanupAnalysis.testData > 0">
                <div class="cleanup-card-icon cleanup-icon-red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                </div>
                <div class="cleanup-card-info">
                  <span class="cleanup-card-title">Datos de Prueba / Admin</span>
                  <span class="cleanup-card-desc">Respuestas de prueba hechas durante configuración.</span>
                  <span class="cleanup-card-count" [class.zero]="cleanupAnalysis.testData === 0">
                    {{ cleanupAnalysis.testData }} registro(s)
                  </span>
                </div>
                <button class="btn-cleanup-action" [disabled]="cleanupAnalysis.testData === 0 || ejecutandoLimpieza" (click)="confirmarLimpieza('test-data', 'Datos de Prueba', cleanupAnalysis.testData)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <!-- MODAL CONFIRMAR LIMPIEZA -->
          <div class="cleanup-confirm-overlay" *ngIf="showCleanupConfirm" (click)="cancelarLimpieza()">
            <div class="cleanup-confirm-modal" (click)="$event.stopPropagation()">
              <div class="cleanup-confirm-icon">⚠️</div>
              <h3>Confirmar Limpieza</h3>
              <p>Se eliminarán <strong>{{ cleanupConfirmCount }}</strong> registro(s) de <strong>{{ cleanupConfirmLabel }}</strong>.</p>
              <p class="cleanup-warning">Esta acción no se puede deshacer.</p>
              <div class="cleanup-confirm-actions">
                <button class="btn-cancel-cleanup" (click)="cancelarLimpieza()">Cancelar</button>
                <button class="btn-confirm-cleanup" (click)="ejecutarLimpieza()" [disabled]="ejecutandoLimpieza">
                  {{ ejecutandoLimpieza ? 'Eliminando...' : 'Sí, eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PRO TOOLS PANEL -->
        <div class="pro-panel" *ngIf="showProPanel">
          <div class="pro-panel-header">
            <h3 class="pro-panel-title">⚡ Herramientas Pro</h3>
            <p class="pro-panel-desc">Análisis avanzado y gestión profesional de datos.</p>
          </div>

          <!-- Pro Accordion Sections -->
          <div class="pro-sections">

            <!-- 3.1 Data Quality Score -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="toggleProSection('quality')">
                <span class="pro-section-icon" style="background:rgba(34,197,94,0.1);color:#22c55e;">🧮</span>
                <span class="pro-section-label">Calidad de Datos</span>
                <span class="pro-section-badge" *ngIf="proQuality">Score: {{ proQuality.scoreGlobal }}/100</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'quality'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'quality'">
                <div *ngIf="proLoadingQuality" class="pro-loading">Analizando calidad...</div>
                <div *ngIf="proQuality && !proLoadingQuality" class="quality-grid">
                  <div class="quality-gauge">
                    <div class="gauge-circle" [style.border-color]="proQuality.scoreGlobal >= 80 ? '#22c55e' : proQuality.scoreGlobal >= 50 ? 'var(--accent)' : '#ef4444'">
                      <span class="gauge-value">{{ proQuality.scoreGlobal }}</span>
                      <span class="gauge-label">/ 100</span>
                    </div>
                    <span class="gauge-subtitle">Score Global</span>
                  </div>
                  <div class="quality-metrics">
                    <div class="quality-metric">
                      <span class="qm-label">Tasa de Completitud</span>
                      <div class="qm-bar"><div class="qm-fill" [style.width.%]="proQuality.tasaCompletitud" [style.background]="proQuality.tasaCompletitud >= 80 ? '#22c55e' : 'var(--accent)'"></div></div>
                      <span class="qm-value">{{ proQuality.tasaCompletitud }}%</span>
                    </div>
                    <div class="quality-metric">
                      <span class="qm-label">Puntaje Promedio</span>
                      <div class="qm-bar"><div class="qm-fill" [style.width.%]="proQuality.puntajePromedio" style="background:var(--accent);"></div></div>
                      <span class="qm-value">{{ proQuality.puntajePromedio }} (σ {{ proQuality.puntajeStdDev }})</span>
                    </div>
                    <div class="quality-metric">
                      <span class="qm-label">Tiempo Promedio</span>
                      <span class="qm-value" style="margin-top:4px;">{{ formatTiempo(proQuality.tiempoPromedio) }} (σ {{ formatTiempo(proQuality.tiempoStdDev) }})</span>
                    </div>
                    <div class="quality-metric">
                      <span class="qm-label">Rango de Puntajes</span>
                      <span class="qm-value" style="margin-top:4px;">{{ proQuality.puntajeMin }} — {{ proQuality.puntajeMax }} (de {{ proQuality.registrosConPuntaje }} registros)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3.2 Anomaly Detection -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="toggleProSection('anomalies')">
                <span class="pro-section-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;">🕵️</span>
                <span class="pro-section-label">Detección de Anomalías</span>
                <span class="pro-section-badge warning" *ngIf="proAnomalies">{{ proAnomalies.totalAnomalias }} encontrada(s)</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'anomalies'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'anomalies'">
                <div *ngIf="proLoadingAnomalies" class="pro-loading">Buscando anomalías...</div>
                <div *ngIf="proAnomalies && !proLoadingAnomalies">
                  <div class="anomaly-stats" *ngIf="proAnomalies.stats">
                    <span>Puntaje normal: <strong>{{ proAnomalies.stats.rangoNormal.min }} — {{ proAnomalies.stats.rangoNormal.max }}</strong></span>
                    <span *ngIf="proAnomalies.stats.umbralRapido > 0">Tiempo sospechoso: <strong>&lt; {{ formatTiempo(proAnomalies.stats.umbralRapido) }}</strong></span>
                  </div>
                  <div *ngIf="proAnomalies.rapidas.length > 0" class="anomaly-group">
                    <h4>⏱ Respuestas Rápidas ({{ proAnomalies.rapidas.length }})</h4>
                    <div class="anomaly-table">
                      <div class="anomaly-row anomaly-header"><span>Candidato</span><span>Puntaje</span><span>Tiempo</span></div>
                      <div class="anomaly-row" *ngFor="let a of proAnomalies.rapidas.slice(0, 10)">
                        <span>{{ a.nombre || a.correo }}</span>
                        <span>{{ a.puntaje || '—' }}</span>
                        <span class="text-red">{{ formatTiempo(a.tiempo) }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="proAnomalies.outliers.length > 0" class="anomaly-group">
                    <h4>📊 Outliers Estadísticos ({{ proAnomalies.outliers.length }})</h4>
                    <div class="anomaly-table">
                      <div class="anomaly-row anomaly-header"><span>Candidato</span><span>Puntaje</span><span>Fecha</span></div>
                      <div class="anomaly-row" *ngFor="let a of proAnomalies.outliers.slice(0, 10)">
                        <span>{{ a.nombre || a.correo }}</span>
                        <span class="text-red">{{ a.puntaje }}</span>
                        <span>{{ a.fecha | date:'dd/MM/yy' }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="proAnomalies.totalAnomalias === 0" class="pro-empty">✅ No se detectaron anomalías.</div>
                </div>
              </div>
            </div>

            <!-- 3.3 Trends -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="toggleProSection('trends')">
                <span class="pro-section-icon" style="background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent);">📈</span>
                <span class="pro-section-label">Tendencias y Series Temporales</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'trends'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'trends'">
                <div *ngIf="proLoadingTrends" class="pro-loading">Calculando tendencias...</div>
                <div *ngIf="proTrends && !proLoadingTrends">
                  <div *ngIf="proTrends.porMes.length > 0" class="trend-section">
                    <h4>Volumen Mensual</h4>
                    <div class="chart-bars">
                      <div class="chart-bar-item" *ngFor="let m of proTrends.porMes">
                        <div class="chart-bar" [style.height.%]="getBarHeight(m.count, proTrends.porMes)" style="background: linear-gradient(180deg, var(--accent), var(--accent));"></div>
                        <span class="chart-bar-value">{{ m.count }}</span>
                        <span class="chart-bar-label">{{ m.label }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="proTrends.histograma.length > 0" class="trend-section">
                    <h4>Distribución de Puntajes</h4>
                    <div class="chart-bars">
                      <div class="chart-bar-item" *ngFor="let h of proTrends.histograma">
                        <div class="chart-bar" [style.height.%]="getBarHeight(h.count, proTrends.histograma)" style="background: linear-gradient(180deg, var(--accent), #22c55e);"></div>
                        <span class="chart-bar-value">{{ h.count }}</span>
                        <span class="chart-bar-label">{{ h.rango }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="proTrends.porMes.length === 0" class="pro-empty">Sin datos suficientes para tendencias.</div>
                </div>
              </div>
            </div>

            <!-- 3.5 Storage Management -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="toggleProSection('storage')">
                <span class="pro-section-icon" style="background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent);">🗄️</span>
                <span class="pro-section-label">Gestión de Almacenamiento</span>
                <span class="pro-section-badge" *ngIf="proStorage">{{ proStorage.totalMB }} MB</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'storage'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'storage'">
                <div *ngIf="proLoadingStorage" class="pro-loading">Consultando almacenamiento...</div>
                <div *ngIf="proStorage && !proLoadingStorage" class="storage-grid">
                  <div class="storage-item" *ngFor="let col of proStorage.collections">
                    <div class="storage-info">
                      <span class="storage-name">{{ getCollectionLabel(col.collection) }}</span>
                      <span class="storage-count">{{ col.count }} registros · {{ col.estimatedMB }} MB</span>
                    </div>
                    <div class="storage-bar"><div class="storage-fill" [style.width.%]="getStoragePercent(col.estimatedMB)"></div></div>
                  </div>
                  <div class="storage-total">
                    <strong>Total: {{ proStorage.totalRecords }} registros · {{ proStorage.totalMB }} MB</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3.6 Import/Restore -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="proActiveSection = proActiveSection === 'import' ? '' : 'import'">
                <span class="pro-section-icon" style="background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent);">📤</span>
                <span class="pro-section-label">Importar Datos (CSV)</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'import'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'import'">
                <div class="import-zone" (dragover)="$event.preventDefault()" (drop)="onImportDrop($event)">
                  <input type="file" accept=".csv,.json" (change)="onImportFileSelect($event)" class="import-file-input" id="importFileInput" />
                  <label for="importFileInput" class="import-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>Arrastra un archivo CSV o JSON aquí, o <strong>haz clic para seleccionar</strong></span>
                    <small>Formatos aceptados: .csv, .json</small>
                  </label>
                </div>
                <div *ngIf="importPreview" class="import-preview">
                  <h4>Vista Previa: {{ importFileName }}</h4>
                  <p>{{ importPreview.length }} registro(s) detectados</p>
                  <div class="anomaly-table" *ngIf="importPreview.length > 0">
                    <div class="anomaly-row anomaly-header">
                      <span *ngFor="let key of importPreviewKeys.slice(0, 5)">{{ key }}</span>
                    </div>
                    <div class="anomaly-row" *ngFor="let row of importPreview.slice(0, 5)">
                      <span *ngFor="let key of importPreviewKeys.slice(0, 5)">{{ row[key] || '—' }}</span>
                    </div>
                  </div>
                  <p class="import-note">⚠️ La importación requiere despliegue del backend.</p>
                </div>
              </div>
            </div>

            <!-- 3.8 Advanced Export -->
            <div class="pro-section">
              <button class="pro-section-toggle" (click)="proActiveSection = proActiveSection === 'export' ? '' : 'export'">
                <span class="pro-section-icon" style="background:rgba(var(--accent-rgb, 20, 184, 166), 0.1);color:var(--accent);">📊</span>
                <span class="pro-section-label">Exportación Avanzada</span>
                <svg class="pro-chevron" [class.open]="proActiveSection === 'export'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="pro-section-body" *ngIf="proActiveSection === 'export'">
                <div class="export-grid">
                  <button class="export-option" (click)="exportarCSV()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span class="export-format">CSV</span>
                    <span class="export-desc">Tabla de resultados para Excel</span>
                  </button>
                  <button class="export-option" (click)="exportarJSON()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    <span class="export-format">JSON</span>
                    <span class="export-desc">Datos estructurados para integración</span>
                  </button>
                  <button class="export-option" (click)="exportarTodosCSV()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span class="export-format">CSV Global</span>
                    <span class="export-desc">Todos los datos de todas las pestañas</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div *ngIf="activeTab === 'tests'" class="tab-content">
        <!-- SECCIÓN: POR PRUEBA -->
        <div class="view-section">

          <!-- VISTA MAESTRO: GRID DE TESTS COMPACTO -->
          <div *ngIf="vistaActual === 'lista-tests'">

            <!-- BARRA DE FILTROS PREMIUM -->
            <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
              
              <div class="search-box-premium w-full md:w-1/2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Buscar por nombre..." (input)="onFiltroTextoChange($event)">
              </div>
              
              <div class="select-premium-wrapper w-full md:w-auto">
                <select class="select-premium w-full min-h-[44px]" (change)="onFiltroTipoChange($event)">
                  <option value="Todos">Todos los tipos</option>
                  <option value="Test">Solo Tests Unitarios</option>
                  <option value="Batería">Solo Baterías</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

              <div class="select-premium-wrapper w-full md:w-auto">
                <select class="select-premium w-full min-h-[44px]" (change)="onFiltroEstadoChange($event)">
                  <option value="Todos">Cualquier estado</option>
                  <option value="Activos">Solo Activos</option>
                  <option value="Inactivos">Solo Inactivos</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
              <div class="test-card" *ngFor="let test of listaDeTestsFiltrada" (click)="verDetalle(test)" [ngClass]="{'test-inactivo': !test.activo}">
                
                <div class="test-card-icon" [ngClass]="test.colorClass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2c-3.3 0-6 2.7-6 6 0 2.5 1.5 4.7 3.7 5.6.3.1.5.4.5.7v2.2c0 .8.7 1.5 1.5 1.5h.6c.8 0 1.5-.7 1.5-1.5v-2.2c0-.3.2-.6.5-.7C16.5 12.7 18 10.5 18 8c0-3.3-2.7-6-6-6z"></path><path d="M9.5 18v2.5c0 .8.7 1.5 1.5 1.5h2c.8 0 1.5-.7 1.5-1.5V18"></path></svg>
                </div>
                
                <div class="test-card-content">
                  <div class="test-card-header" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="status-dot" [ngClass]="test.activo ? 'status-active' : 'status-inactive'"></span>
                      <span class="status-text">{{ test.activo ? 'Activo' : 'Inactivo' }}</span>
                    </div>
                    <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">{{ test.tipo }}</span>
                  </div>
                  
                  <h3 class="instrument-card-title line-clamp-2" title="{{ test.nombre }}">{{ test.nombre }}</h3>
                  
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                     <span style="display: flex; align-items: center; gap: 4px;" title="Creado por">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                       {{ test.creado_por || 'Sistema' }}
                     </span>
                     <span style="display: flex; align-items: center; gap: 4px;" title="Fecha Alta">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                       {{ test.fechaAlta | date:'shortDate' }}
                     </span>
                  </div>
                  
                  <div class="test-card-footer">
                    <span class="badge-aplicados">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      {{ test.totalEvaluados }} 
                    </span>
                    <button class="btn-icon-arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- VISTA DETALLE: LISTA DE CANDIDATOS -->
          <div *ngIf="vistaActual === 'detalle-candidatos'" class="detalle-respuestas-view">

            <!-- Header Premium (mismo formato que la vista genérica) -->
            <div class="detalle-header-premium">
              <button class="btn-volver-premium" (click)="volverListaTests()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Volver a los tests
              </button>

              <div class="detalle-titulo-wrapper">
                <h2 class="detalle-titulo">{{ testSeleccionado }}</h2>
                <div class="detalle-meta">
                  <span class="detalle-badge-tipo">Test</span>
                  <span class="detalle-separador">·</span>
                  <span class="detalle-count">{{ resultadosFiltrados.length }} respuesta(s) registrada(s)</span>
                </div>
              </div>

              <!-- Acciones de Exportación -->
              <div class="detalle-export-actions" *ngIf="resultadosFiltrados.length > 0">
                <button class="btn-export-detail btn-export-csv" (click)="exportarCSV()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Exportar CSV
                </button>
                <button class="btn-export-detail btn-export-pdf" (click)="exportarTestPDF()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  Exportar PDF
                </button>
                <button class="btn-export-detail btn-purge-data" (click)="limpiarDatosTests()" style="background: linear-gradient(135deg, #ef4444, #dc2626); margin-left: 8px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  Limpiar datos
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="resultadosFiltrados.length === 0" class="empty-respuestas">
              <div class="empty-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              </div>
              <h3>Sin respuestas aún</h3>
              <p>Este test no tiene envíos registrados. Las respuestas aparecerán aquí cuando los participantes completen la evaluación.</p>
            </div>

            <!-- Lista de Respuestas como Tarjetas -->
            <div *ngIf="resultadosFiltrados.length > 0" class="respuestas-grid">
              <div class="respuesta-card" *ngFor="let res of resultadosFiltrados; let i = index">

                <div class="respuesta-avatar">
                  <span>{{ (i + 1) }}</span>
                </div>

                <div class="respuesta-info">
                  <div class="respuesta-linea-principal">
                    <span class="respuesta-instrumento">{{ res.nombreUsuario || 'Candidato anónimo' }}</span>
                    <span class="respuesta-puntaje-badge" *ngIf="res.puntaje">{{ res.puntaje }} pts</span>
                    <span class="respuesta-puntaje-na" *ngIf="!res.puntaje">Sin puntaje</span>
                  </div>
                  <div class="respuesta-linea-secundaria">
                    <span class="respuesta-fecha">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {{ res.fecha || 'Sin fecha' }}
                    </span>
                    <span class="respuesta-token">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      {{ res.nombreTest || '—' }}
                    </span>
                    <span *ngIf="res.resultado" class="respuesta-resultado-tag">{{ res.resultado }}</span>
                  </div>
                </div>

                <button class="btn-eliminar-respuesta" title="Eliminar este registro" (click)="abrirModalEliminar(res); $event.stopPropagation()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- MODAL CONFIRMACIÓN ELIMINAR -->
          <div *ngIf="showDeleteModal" class="modal-overlay" (click)="cerrarModalEliminar()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 28px; height: 28px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1e293b; text-align: center;">¿Eliminar este registro?</h3>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #64748b; text-align: center; line-height: 1.5;">Estás a punto de eliminar <strong>{{ registroAEliminar?.nombreUsuario || 'este registro' }}</strong> del instrumento <strong>{{ registroAEliminar?.nombreTest }}</strong>.</p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #ef4444; text-align: center; font-weight: 600;">⚠️ Esta acción es irreversible. Solo se borra la respuesta, NO el instrumento.</p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button (click)="cerrarModalEliminar()" style="padding: 10px 24px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #475569; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                <button (click)="confirmarEliminacion()" [disabled]="eliminando" style="padding: 10px 24px; border-radius: 10px; border: none; background: #ef4444; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">
                  {{ eliminando ? 'Eliminando...' : 'Sí, eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- SECCIONES DINÁMICAS RAW -->
        <div *ngIf="cargandoRaw" class="cargando-box">
          <svg class="spinner" viewBox="0 0 50 50" style="width: 40px; height: 40px; stroke-width: 4; stroke: var(--color-primario); fill: none;"><circle cx="25" cy="25" r="20" stroke-dasharray="80" stroke-dashoffset="20"></circle></svg>
          <p>Consultando base de datos en crudo...</p>
        </div>

        <div *ngIf="activeTab === 'baterias' && !cargandoRaw" class="w-full">
          <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
            <div class="search-box-premium w-full md:w-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Buscar batería por nombre o responsable..." (input)="onFiltroDinamico($event, 'baterias')">
            </div>
            <div class="select-premium-wrapper w-full md:w-auto">
              <select class="select-premium w-full min-h-[44px]" (change)="onFiltroDinamico($event, 'baterias', 'select')">
                <option value="Todos">Cualquier Estado</option>
                <option value="Activo">Solo Activos</option>
                <option value="Inactivo">Solo Inactivos</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button class="btn-export-tab" (click)="exportarTabCSV('baterias')" *ngIf="rawDataBaterias.length > 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <div class="test-card" *ngFor="let item of rawDataBaterias" [ngClass]="{'test-inactivo': !item.activo}">
            <div class="test-card-icon bg-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <div class="test-card-content">
              <div class="test-card-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="status-dot" [ngClass]="item.activo ? 'status-active' : 'status-inactive'"></span>
                  <span class="status-text">{{ item.activo ? 'Activo' : 'Inactivo' }}</span>
                </div>
                <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">Batería</span>
              </div>
              <h3 class="instrument-card-title line-clamp-2" title="{{ item.nombre }}">{{ item.nombre }}</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                 <span style="display: flex; align-items: center; gap: 4px;" title="Creado por">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   {{ item.creado_por || 'Sistema' }}
                 </span>
                 <span style="display: flex; align-items: center; gap: 4px;" title="Fecha Alta">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                   {{ item.fechaAlta | date:'shortDate' }}
                 </span>
              </div>
              <div class="test-card-footer">
                <span class="badge-aplicados" title="ID del Sistema">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  {{ item.id | slice:0:6 }}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn-icon-download" title="Descargar datos" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Batería'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button class="btn-icon-arrow" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Batería'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="rawDataBaterias.length === 0" class="empty-state-premium" style="
              grid-column: 1 / -1;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 60px 30px; text-align: center;
              background: linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(99,102,241,0.05) 100%);
              border: 2px dashed #cbd5e1; border-radius: 20px;
              animation: emptyFadeIn 0.6s ease-out;">
              <div style="width: 120px; height: 120px; margin-bottom: 20px;">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="url(#emptyGradBatRes)" opacity="0.12"/>
                  <circle cx="60" cy="60" r="38" fill="url(#emptyGradBatRes)" opacity="0.08"/>
                  <rect x="30" y="38" width="50" height="35" rx="4" stroke="var(--accent)" stroke-width="2" fill="white" opacity="0.9"/>
                  <path d="M48 38V30a4 4 0 014-4h8a4 4 0 014 4v8" stroke="var(--accent)" stroke-width="2" fill="none"/>
                  <rect x="40" y="48" width="14" height="3" rx="1.5" fill="#93c5fd"/>
                  <rect x="40" y="56" width="24" height="3" rx="1.5" fill="#bfdbfe"/>
                  <rect x="40" y="64" width="18" height="3" rx="1.5" fill="#93c5fd"/>
                  <circle cx="88" cy="38" r="10" fill="var(--accent)" opacity="0.15"/>
                  <circle cx="88" cy="38" r="7" fill="var(--accent)"/>
                  <path d="M85 38h6M88 35v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                  <defs>
                    <linearGradient id="emptyGradBatRes" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Sin baterías registradas</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b; max-width: 380px; line-height: 1.6;">No se encontraron baterías con los filtros aplicados. Crea baterías desde el módulo de gestión y sus datos aparecerán aquí.</p>
          </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'casos' && !cargandoRaw" class="w-full">
          <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
            <div class="search-box-premium w-full md:w-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Buscar simulador por nombre o responsable..." (input)="onFiltroDinamico($event, 'casos')">
            </div>
            <div class="select-premium-wrapper w-full md:w-auto">
              <select class="select-premium w-full min-h-[44px]" (change)="onFiltroDinamico($event, 'casos', 'select')">
                <option value="Todos">Cualquier Estado</option>
                <option value="Activo">Activos</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completado">Completados</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button class="btn-export-tab" (click)="exportarTabCSV('casos')" *ngIf="rawDataCasos.length > 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <div class="test-card" *ngFor="let item of rawDataCasos" [ngClass]="{'test-inactivo': item.estado !== 'Activo' && item.estado !== 'Completado' && item.estado !== 'En Progreso'}">
            <div class="test-card-icon bg-icon-orange">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15"></line>
                  <circle cx="18" cy="6" r="3"></circle>
                  <circle cx="6" cy="18" r="3"></circle>
                  <path d="M18 9a9 9 0 0 1-9 9"></path>
               </svg>
            </div>
            <div class="test-card-content">
              <div class="test-card-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="status-dot" [ngClass]="(item.estado === 'Activo' || item.estado === 'Completado' || item.estado === 'En Progreso') ? 'status-active' : 'status-inactive'"></span>
                  <span class="status-text">{{ item.estado }}</span>
                </div>
                <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">Simulador</span>
              </div>
              <h3 class="instrument-card-title line-clamp-2" title="{{ item.nombre }}">{{ item.nombre }}</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                 <span style="display: flex; align-items: center; gap: 4px;" title="Creador">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   {{ item.creado_por || 'Sistema' }}
                 </span>
                 <span style="display: flex; align-items: center; gap: 4px;" title="Tipo">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                   {{ item.tipo || 'General' }}
                 </span>
              </div>
              <div class="test-card-footer">
                <span class="badge-aplicados" title="ID del Sistema">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  {{ item.id | slice:0:6 }}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn-icon-download" title="Descargar datos" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Simulador'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button class="btn-icon-arrow" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Simulador'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="rawDataCasos.length === 0" class="empty-state-premium" style="
              grid-column: 1 / -1;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 60px 30px; text-align: center;
              background: linear-gradient(135deg, rgba(249,115,22,0.03) 0%, rgba(234,88,12,0.05) 100%);
              border: 2px dashed #cbd5e1; border-radius: 20px;
              animation: emptyFadeIn 0.6s ease-out;">
              <div style="width: 120px; height: 120px; margin-bottom: 20px;">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="url(#emptyGradSimRes)" opacity="0.12"/>
                  <circle cx="60" cy="60" r="38" fill="url(#emptyGradSimRes)" opacity="0.08"/>
                  <!-- Decision tree -->
                  <circle cx="60" cy="30" r="8" stroke="#f97316" stroke-width="2" fill="white"/>
                  <circle cx="38" cy="60" r="6" stroke="#f97316" stroke-width="1.5" fill="#fff7ed"/>
                  <circle cx="82" cy="60" r="6" stroke="#f97316" stroke-width="1.5" fill="#fff7ed"/>
                  <circle cx="28" cy="85" r="5" stroke="#ea580c" stroke-width="1.5" fill="#ffedd5"/>
                  <circle cx="48" cy="85" r="5" stroke="#ea580c" stroke-width="1.5" fill="#ffedd5"/>
                  <circle cx="72" cy="85" r="5" stroke="#ea580c" stroke-width="1.5" fill="#ffedd5"/>
                  <circle cx="92" cy="85" r="5" stroke="#ea580c" stroke-width="1.5" fill="#ffedd5"/>
                  <line x1="55" y1="37" x2="42" y2="54" stroke="#f97316" stroke-width="1.5"/>
                  <line x1="65" y1="37" x2="78" y2="54" stroke="#f97316" stroke-width="1.5"/>
                  <line x1="34" y1="65" x2="30" y2="80" stroke="#ea580c" stroke-width="1.2"/>
                  <line x1="42" y1="65" x2="46" y2="80" stroke="#ea580c" stroke-width="1.2"/>
                  <line x1="78" y1="65" x2="74" y2="80" stroke="#ea580c" stroke-width="1.2"/>
                  <line x1="86" y1="65" x2="90" y2="80" stroke="#ea580c" stroke-width="1.2"/>
                  <text x="60" y="34" text-anchor="middle" font-size="10" fill="#f97316" font-weight="bold">?</text>
                  <defs>
                    <linearGradient id="emptyGradSimRes" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#f97316"/><stop offset="1" stop-color="#ea580c"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Sin simuladores encontrados</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b; max-width: 380px; line-height: 1.6;">No se encontraron casos de simulación con los filtros seleccionados. Los simuladores creados aparecerán aquí con sus datos de ejecución.</p>
          </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'encuestas' && !cargandoRaw" class="w-full">
          <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
            <div class="search-box-premium w-full md:w-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Buscar encuesta por nombre o lanzador..." (input)="onFiltroDinamico($event, 'encuestas')">
            </div>
            <div class="select-premium-wrapper w-full md:w-auto">
              <select class="select-premium w-full min-h-[44px]" (change)="onFiltroDinamico($event, 'encuestas', 'select')">
                <option value="Todos">Cualquier Estado</option>
                <option value="Publicado">Publicados</option>
                <option value="Activo">Activos</option>
                <option value="Borrador">Borrador</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button class="btn-export-tab" (click)="exportarTabCSV('encuestas')" *ngIf="rawDataEncuestas.length > 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <div class="test-card" *ngFor="let item of rawDataEncuestas" [ngClass]="{'test-inactivo': item.estado !== 'Publicado' && item.estado !== 'Activo'}">
            <div class="test-card-icon bg-icon-teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
            <div class="test-card-content">
              <div class="test-card-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="status-dot" [ngClass]="(item.estado === 'Publicado' || item.estado === 'Activo') ? 'status-active' : 'status-inactive'"></span>
                  <span class="status-text">{{ item.estado }}</span>
                </div>
                <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">Encuesta</span>
              </div>
              <h3 class="instrument-card-title line-clamp-2" title="{{ item.nombre }}">{{ item.nombre }}</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                 <span style="display: flex; align-items: center; gap: 4px;" title="Lanzador">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   {{ item.creado_por || 'Sistema' }}
                 </span>
                 <span style="display: flex; align-items: center; gap: 4px;" title="Fecha Alta">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                   {{ item.fechaAlta | date:'shortDate' }}
                 </span>
              </div>
              <div class="test-card-footer">
                <span class="badge-aplicados" title="ID del Sistema">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  {{ item.id | slice:0:6 }}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn-icon-download" title="Descargar datos" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Encuesta'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button class="btn-icon-arrow" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Encuesta'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="rawDataEncuestas.length === 0" class="empty-state-premium" style="
              grid-column: 1 / -1;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 60px 30px; text-align: center;
              background: linear-gradient(135deg, rgba(var(--accent-rgb, 20, 184, 166), 0.03) 0%, rgba(139,92,246,0.05) 100%);
              border: 2px dashed #cbd5e1; border-radius: 20px;
              animation: emptyFadeIn 0.6s ease-out;">
              <div style="width: 120px; height: 120px; margin-bottom: 20px;">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="url(#emptyGradEncRes)" opacity="0.12"/>
                  <circle cx="60" cy="60" r="38" fill="url(#emptyGradEncRes)" opacity="0.08"/>
                  <!-- Clipboard -->
                  <rect x="32" y="28" width="46" height="60" rx="5" stroke="var(--accent)" stroke-width="2" fill="white" opacity="0.95"/>
                  <rect x="46" y="22" width="18" height="12" rx="3" stroke="var(--accent)" stroke-width="2" fill="white"/>
                  <circle cx="55" cy="28" r="2" fill="var(--accent)"/>
                  <!-- Checkmarks -->
                  <rect x="40" y="42" width="8" height="8" rx="2" stroke="var(--accent)" stroke-width="1.5" fill="#ccfbf1"/>
                  <path d="M42 46l2 2 4-4" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="52" y="44" width="20" height="3" rx="1.5" fill="#99f6e4"/>
                  <rect x="40" y="56" width="8" height="8" rx="2" stroke="var(--accent)" stroke-width="1.5" fill="#ccfbf1"/>
                  <rect x="52" y="58" width="16" height="3" rx="1.5" fill="#99f6e4"/>
                  <rect x="40" y="70" width="8" height="8" rx="2" stroke="var(--accent)" stroke-width="1.5" fill="#ede9fe"/>
                  <rect x="52" y="72" width="22" height="3" rx="1.5" fill="#c4b5fd"/>
                  <!-- Sparkle -->
                  <circle cx="88" cy="32" r="10" fill="var(--accent)" opacity="0.15"/>
                  <circle cx="88" cy="32" r="7" fill="var(--accent)"/>
                  <text x="88" y="36" text-anchor="middle" font-size="9" fill="white" font-weight="bold">★</text>
                  <defs>
                    <linearGradient id="emptyGradEncRes" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Sin encuestas encontradas</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b; max-width: 380px; line-height: 1.6;">No se encontraron encuestas con estos filtros. Publica encuestas desde el módulo de diseño y sus respuestas se mostrarán aquí.</p>
          </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'bitacoras' && !cargandoRaw" class="w-full">
          <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
            <div class="search-box-premium w-full md:w-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Buscar log por acción, usuario ID..." (input)="onFiltroDinamico($event, 'bitacoras')">
            </div>
            <div class="select-premium-wrapper w-full md:w-auto">
              <select class="select-premium w-full min-h-[44px]" (change)="onFiltroDinamico($event, 'bitacoras', 'select')">
                <option value="Todos">Todos los Registros</option>
                <option value="Sistema">Acciones de Sistema</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button class="btn-export-tab" (click)="exportarTabCSV('bitacoras')" *ngIf="rawDataBitacoras.length > 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <div class="test-card" *ngFor="let item of rawDataBitacoras">
            <div class="test-card-icon bg-icon-gray">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div class="test-card-content">
              <div class="test-card-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="status-dot status-active"></span>
                  <span class="status-text">LOG</span>
                </div>
                <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">Audit</span>
              </div>
              <h3 class="instrument-card-title line-clamp-2" title="{{ item.accion }}">{{ item.accion }}</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                 <span style="display: flex; align-items: center; gap: 4px;" title="Responsable">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   {{ item.creado_por || 'Sistema' }}
                 </span>
                 <span style="display: flex; align-items: center; gap: 4px;" title="Timestamp">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                   {{ item.timestamp | date:'shortTime' }}
                 </span>
              </div>
              <div class="test-card-footer">
                <span class="badge-aplicados" title="Session / Action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  {{ item.usuarioAction }}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn-icon-download" title="Descargar datos" (click)="abrirDetalleInstrumento(item.id, item.accion || item.nombre, 'Bitácora'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button class="btn-icon-arrow" (click)="abrirDetalleInstrumento(item.id, item.accion || item.nombre, 'Bitácora'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="rawDataBitacoras.length === 0" class="empty-state-premium" style="
              grid-column: 1 / -1;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 60px 30px; text-align: center;
              background: linear-gradient(135deg, rgba(245,158,11,0.03) 0%, rgba(168,85,247,0.05) 100%);
              border: 2px dashed #cbd5e1; border-radius: 20px;
              animation: emptyFadeIn 0.6s ease-out;">
              <div style="width: 120px; height: 120px; margin-bottom: 20px;">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="url(#emptyGradLogRes)" opacity="0.12"/>
                  <circle cx="60" cy="60" r="38" fill="url(#emptyGradLogRes)" opacity="0.08"/>
                  <!-- Book -->
                  <rect x="30" y="28" width="8" height="62" rx="3" fill="var(--accent)"/>
                  <rect x="38" y="26" width="48" height="66" rx="4" stroke="var(--accent)" stroke-width="2" fill="white" opacity="0.95"/>
                  <rect x="46" y="38" width="32" height="3" rx="1.5" fill="#fde68a"/>
                  <rect x="46" y="48" width="26" height="3" rx="1.5" fill="#fef3c7"/>
                  <rect x="46" y="58" width="30" height="3" rx="1.5" fill="#fde68a"/>
                  <rect x="46" y="68" width="20" height="3" rx="1.5" fill="#fef3c7"/>
                  <rect x="46" y="78" width="24" height="3" rx="1.5" fill="#fde68a"/>
                  <!-- Pen -->
                  <line x1="92" y1="32" x2="78" y2="82" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
                  <polygon points="78,82 75,87 81,85" fill="#a855f7"/>
                  <!-- Sparkle -->
                  <circle cx="96" cy="28" r="9" fill="var(--accent)" opacity="0.15"/>
                  <circle cx="96" cy="28" r="6" fill="var(--accent)"/>
                  <path d="M96 24v8M92 28h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                  <defs>
                    <linearGradient id="emptyGradLogRes" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stop-color="var(--accent)"/><stop offset="1" stop-color="#a855f7"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Sin registros de bitácora</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b; max-width: 380px; line-height: 1.6;">No hay registros de bitácora recientes con estos filtros. Los logs registrados desde el módulo de bitácoras aparecerán aquí automáticamente.</p>
          </div>
          </div>
        </div>

        <!-- PESTAÑA: ENTRENAMIENTOS -->
        <div *ngIf="activeTab === 'entrenamientos' && !cargandoRaw" class="w-full">
          <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
            <div class="search-box-premium w-full md:w-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Buscar entrenamiento por nombre o responsable..." (input)="onFiltroDinamico($event, 'entrenamientos')">
            </div>
            <div class="select-premium-wrapper w-full md:w-auto">
              <select class="select-premium w-full min-h-[44px]" (change)="onFiltroDinamico($event, 'entrenamientos', 'select')">
                <option value="Todos">Cualquier Estado</option>
                <option value="Activo">Solo Activos</option>
                <option value="Inactivo">Solo Inactivos</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button class="btn-export-tab" (click)="exportarTabCSV('entrenamientos')" *ngIf="rawDataEntrenamientos.length > 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <div class="test-card" *ngFor="let item of rawDataEntrenamientos" [ngClass]="{'test-inactivo': !item.activo}">
            <div class="test-card-icon bg-icon-emerald">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div class="test-card-content">
              <div class="test-card-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="status-dot" [ngClass]="item.activo ? 'status-active' : 'status-inactive'"></span>
                  <span class="status-text">{{ item.activo ? 'Activo' : 'Inactivo' }}</span>
                </div>
                <span class="tag-tipo" style="font-size: 10px; padding: 2px 6px;">Entrenamiento</span>
              </div>
              <h3 class="instrument-card-title line-clamp-2" title="{{ item.nombre }}">{{ item.nombre }}</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: #94a3b8;">
                 <span style="display: flex; align-items: center; gap: 4px;" title="Creado por">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   {{ item.creado_por || 'Sistema' }}
                 </span>
                 <span style="display: flex; align-items: center; gap: 4px;" title="Fecha Alta">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                   {{ item.fechaAlta | date:'shortDate' }}
                 </span>
              </div>
              <div class="test-card-footer">
                <span class="badge-aplicados" title="Total Preguntas">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  {{ item.totalPreguntas || 0 }}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn-icon-download" title="Descargar datos" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Entrenamiento'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button class="btn-icon-arrow" (click)="abrirDetalleInstrumento(item.id, item.nombre, 'Entrenamiento'); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="rawDataEntrenamientos.length === 0" class="empty-state-premium" style="
              grid-column: 1 / -1;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 60px 30px; text-align: center;
              background: linear-gradient(135deg, rgba(16,185,129,0.03) 0%, rgba(5,150,105,0.05) 100%);
              border: 2px dashed #cbd5e1; border-radius: 20px;
              animation: emptyFadeIn 0.6s ease-out;">
              <div style="width: 120px; height: 120px; margin-bottom: 20px;">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="url(#emptyGradEntRes)" opacity="0.12"/>
                  <circle cx="60" cy="60" r="38" fill="url(#emptyGradEntRes)" opacity="0.08"/>
                  <rect x="30" y="30" width="42" height="50" rx="4" stroke="var(--accent)" stroke-width="2" fill="white" opacity="0.9"/>
                  <path d="M38 42h26M38 50h20M38 58h16" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="88" cy="38" r="10" fill="var(--accent)" opacity="0.15"/>
                  <circle cx="88" cy="38" r="7" fill="var(--accent)"/>
                  <path d="M85 38h6M88 35v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                  <defs>
                    <linearGradient id="emptyGradEntRes" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Sin entrenamientos registrados</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b; max-width: 380px; line-height: 1.6;">No se encontraron entrenamientos con los filtros aplicados. Crea entrenamientos desde el módulo correspondiente y sus datos aparecerán aquí.</p>
          </div>
          </div>
        </div>

        </div> <!-- fin !vistaDetalleGenerico -->

        <!-- ===================== VISTA DETALLE RESPUESTAS (REEMPLAZA TODO) ===================== -->
        <div *ngIf="vistaDetalleGenerico" class="detalle-respuestas-view">

          <!-- Header Premium -->
          <div class="detalle-header-premium">
            <button class="btn-volver-premium" (click)="cerrarDetalleGenerico()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Volver a {{ activeTab === 'tests' ? 'Tests' : activeTab === 'encuestas' ? 'Encuestas' : activeTab === 'baterias' ? 'Baterías' : activeTab === 'casos' ? 'Simuladores' : activeTab === 'entrenamientos' ? 'Entrenamientos' : 'Bitácoras' }}
            </button>

            <div class="detalle-titulo-wrapper">
              <h2 class="detalle-titulo">{{ detalleGenericoNombre }}</h2>
              <div class="detalle-meta">
                <span class="detalle-badge-tipo">{{ detalleGenericoTipo }}</span>
                <span class="detalle-separador">·</span>
                <span class="detalle-count">{{ respuestasInstrumento.length }} respuesta(s) registrada(s)</span>
              </div>
            </div>

            <!-- Acciones de Exportación -->
            <div class="detalle-export-actions" *ngIf="!cargandoRespuestas && respuestasInstrumento.length > 0">
              <button class="btn-export-detail btn-export-csv" (click)="exportarDetalleCSV()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                Exportar CSV
              </button>
              <button class="btn-export-detail btn-export-pdf" (click)="exportarDetallePDF()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                Exportar PDF
              </button>
              <button class="btn-export-detail btn-purge-data" (click)="limpiarDatosInstrumento()" style="background: linear-gradient(135deg, #ef4444, #dc2626); margin-left: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Limpiar datos
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="cargandoRespuestas" class="loading-respuestas">
            <div class="loading-pulse"></div>
            <p>Consultando respuestas...</p>
          </div>

          <!-- Empty State Premium -->
          <div *ngIf="!cargandoRespuestas && respuestasInstrumento.length === 0" class="empty-respuestas">
            <div class="empty-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </div>
            <h3>Sin respuestas aún</h3>
            <p>Este instrumento no tiene envíos registrados. Las respuestas aparecerán aquí cuando los participantes completen la evaluación.</p>
          </div>

          <!-- Lista de Respuestas como Tarjetas -->
          <div *ngIf="!cargandoRespuestas && respuestasInstrumento.length > 0" class="respuestas-grid">
            <div class="respuesta-card" *ngFor="let resp of respuestasInstrumento; let i = index">
              
              <div class="respuesta-avatar">
                <span>{{ (i + 1) }}</span>
              </div>

              <div class="respuesta-info">
                <div class="respuesta-linea-principal">
                  <span class="respuesta-instrumento">{{ resp.instrumento || detalleGenericoNombre }}</span>
                  <span class="respuesta-puntaje-badge" *ngIf="resp.puntaje">{{ resp.puntaje }} pts</span>
                  <span class="respuesta-puntaje-na" *ngIf="!resp.puntaje">Sin puntaje</span>
                </div>
                <div class="respuesta-linea-secundaria">
                  <span class="respuesta-fecha">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {{ resp.fecha ? (resp.fecha | date:'d MMM yyyy, HH:mm') : 'Sin fecha' }}
                  </span>
                  <span class="respuesta-token">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    {{ resp.token || resp._id?.substring(0,8) || '—' }}
                  </span>
                </div>
              </div>

              <button class="btn-eliminar-respuesta" title="Eliminar esta respuesta" (click)="abrirModalEliminarGenerico(resp); $event.stopPropagation()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL CONFIRMACIÓN ELIMINAR (genérico) -->
        <div *ngIf="showDeleteModalGenerico" class="modal-overlay" (click)="cerrarModalEliminarGenerico()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 28px; height: 28px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1e293b; text-align: center;">¿Eliminar este registro?</h3>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #64748b; text-align: center; line-height: 1.5;">Estás a punto de eliminar el <strong>registro #{{ respuestaAEliminar?.numero }}</strong> del instrumento <strong>{{ respuestaAEliminar?.instrumento || detalleGenericoNombre }}</strong>.</p>
            <p style="margin: 0 0 24px 0; font-size: 13px; color: #ef4444; text-align: center; font-weight: 600;">⚠️ Esta acción es irreversible. Solo se borra la respuesta, NO el instrumento.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button (click)="cerrarModalEliminarGenerico()" style="padding: 10px 24px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #475569; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">Cancelar</button>
              <button (click)="confirmarEliminacionGenerica()" [disabled]="eliminandoGenerico" style="padding: 10px 24px; border-radius: 10px; border: none; background: #ef4444; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">
                {{ eliminandoGenerico ? 'Eliminando...' : 'Sí, eliminar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL LIMPIEZA DE DATOS (lista previa de lo que se va a borrar) -->
        <div *ngIf="showPurgeModal" class="modal-overlay" (click)="cerrarPurgeModal()">
          <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 520px; max-height: 85vh; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 28px; height: 28px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </div>
              <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1e293b;">Limpiar datos de "{{ purgeTargetName }}"</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Se eliminarán <strong style="color: #ef4444;">{{ purgeList.length }}</strong> respuesta(s). Revisa la lista:</p>
            </div>

            <!-- Lista scrollable -->
            <div style="flex: 1; overflow-y: auto; padding: 12px 0; min-height: 100px; max-height: 350px;">
              <div *ngFor="let resp of purgeList; let i = index"
                   style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; margin-bottom: 6px; background: #fef2f2; border: 1px solid #fecaca;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0;">
                  {{ i + 1 }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ resp.nombreUsuario || resp.nombreTest || resp.instrumento || purgeTargetName }}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; display: flex; gap: 10px; margin-top: 2px;">
                    <span>{{ (resp.fecha || resp.fechaFinalizacion) ? ((resp.fecha || resp.fechaFinalizacion) | date:'d MMM yyyy, HH:mm') : 'Sin fecha' }}</span>
                    <span>{{ resp.token || resp._id?.substring(0,10) || resp.id?.substring(0,10) || '—' }}</span>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0; opacity: 0.5;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </div>
            </div>

            <!-- Footer con botones -->
            <div style="padding-top: 16px; border-top: 1px solid #f1f5f9; flex-shrink: 0;">
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #ef4444; text-align: center; font-weight: 600;">⚠️ Esta acción es irreversible. Se borran las respuestas, NO el instrumento.</p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button (click)="cerrarPurgeModal()" style="padding: 10px 24px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #475569; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                <button (click)="confirmarPurge()" [disabled]="ejecutandoPurge" style="padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">
                  {{ ejecutandoPurge ? 'Eliminando...' : 'Eliminar todo (' + purgeList.length + ')' }}
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    
    .test-layout-wrapper {
      display: flex;
      flex-direction: row;
      min-height: calc(100vh - 70px);
      width: 100%;
      background-color: transparent;
      padding-top: 20px;
      gap: 40px;
      

      @media (max-width: 1024px) {
        flex-direction: column;
        gap: 20px;
      }
    }

    .control-panel {
      width: 320px;
      flex-shrink: 0;

      @media (max-width: 1024px) {
        width: 100%;
        flex-shrink: 1;
      }
    }
    
    .control-card {
      background-color: #ffffff;
      border-radius: 24px;
      padding: 40px 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
      text-align: left;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 40px;

      @media (max-width: 1024px) {
        position: relative;
        top: 0;
        padding: 24px 20px;
      }
    }

    .panel-title {
      
      font-size: 42px;
      color: #2b3a4a;
      font-weight: 800;
      line-height: 1.1;
      margin: 0 0 15px 0;
    }

    .panel-desc {
      font-size: 15px;
      color: #798d9f;
      line-height: 1.5;
      margin: 0 0 40px 0;
    }

    .menu-tabs {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .horizontal-tabs {
      flex-direction: row;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 5px;
    }

    .horizontal-tabs::-webkit-scrollbar {
      height: 4px;
    }
    .horizontal-tabs::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .btn-menu-tab {
      /* Handled inline mostly now, but keep some base transitions */
    }

    .btn-menu-tab.active-tab {
      border-bottom: 2px solid #51B6A5 !important;
      border-radius: 12px 12px 0 0 !important;
      color: #1e293b;
      background: #f8fafc;
    }
    .btn-menu-tab.active-tab .tab-icon-teal { background: rgba(81,182,165,0.2); }
    .btn-menu-tab.active-tab .tab-icon-blue { background: rgba(59,130,246,0.2); }
    .btn-menu-tab.active-tab .tab-icon-orange { background: rgba(249,115,22,0.2); }
    .btn-menu-tab.active-tab .tab-icon-purple { background: rgba(139,92,246,0.2); }
    .btn-menu-tab.active-tab .tab-icon-amber { background: rgba(245,158,11,0.2); }
    .btn-menu-tab.active-tab .tab-icon-emerald { background: rgba(16,185,129,0.2); }

    @media (max-width: 1024px) {
      .menu-tabs {
        flex-direction: row;
        overflow-x: auto;
        gap: 10px;
        padding-bottom: 4px;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .menu-tabs::-webkit-scrollbar { display: none; }
      .btn-menu-tab {
        padding: 10px 16px;
        min-width: max-content;
        border-radius: 50px;
        border-left: none !important;
      }
      .btn-menu-tab.active-tab {
        border-left: none;
        border-bottom: 2px solid var(--accent);
      }
      .tab-icon { width: 28px; height: 28px; border-radius: 8px; }
      .tab-icon svg { width: 14px; height: 14px; }
      .tab-label { font-size: 13px; }
    }

    .main-content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      overflow-x: hidden;
      margin: 0;
      padding: 0;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    /* Tabs Estilos */
    .tabs-container {
      display: flex;
      gap: 15px;
      background: #f1f5f9;
      padding: 8px;
      border-radius: 12px;
      width: max-content;
      margin-bottom: 30px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-texto-suave);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .tab-btn.active {
      background: #fff;
      color: var(--accent);
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }

    .view-section {
      animation: fadeIn 0.3s ease;
    }

    /* Barra de Filtros Premium */
    .master-filters-container {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-box-premium {
      display: flex;
      align-items: center;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 16px;
      height: 48px;
      flex: 1;
      min-width: 250px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      transition: all 0.3s ease;
    }
    .search-box-premium:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .search-box-premium svg {
      width: 20px; height: 20px;
      color: #94a3b8;
      margin-right: 12px;
    }
    .search-box-premium input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      height: 100%;
      font-size: 14px;
      color: var(--color-secundario);
      font-weight: 500;
      font-family: inherit;
    }
    .search-box-premium input::placeholder {
      color: #94a3b8;
    }

    .select-premium-wrapper {
      position: relative;
      height: 48px;
      min-width: 180px;
    }
    .select-premium {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      height: 100%;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 40px 0 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-texto-principal);
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      transition: all 0.2s ease;
    }
    .select-premium:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .select-chevron {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--color-texto-suave);
      pointer-events: none;
    }

    /* Tests Grid (Maestro) - Premium Compact Glassmorphism */
    .tests-grid {
    }

    .test-card {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02), inset 0 0 0 1px rgba(255,255,255,1);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 16px;
      gap: 16px;
      border: 1px solid rgba(226, 232, 240, 0.6);
    }
    
    .test-card:hover {
      transform: translateY(-4px) scale(1.01);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 12px 25px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,1);
      border-color: rgba(203, 213, 225, 0.8);
    }

    .test-inactivo {
      opacity: 0.65;
      filter: grayscale(0.85);
    }

    .test-card-icon {
      width: 60px;
      height: 60px;
      border-radius: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    
    .test-card-icon svg {
      width: 28px;
      height: 28px;
    }
    
    .test-card-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0; /* Ensures truncation works */
    }

    .test-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-active { background: var(--accent); box-shadow: 0 0 6px rgba(16, 185, 129, 0.5); }
    .status-inactive { background: #94a3b8; }
    
    .status-text {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-texto-suave);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .instrument-card-title {
      
      font-size: 15px;
      color: var(--color-marino);
      margin: 0 0 12px 0;
      line-height: 1.3;
      font-weight: 700;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .test-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge-aplicados {
      background: #f1f5f9;
      color: var(--color-texto-suave);
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #e2e8f0;
    }
    .badge-aplicados svg { width: 13px; height: 13px; color: var(--color-texto-suave); }

    .btn-icon-arrow {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      color: var(--color-texto-suave);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      cursor: pointer;
    }
    .test-card:hover .btn-icon-arrow {
      background: var(--color-acento);
      color: #fff;
      transform: translateX(3px);
    }
    .btn-icon-arrow svg { width: 14px; height: 14px; }

    .btn-icon-download {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      cursor: pointer;
    }
    .btn-icon-download:hover {
      background: var(--accent);
      color: #fff;
      transform: scale(1.1);
    }
    .btn-icon-download svg { width: 14px; height: 14px; }

    .btn-export-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent));
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      white-space: nowrap;
      flex-shrink: 0;
      min-height: 44px;
    }
    .btn-export-tab:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
    }
    .btn-export-tab svg { width: 16px; height: 16px; flex-shrink: 0; }
    
    /* Degradados Premium para los Íconos */
    .bg-icon-purple { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    .bg-icon-blue { background: linear-gradient(135deg, var(--accent), #1d4ed8); }
    .bg-icon-teal { background: linear-gradient(135deg, var(--accent), var(--color-secundario)); }
    .bg-icon-orange { background: linear-gradient(135deg, #f97316, #c2410c); }
    .bg-icon-navy { background: linear-gradient(135deg, var(--color-texto-suave), var(--color-secundario)); }
    .bg-icon-gray { background: linear-gradient(135deg, #94a3b8, var(--color-texto-suave)); }
    .bg-icon-emerald { background: linear-gradient(135deg, var(--accent), var(--accent)); }

    /* Buscador */
    .search-bar-container {
      position: relative;
      width: 300px;

      @media (max-width: 1024px) {
        width: 100%;
      }
    }
    .search-input {
      width: 100%;
      padding: 12px 20px 12px 40px;
      border-radius: 50px;
      border: 1px solid #cbd5e1;
      font-size: 14px;
      font-family: inherit;
      color: var(--color-secundario);
      background-color: #fff;
      transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .search-btn {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .search-btn svg { width: 18px; height: 18px; }

    /* Botón Acción Principal Verdes */
    .btn-success {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--accent); 
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 15px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;
    }
    .btn-success:hover {
      background-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.35);
    }
    .btn-success svg { width: 18px; height: 18px; }
    .btn-large { padding: 14px 28px; font-size: 15px; }

    /* Data Table Estilos */
    .table-container {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03), 0 2px 5px rgba(0,0,0,0.02);
      overflow-x: auto;
      padding: 10px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      color: var(--color-texto-suave);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 20px;
      font-weight: 600;
      border-bottom: 2px solid #f1f5f9;
    }

    .data-table td {
      padding: 20px;
      border-bottom: 1px solid #f1f5f9;
      color: var(--color-texto-principal);
      font-size: 14px;
      vertical-align: middle;
    }
    @media (max-width: 1024px) {
      .data-table th { padding: 12px 10px; font-size: 11px; }
      .data-table td { padding: 14px 10px; font-size: 13px; }
    }
    @media (max-width: 640px) {
      .data-table th { padding: 10px 8px; font-size: 10px; }
      .data-table td { padding: 10px 8px; font-size: 12px; }
    }

    .data-table tbody tr {
      transition: background-color 0.2s ease;
    }
    .data-table tbody tr:hover {
      background-color: #f8fafc;
    }
    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .fw-600 { font-weight: 600; color: var(--color-marino) !important; }
    .text-right { text-align: right; }

    /* Componentes visuales de tabla */
    .tag-test {
      background: #e0f2fe;
      color: #0369a1;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    .tag-resultado {
      background: #f0fdf4;
      color: #166534;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: normal;
      word-break: break-word;
      display: inline-block;
      max-width: 160px;
    }
    @media (max-width: 1024px) {
      .tag-resultado { font-size: 11px; padding: 3px 8px; max-width: 120px; }
      .tag-test { font-size: 11px; padding: 4px 10px; max-width: 120px; white-space: normal; word-break: break-word; display: inline-block; }
    }

    .tag-tipo {
      background: #f1f5f9;
      color: var(--color-texto-suave);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
    }

    .score-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
    }
    .score-high { background: #dcfce7; color: #15803d; }
    .score-med { background: #fef9c3; color: #a16207; }
    .score-low { background: #ffe4e6; color: #be123c; }

    /* Botón Tabla */
    .btn-outline-blue {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: var(--accent);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-outline-blue:hover {
      background: #f1f5f9;
      border-color: var(--accent);
    }

    .empty-state {
      text-align: center;
      padding: 40px !important;
      color: #94a3b8 !important;
      font-style: italic;
    }

    .btn-delete-row {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .btn-delete-row:hover {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
      transform: scale(1.1);
    }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    .modal-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ============ VISTA DETALLE RESPUESTAS PREMIUM ============ */
    .detalle-respuestas-view {
      animation: fadeIn 0.4s ease;
      width: 100%;
    }

    .detalle-header-premium {
      margin-bottom: 28px;
    }

    .btn-volver-premium {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 16px;
    }
    .btn-volver-premium svg { width: 16px; height: 16px; }
    .btn-volver-premium:hover {
      background: #f1f5f9;
      color: var(--accent);
      border-color: #93c5fd;
    }

    .detalle-titulo-wrapper {}
    .detalle-titulo {
      margin: 0 0 6px 0;
      font-size: 26px;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.2;
    }
    .detalle-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .detalle-badge-tipo {
      background: #eff6ff;
      color: var(--accent);
      padding: 3px 10px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detalle-separador { color: #cbd5e1; font-weight: 300; }
    .detalle-count { color: #94a3b8; font-size: 13px; font-weight: 500; }

    /* Export Actions */
    .detalle-export-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .btn-export-detail {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-export-detail svg { width: 16px; height: 16px; flex-shrink: 0; }
    .btn-export-csv {
      background: linear-gradient(135deg, var(--accent), var(--accent));
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .btn-export-csv:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
    }
    .btn-export-pdf {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }
    .btn-export-pdf:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
    }

    /* Loading */
    .loading-respuestas {
      text-align: center;
      padding: 60px 20px;
    }
    .loading-respuestas p { color: #94a3b8; margin-top: 16px; font-size: 14px; }
    .loading-pulse {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: var(--accent);
      margin: 0 auto;
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(0.8); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 1; }
    }

    /* Empty State */
    .empty-respuestas {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 20px;
      border: 2px dashed #e2e8f0;
    }
    .empty-icon-circle {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
    }
    .empty-icon-circle svg { width: 32px; height: 32px; color: #94a3b8; }
    .empty-respuestas h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 700;
      color: #475569;
    }
    .empty-respuestas p {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
      max-width: 400px;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* Respuestas Grid */
    .respuestas-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .respuesta-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: white;
      border-radius: 16px;
      padding: 16px 20px;
      border: 1px solid #f1f5f9;
      transition: all 0.25s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .respuesta-card:hover {
      border-color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      transform: translateX(4px);
    }

    .respuesta-avatar {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .respuesta-avatar span {
      color: white;
      font-size: 14px;
      font-weight: 800;
    }

    .respuesta-info { flex: 1; min-width: 0; }

    .respuesta-linea-principal {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .respuesta-instrumento {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .respuesta-puntaje-badge {
      background: #dcfce7;
      color: #16a34a;
      padding: 2px 8px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 700;
    }
    .respuesta-puntaje-na {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 500;
      font-style: italic;
    }

    .respuesta-linea-secundaria {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .respuesta-fecha, .respuesta-token {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .respuesta-fecha svg, .respuesta-token svg {
      width: 13px; height: 13px;
    }
    .respuesta-token { font-family: 'SF Mono', 'Fira Code', monospace; }

    .respuesta-resultado-tag {
      background: #eff6ff;
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 600;
    }

    .btn-eliminar-respuesta {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: transparent;
      border: 1px solid transparent;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .btn-eliminar-respuesta svg { width: 16px; height: 16px; }
    .btn-eliminar-respuesta:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #ef4444;
      transform: scale(1.1);
    }

    @keyframes emptyFadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ======= STATS CARDS ======= */
    .stats-header {
      margin-bottom: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 12px;
    }

    @media (max-width: 1400px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-card { padding: 12px 14px; gap: 10px; }
      .stat-icon { width: 36px; height: 36px; border-radius: 10px; }
      .stat-icon svg { width: 16px; height: 16px; }
      .stat-value { font-size: 20px !important; }
      .stat-value-sm { font-size: 11px !important; }
      .stat-label { font-size: 10px !important; }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: white;
      border-radius: 16px;
      border: 1px solid rgba(226, 232, 240, 0.6);
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: statSlideUp 0.5s ease-out backwards;
    }
    .stat-card:nth-child(1) { animation-delay: 0s; }
    .stat-card:nth-child(2) { animation-delay: 0.08s; }
    .stat-card:nth-child(3) { animation-delay: 0.16s; }
    .stat-card:nth-child(4) { animation-delay: 0.24s; }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border-color: rgba(59,130,246,0.15);
    }

    @keyframes statSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon svg { width: 20px; height: 20px; }
    .stat-icon-blue { background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.12)); color: var(--accent); }
    .stat-icon-teal { background: linear-gradient(135deg, rgba(var(--accent-rgb, 20, 184, 166), 0.12), rgba(81,182,165,0.12)); color: var(--accent); }
    .stat-icon-amber { background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.12)); color: var(--accent); }
    .stat-icon-purple { background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(168,85,247,0.12)); color: var(--accent); }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.1;
      letter-spacing: -0.5px;
    }
    .stat-value-sm {
      font-size: 16px;
      font-weight: 700;
    }

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .refresh-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (max-width: 768px) {
      .refresh-row { justify-content: center; gap: 8px; }
      .refresh-row button { font-size: 12px; padding: 6px 12px; }
      .last-updated { width: 100%; text-align: center; }
    }

    .last-updated {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .btn-refresh svg { width: 14px; height: 14px; transition: transform 0.4s ease; }
    .btn-refresh:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #1e293b;
    }
    .btn-refresh:hover svg { transform: rotate(-45deg); }
    .btn-refresh.refreshing svg {
      animation: spinRefresh 1s linear infinite;
    }
    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @keyframes spinRefresh {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }

    /* ======= CLEANUP PANEL ======= */
    .btn-cleanup-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .btn-cleanup-toggle svg { width: 14px; height: 14px; }
    .btn-cleanup-toggle:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; }
    .btn-cleanup-toggle.active { background: #fef2f2; border-color: #f87171; color: #ef4444; }

    .cleanup-panel {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      animation: statSlideUp 0.3s ease-out;
    }

    .cleanup-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 16px;
    }

    .cleanup-title {
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .cleanup-desc {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .btn-analyze {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent));
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-analyze svg { width: 16px; height: 16px; }
    .btn-analyze:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .btn-analyze:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .spin-icon { animation: spinRefresh 1s linear infinite; }

    .cleanup-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 900px) { .cleanup-grid { grid-template-columns: 1fr; } }

    .cleanup-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 18px;
      border: 1px solid #f1f5f9;
      border-radius: 14px;
      background: #fafbfc;
      transition: all 0.25s ease;
    }
    .cleanup-card.has-items { border-color: #fecaca; background: #fffbfb; }

    .cleanup-card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cleanup-card-icon svg { width: 18px; height: 18px; }
    .cleanup-icon-orange { background: rgba(249,115,22,0.1); color: #f97316; }
    .cleanup-icon-blue { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); }
    .cleanup-icon-purple { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); }
    .cleanup-icon-red { background: rgba(239,68,68,0.1); color: #ef4444; }

    .cleanup-card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .cleanup-card-title { font-size: 14px; font-weight: 700; color: #1e293b; }
    .cleanup-card-desc { font-size: 12px; color: #94a3b8; line-height: 1.4; }
    .cleanup-card-count { font-size: 13px; font-weight: 700; color: #ef4444; margin-top: 4px; }
    .cleanup-card-count.zero { color: #22c55e; }

    .cleanup-date-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .cleanup-date-input {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 12px;
      color: #475569;
      background: white;
    }
    .btn-reanalyze {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-reanalyze:hover { background: #f1f5f9; color: var(--accent); }

    .btn-cleanup-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid #fecaca;
      background: white;
      color: #ef4444;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      align-self: center;
      flex-shrink: 0;
    }
    .btn-cleanup-action svg { width: 14px; height: 14px; }
    .btn-cleanup-action:hover { background: #fef2f2; transform: translateY(-1px); }
    .btn-cleanup-action:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    /* Confirm Modal */
    .cleanup-confirm-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }
    .cleanup-confirm-modal {
      background: white;
      border-radius: 20px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: statSlideUp 0.3s ease-out;
    }
    .cleanup-confirm-icon { font-size: 48px; margin-bottom: 16px; }
    .cleanup-confirm-modal h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; }
    .cleanup-confirm-modal p { font-size: 14px; color: #64748b; margin: 0 0 8px 0; }
    .cleanup-warning { color: #ef4444 !important; font-weight: 600; font-size: 13px !important; }
    .cleanup-confirm-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: center; }
    .btn-cancel-cleanup {
      padding: 10px 24px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-cancel-cleanup:hover { background: #f8fafc; }
    .btn-confirm-cleanup {
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-confirm-cleanup:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
    .btn-confirm-cleanup:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

    /* ======= PRO PANEL ======= */
    .btn-pro-toggle {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      border-radius: 10px; border: 1px solid #e2e8f0; background: white;
      color: #475569; font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.25s ease;
    }
    .btn-pro-toggle svg { width: 14px; height: 14px; }
    .btn-pro-toggle:hover { background: #fffbeb; border-color: #fcd34d; color: #b45309; }
    .btn-pro-toggle.active { background: linear-gradient(135deg, #fef3c7, #fde68a); border-color: var(--accent); color: #92400e; }

    .pro-panel {
      background: white; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      animation: statSlideUp 0.3s ease-out;
    }
    .pro-panel-header { margin-bottom: 20px; }
    .pro-panel-title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; }
    .pro-panel-desc { font-size: 13px; color: #94a3b8; margin: 0; }

    .pro-sections { display: flex; flex-direction: column; gap: 8px; }

    .pro-section { border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; transition: all 0.2s ease; }
    .pro-section:hover { border-color: #e2e8f0; }

    .pro-section-toggle {
      display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px;
      background: #fafbfc; border: none; cursor: pointer; transition: all 0.2s ease;
      text-align: left; font-size: 14px; color: #1e293b;
    }
    .pro-section-toggle:hover { background: #f1f5f9; }

    .pro-section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .pro-section-label { flex: 1; font-weight: 700; }
    .pro-section-badge { font-size: 11px; padding: 3px 10px; border-radius: 50px; background: rgba(34,197,94,0.1); color: #16a34a; font-weight: 600; }
    .pro-section-badge.warning { background: rgba(239,68,68,0.1); color: #ef4444; }

    .pro-chevron { width: 16px; height: 16px; color: #94a3b8; transition: transform 0.3s ease; flex-shrink: 0; }
    .pro-chevron.open { transform: rotate(180deg); }

    .pro-section-body { padding: 16px 18px; border-top: 1px solid #f1f5f9; animation: statSlideUp 0.25s ease-out; }
    .pro-loading { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; }
    .pro-empty { text-align: center; padding: 24px; color: #64748b; font-size: 14px; }

    /* Quality Score */
    .quality-grid { display: flex; gap: 24px; align-items: flex-start; }
    @media (max-width: 768px) { .quality-grid { flex-direction: column; align-items: center; } }

    .quality-gauge { display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
    .gauge-circle {
      width: 100px; height: 100px; border-radius: 50%; border: 6px solid #22c55e;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: border-color 0.5s ease;
    }
    .gauge-value { font-size: 32px; font-weight: 800; color: #1e293b; line-height: 1; }
    .gauge-label { font-size: 12px; color: #94a3b8; font-weight: 600; }
    .gauge-subtitle { font-size: 12px; color: #64748b; font-weight: 600; }

    .quality-metrics { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .quality-metric { display: flex; flex-direction: column; gap: 4px; }
    .qm-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .qm-bar { width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .qm-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
    .qm-value { font-size: 13px; font-weight: 700; color: #1e293b; }

    /* Anomaly tables */
    .anomaly-stats { display: flex; gap: 24px; flex-wrap: wrap; padding: 12px 16px; background: #f8fafc; border-radius: 10px; margin-bottom: 16px; font-size: 13px; color: #64748b; }
    .anomaly-group { margin-bottom: 16px; }
    .anomaly-group h4 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
    .anomaly-table { display: flex; flex-direction: column; gap: 0; border: 1px solid #f1f5f9; border-radius: 10px; overflow: hidden; }
    .anomaly-row { display: grid; grid-template-columns: 1fr 80px 100px; gap: 8px; padding: 10px 14px; font-size: 13px; color: #475569; border-bottom: 1px solid #f8fafc; }
    .anomaly-header { background: #f8fafc; color: #94a3b8; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .text-red { color: #ef4444; font-weight: 600; }

    /* Charts (CSS bars) */
    .trend-section { margin-bottom: 20px; }
    .trend-section h4 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0; }
    .chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 140px; padding: 0 4px; border-bottom: 1px solid #e2e8f0; }
    .chart-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
    .chart-bar { width: 100%; min-height: 4px; border-radius: 4px 4px 0 0; transition: height 0.6s ease; }
    .chart-bar-value { font-size: 10px; font-weight: 700; color: #1e293b; }
    .chart-bar-label { font-size: 9px; color: #94a3b8; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    /* Storage */
    .storage-grid { display: flex; flex-direction: column; gap: 12px; }
    .storage-item { display: flex; flex-direction: column; gap: 4px; }
    .storage-info { display: flex; justify-content: space-between; align-items: center; }
    .storage-name { font-size: 13px; font-weight: 700; color: #1e293b; }
    .storage-count { font-size: 12px; color: #94a3b8; }
    .storage-bar { width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .storage-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent)); border-radius: 4px; transition: width 0.6s ease; min-width: 2px; }
    .storage-total { padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; }

    /* Import */
    .import-file-input { display: none; }
    .import-zone { margin-bottom: 16px; }
    .import-label {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 24px; border: 2px dashed #e2e8f0; border-radius: 14px;
      cursor: pointer; transition: all 0.25s ease; color: #64748b; text-align: center;
    }
    .import-label:hover { border-color: var(--accent); background: rgba(59,130,246,0.02); }
    .import-label svg { width: 32px; height: 32px; color: #94a3b8; }
    .import-label small { font-size: 11px; color: #94a3b8; }
    .import-preview { padding: 16px; background: #f8fafc; border-radius: 12px; }
    .import-preview h4 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
    .import-preview p { font-size: 13px; color: #64748b; margin: 0 0 12px 0; }
    .import-note { color: var(--accent); font-size: 12px; font-weight: 600; margin-top: 12px; }

    /* Export options */
    .export-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 768px) { .export-grid { grid-template-columns: 1fr; } }
    .export-option {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 16px; border: 1px solid #e2e8f0; border-radius: 14px;
      background: white; cursor: pointer; transition: all 0.25s ease;
    }
    .export-option:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .export-option svg { width: 24px; height: 24px; color: var(--accent); }
    .export-format { font-size: 16px; font-weight: 800; color: #1e293b; }
    .export-desc { font-size: 11px; color: #94a3b8; text-align: center; }
  `]
})
export class AdminResultadosComponent implements OnInit {

  activeTab: 'tests' | 'baterias' | 'casos' | 'encuestas' | 'bitacoras' | 'entrenamientos' = 'tests';
  // modoVista eliminado por obsolescencia
  vistaActual: string = 'lista-tests';

  testSeleccionado: string | null = null;
  testSeleccionadoId: string | null = null;

  listaDeTests: TestAgrupadoItem[] = [];
  resultadosData: ResultadoItem[] = [];

  resultadosFiltrados: ResultadoItem[] = [];
  datosGlobales: ResultadoItem[] = [];
  cargandoDatos: boolean = true;
  cargandoRaw: boolean = false;
  ultimaActualizacion: Date | null = null;

  rawDataBateriasBase: any[] = [];
  rawDataBaterias: any[] = [];
  rawDataCasosBase: any[] = [];
  rawDataCasos: any[] = [];
  rawDataEncuestasBase: any[] = [];
  rawDataEncuestas: any[] = [];
  rawDataBitacorasBase: any[] = [];
  rawDataBitacoras: any[] = [];
  rawDataEntrenamientosBase: any[] = [];
  rawDataEntrenamientos: any[] = [];

  // Modal de eliminación (Tests detalle)
  showDeleteModal: boolean = false;
  registroAEliminar: ResultadoItem | null = null;
  eliminando: boolean = false;

  // Vista de detalle genérica (Encuestas, Baterías, etc.)
  vistaDetalleGenerico: boolean = false;
  detalleGenericoId: string = '';
  detalleGenericoNombre: string = '';
  detalleGenericoTipo: string = '';
  respuestasInstrumento: any[] = [];
  cargandoRespuestas: boolean = false;

  // Modal de eliminación genérico
  showDeleteModalGenerico: boolean = false;
  respuestaAEliminar: any = null;
  eliminandoGenerico: boolean = false;

  // Cleanup (Limpieza de datos)
  showCleanupPanel: boolean = false;
  analizandoLimpieza: boolean = false;
  ejecutandoLimpieza: boolean = false;
  cleanupAnalysis: any = null;
  cleanupCutoffDate: string = '';
  showCleanupConfirm: boolean = false;
  cleanupConfirmAction: string = '';
  cleanupConfirmLabel: string = '';
  cleanupConfirmCount: number = 0;

  // Pro Tools
  showProPanel: boolean = false;
  proActiveSection: string = '';
  proQuality: any = null;
  proLoadingQuality: boolean = false;
  proAnomalies: any = null;
  proLoadingAnomalies: boolean = false;
  proTrends: any = null;
  proLoadingTrends: boolean = false;
  proStorage: any = null;
  proLoadingStorage: boolean = false;
  importPreview: any[] | null = null;
  importFileName: string = '';
  importPreviewKeys: string[] = [];

  // Datos del usuario actual para filtrado de seguridad
  currentUser: any = null;
  currentRoleId: number = 0;
  currentUserId: string = '';

  constructor(
    private http: HttpClient,
    private bateriasService: BateriasDataService,
    private simuladorService: SimuladorDataService,
    private encuestasService: EncuestasDataService,
    private bitacorasService: BitacorasDataService,
    private entrenamientosService: EntrenamientosDataService,
    private toast: ToastService
  ) {
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.currentRoleId = this.currentUser?.role_id || 0;
        this.currentUserId = this.currentUser?._id || this.currentUser?.id || '';
      }
    } catch (e) { }
  }

  // ---- STATS CARDS (computed) ----
  get statsInstrumentos(): number {
    return this.listaDeTestsBase.length;
  }

  get statsEvaluados(): number {
    return this.resultadosData.length;
  }

  get statsPromedio(): number {
    if (this.resultadosData.length === 0) return 0;
    const conPuntaje = this.resultadosData.filter(r => r.puntaje > 0);
    if (conPuntaje.length === 0) return 0;
    const total = conPuntaje.reduce((sum, r) => sum + r.puntaje, 0);
    return Math.round(total / conPuntaje.length);
  }

  get statsUltimoEnvio(): string {
    if (this.resultadosData.length === 0) return 'Sin envíos';
    // Las respuestas vienen ordenadas por fecha desc desde el backend
    const primera = this.resultadosData[0];
    if (!primera.fecha || primera.fecha === 'Sin fecha') return 'Sin fecha';
    return primera.fecha;
  }

  get tiempoDesdeActualizacion(): string {
    if (!this.ultimaActualizacion) return '';
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - this.ultimaActualizacion.getTime()) / 1000);
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return this.ultimaActualizacion.toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  refrescarDatos() {
    // Forzar recarga limpiando cache de todas las pestañas
    this.rawDataBateriasBase = [];
    this.rawDataBaterias = [];
    this.rawDataCasosBase = [];
    this.rawDataCasos = [];
    this.rawDataEncuestasBase = [];
    this.rawDataEncuestas = [];
    this.rawDataBitacorasBase = [];
    this.rawDataBitacoras = [];
    this.rawDataEntrenamientosBase = [];
    this.rawDataEntrenamientos = [];
    this.cargarMetadataCompleta();
    // También recargar la pestaña activa si no es 'tests'
    if (this.activeTab !== 'tests') {
      this.cargarDataPestanaActual();
    }
  }

  // ---- CLEANUP (Limpieza de datos) ----
  toggleCleanupPanel() {
    this.showCleanupPanel = !this.showCleanupPanel;
    if (this.showCleanupPanel && !this.cleanupAnalysis) {
      // Defaults: fecha de corte = hace 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      this.cleanupCutoffDate = sixMonthsAgo.toISOString().slice(0, 10);
      this.analizarLimpieza();
    }
  }

  analizarLimpieza() {
    this.analizandoLimpieza = true;
    const params = this.cleanupCutoffDate ? `?cutoffDate=${this.cleanupCutoffDate}` : '';
    this.http.get<any>(`/api/export/cleanup/analyze${params}`).subscribe({
      next: (res: any) => {
        this.cleanupAnalysis = res.data;
        this.analizandoLimpieza = false;
      },
      error: (err: any) => {
        console.error('Error analizando limpieza:', err);
        this.toast.error('Error al analizar la base de datos.');
        this.analizandoLimpieza = false;
      }
    });
  }

  onCutoffDateChange(event: any) {
    this.cleanupCutoffDate = event.target.value;
  }

  confirmarLimpieza(action: string, label: string, count: number) {
    this.cleanupConfirmAction = action;
    this.cleanupConfirmLabel = label;
    this.cleanupConfirmCount = count;
    this.showCleanupConfirm = true;
  }

  cancelarLimpieza() {
    this.showCleanupConfirm = false;
    this.cleanupConfirmAction = '';
  }

  ejecutarLimpieza() {
    this.ejecutandoLimpieza = true;
    const body: any = { action: this.cleanupConfirmAction };
    if (this.cleanupConfirmAction === 'old-data') {
      body.cutoffDate = this.cleanupCutoffDate;
    }
    this.http.post<any>('/api/export/cleanup/execute', body).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || 'Limpieza completada.');
        this.ejecutandoLimpieza = false;
        this.showCleanupConfirm = false;
        // Re-analizar y refrescar datos
        this.analizarLimpieza();
        this.refrescarDatos();
      },
      error: (err: any) => {
        console.error('Error ejecutando limpieza:', err);
        this.toast.error('Error al ejecutar la limpieza.');
        this.ejecutandoLimpieza = false;
      }
    });
  }

  // ---- PRO TOOLS ----
  toggleProPanel() {
    this.showProPanel = !this.showProPanel;
  }

  toggleProSection(section: string) {
    this.proActiveSection = this.proActiveSection === section ? '' : section;
    if (this.proActiveSection === section) {
      if (section === 'quality' && !this.proQuality) this.cargarProQuality();
      if (section === 'anomalies' && !this.proAnomalies) this.cargarProAnomalies();
      if (section === 'trends' && !this.proTrends) this.cargarProTrends();
      if (section === 'storage' && !this.proStorage) this.cargarProStorage();
    }
  }

  cargarProQuality() {
    this.proLoadingQuality = true;
    this.http.get<any>('/api/export/pro/quality').subscribe({
      next: (res: any) => { this.proQuality = res.data; this.proLoadingQuality = false; },
      error: () => { this.toast.error('Error al cargar calidad de datos.'); this.proLoadingQuality = false; }
    });
  }

  cargarProAnomalies() {
    this.proLoadingAnomalies = true;
    this.http.get<any>('/api/export/pro/anomalies').subscribe({
      next: (res: any) => { this.proAnomalies = res.data; this.proLoadingAnomalies = false; },
      error: () => { this.toast.error('Error al detectar anomalías.'); this.proLoadingAnomalies = false; }
    });
  }

  cargarProTrends() {
    this.proLoadingTrends = true;
    this.http.get<any>('/api/export/pro/trends').subscribe({
      next: (res: any) => { this.proTrends = res.data; this.proLoadingTrends = false; },
      error: () => { this.toast.error('Error al cargar tendencias.'); this.proLoadingTrends = false; }
    });
  }

  cargarProStorage() {
    this.proLoadingStorage = true;
    this.http.get<any>('/api/export/pro/storage').subscribe({
      next: (res: any) => { this.proStorage = res.data; this.proLoadingStorage = false; },
      error: () => { this.toast.error('Error al cargar almacenamiento.'); this.proLoadingStorage = false; }
    });
  }

  formatTiempo(seconds: number): string {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }

  getBarHeight(value: number, data: any[]): number {
    const max = Math.max(...data.map((d: any) => d.count || 0), 1);
    return Math.max(5, (value / max) * 100);
  }

  getStoragePercent(mb: number): number {
    if (!this.proStorage) return 0;
    const maxMB = Math.max(...this.proStorage.collections.map((c: any) => c.estimatedMB), 0.01);
    return Math.max(2, (mb / maxMB) * 100);
  }

  getCollectionLabel(name: string): string {
    const labels: any = {
      admisions: '📋 Respuestas',
      tests: '📝 Tests',
      baterias: '📦 Baterías',
      encuestas: '📊 Encuestas',
      bitacoras: '⚡ Bitácoras',
      entrenamientos: '🎓 Entrenamientos',
      users: '👤 Usuarios'
    };
    return labels[name] || name;
  }

  onImportFileSelect(event: any) {
    const file = event.target.files?.[0];
    if (file) this.parseImportFile(file);
  }

  onImportDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.parseImportFile(file);
  }

  private parseImportFile(file: File) {
    this.importFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          this.importPreview = Array.isArray(data) ? data : (data.records || [data]);
        } else {
          // CSV parsing
          const lines = content.split('\n').filter((l: string) => l.trim());
          if (lines.length < 2) { this.importPreview = []; return; }
          const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
          this.importPreview = lines.slice(1).map((line: string) => {
            const vals = line.split(',').map((v: string) => v.trim().replace(/"/g, ''));
            const obj: any = {};
            headers.forEach((h: string, i: number) => obj[h] = vals[i] || '');
            return obj;
          });
        }
        this.importPreviewKeys = this.importPreview && this.importPreview.length > 0
          ? Object.keys(this.importPreview[0]) : [];
        this.toast.success(`${this.importPreview?.length || 0} registros detectados en ${file.name}`);
      } catch (err) {
        this.toast.error('Error al parsear el archivo. Verifica el formato.');
        this.importPreview = null;
      }
    };
    reader.readAsText(file);
  }

  exportarJSON() {
    window.open(`${environment.apiBaseUrl}/api/export/pro/export-json`, '_blank');
  }

  exportarTodosCSV() {
    // Genera un CSV global con todos los datos disponibles
    const allData = this.obtenerTodosLosDatos();
    if (allData.length === 0) {
      this.toast.error('No hay datos para exportar.');
      return;
    }
    const headers = ['ID', 'Instrumento', 'Tipo', 'Candidato', 'Puntaje', 'Resultado', 'Fecha'];
    const csvLines = [headers.join(',')];
    allData.forEach((r: any) => {
      csvLines.push([
        r.id, `"${r.nombreTest || ''}"`, r.tipo || '', `"${r.nombreUsuario || ''}"`, r.puntaje || '', `"${r.resultado || ''}"`, r.fecha || ''
      ].join(','));
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testea_global_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exportación global CSV completada.');
  }

  exportarTabCSV(tab: string) {
    let data: any[] = [];
    let label = '';
    switch (tab) {
      case 'baterias': data = this.rawDataBaterias; label = 'baterias'; break;
      case 'casos': data = this.rawDataCasos; label = 'simuladores'; break;
      case 'encuestas': data = this.rawDataEncuestas; label = 'encuestas'; break;
      case 'bitacoras': data = this.rawDataBitacoras; label = 'bitacoras'; break;
      case 'entrenamientos': data = this.rawDataEntrenamientos; label = 'entrenamientos'; break;
      default: return;
    }
    if (data.length === 0) {
      this.toast.error('No hay datos para exportar.');
      return;
    }

    // Recopilar todas las claves únicas
    const allKeys = new Set<string>();
    data.forEach((item: any) => {
      Object.keys(item).forEach(k => {
        if (!k.startsWith('_') && k !== '__v') allKeys.add(k);
      });
    });
    const cabeceras = Array.from(allKeys);

    const csvContent = [
      cabeceras.join(','),
      ...data.map((item: any) =>
        cabeceras.map(key => {
          let val = item[key];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'object') val = JSON.stringify(val);
          return '"' + String(val).replace(/"/g, '""') + '"';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `testea_${label}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.success(`CSV de ${label} exportado: ${data.length} registros.`);
  }

  ngOnInit(): void {
    this.cargarMetadataCompleta();
  }

  cambiarTab(tab: 'tests' | 'baterias' | 'casos' | 'encuestas' | 'bitacoras' | 'entrenamientos') {
    // Cerrar cualquier vista de detalle abierta
    this.vistaActual = 'lista-tests';
    this.testSeleccionado = null;
    this.testSeleccionadoId = null;
    this.vistaDetalleGenerico = false;
    this.detalleGenericoId = '';
    this.detalleGenericoNombre = '';
    this.respuestasInstrumento = [];

    this.activeTab = tab;
    this.cargarDataPestanaActual();
  }

  cargarDataPestanaActual() {
    if (this.activeTab === 'baterias' && this.rawDataBateriasBase.length === 0) {
      this.cargandoRaw = true;
      this.bateriasService.getRawData().subscribe({
        next: (res: any) => {
          this.rawDataBateriasBase = res.data || [];
          this.rawDataBaterias = [...this.rawDataBateriasBase];
          this.cargandoRaw = false;
        },
        error: (err: any) => {
          console.error('Error cargando baterías:', err);
          this.toast.error('Error al cargar datos de baterías.');
          this.cargandoRaw = false;
        }
      });
    } else if (this.activeTab === 'casos' && this.rawDataCasosBase.length === 0) {
      this.cargandoRaw = true;
      this.simuladorService.getRawData().subscribe({
        next: (res: any) => {
          this.rawDataCasosBase = res.data || [];
          this.rawDataCasos = [...this.rawDataCasosBase];
          this.cargandoRaw = false;
        },
        error: (err: any) => {
          console.error('Error cargando simuladores:', err);
          this.toast.error('Error al cargar datos de simuladores.');
          this.cargandoRaw = false;
        }
      });
    } else if (this.activeTab === 'encuestas' && this.rawDataEncuestasBase.length === 0) {
      this.cargandoRaw = true;
      this.encuestasService.getRawData().subscribe({
        next: (res: any) => {
          this.rawDataEncuestasBase = res.data || [];
          this.rawDataEncuestas = [...this.rawDataEncuestasBase];
          this.cargandoRaw = false;
        },
        error: (err: any) => {
          console.error('Error cargando encuestas:', err);
          this.toast.error('Error al cargar datos de encuestas.');
          this.cargandoRaw = false;
        }
      });
    } else if (this.activeTab === 'bitacoras' && this.rawDataBitacorasBase.length === 0) {
      this.cargandoRaw = true;
      this.bitacorasService.getRawData().subscribe({
        next: (res: any) => {
          this.rawDataBitacorasBase = res.data || [];
          this.rawDataBitacoras = [...this.rawDataBitacorasBase];
          this.cargandoRaw = false;
        },
        error: (err: any) => {
          console.error('Error cargando bitácoras:', err);
          this.toast.error('Error al cargar datos de bitácoras.');
          this.cargandoRaw = false;
        }
      });
    } else if (this.activeTab === 'entrenamientos' && this.rawDataEntrenamientosBase.length === 0) {
      this.cargandoRaw = true;
      this.entrenamientosService.getRawData().subscribe({
        next: (res: any) => {
          this.rawDataEntrenamientosBase = res.data || [];
          this.rawDataEntrenamientos = [...this.rawDataEntrenamientosBase];
          this.cargandoRaw = false;
        },
        error: (err: any) => {
          console.error('Error cargando entrenamientos:', err);
          this.toast.error('Error al cargar datos de entrenamientos.');
          this.cargandoRaw = false;
        }
      });
    }
  }

  cargarMetadataCompleta() {
    this.cargandoDatos = true;
    // Construir URL con params de seguridad para filtrado por rol
    let testListUrl = '/api/test/list';
    if (this.currentRoleId && this.currentUserId) {
      testListUrl += `?role_id=${this.currentRoleId}&user_id=${this.currentUserId}`;
    }
    forkJoin({
      tests: this.http.get<any>(testListUrl),
      baterias: this.http.get<any>(this.currentRoleId && this.currentUserId
        ? `/api/baterias?role_id=${this.currentRoleId}&user_id=${this.currentUserId}`
        : '/api/baterias'),
      respuestas: this.http.get<any>(this.currentRoleId && this.currentUserId
        ? `/api/export/responses?role_id=${this.currentRoleId}&user_id=${this.currentUserId}`
        : '/api/export/responses')
    }).subscribe({
      next: (res: any) => {
        // 1. Indexar respuestas reales por instrumentoId para contar evaluados
        const respuestasPorInstrumento: { [key: string]: any[] } = {};
        const todasLasRespuestas: ResultadoItem[] = [];
        let rIndex = 1;

        if (res.respuestas && res.respuestas.data) {
          res.respuestas.data.forEach((r: any) => {
            const instId = r.instrumentoId || '';
            if (!respuestasPorInstrumento[instId]) {
              respuestasPorInstrumento[instId] = [];
            }
            respuestasPorInstrumento[instId].push(r);
          });
        }

        let pruebasConsolidadas: TestAgrupadoItem[] = [];

        // 2. Mapear Tests reales (excluir soft-deleted)
        if (res.tests && res.tests.data) {
          const testsActivos = res.tests.data.filter((t: any) => !t.isDeleted);
          testsActivos.forEach((t: any) => {
            const testId = t.id;
            const respuestasDeEsteTest = respuestasPorInstrumento[testId] || [];
            const numEvaluados = respuestasDeEsteTest.length;

            pruebasConsolidadas.push({
              id: testId,
              nombre: t.title || t.nombre || `Prueba ${rIndex}`,
              totalEvaluados: numEvaluados,
              colorClass: t.colorClass ? t.colorClass.replace('bg-', 'bg-icon-') : 'bg-icon-purple',
              activo: t.status === '1' || t.status === true || t.activo === true,
              tipo: 'Test',
              creado_por: t.autor_nombre || 'Sistema',
              fechaAlta: t.createdAt || t.fechaCreacion || new Date().toISOString()
            });

            // Mapear resultados REALES para la tabla de detalle
            respuestasDeEsteTest.forEach((r: any) => {
              todasLasRespuestas.push({
                id: r._id,
                fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Sin fecha',
                nombreUsuario: r.identificador || `Respuesta #${r.numero || rIndex}`,
                nombreTest: t.title || t.nombre || 'Sin nombre',
                puntaje: r.puntaje ?? 0,
                resultado: r.resultado || ''
              });
              rIndex++;
            });
          });
        }

        // 3. Mapear Baterías reales
        if (res.baterias && res.baterias.data) {
          res.baterias.data.forEach((b: any) => {
            const batId = b.id;
            const respuestasDeEstaBat = respuestasPorInstrumento[batId] || [];
            const numEvaluados = respuestasDeEstaBat.length;

            pruebasConsolidadas.push({
              id: batId,
              nombre: b.title,
              totalEvaluados: numEvaluados,
              colorClass: b.colorClass ? b.colorClass.replace('bg-', 'bg-icon-') : 'bg-icon-blue',
              activo: b.activo !== false,
              tipo: 'Batería',
              creado_por: b.creado_por || 'Sistema',
              fechaAlta: b.fechaAlta || new Date().toISOString()
            });

            respuestasDeEstaBat.forEach((r: any) => {
              todasLasRespuestas.push({
                id: r._id,
                fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Sin fecha',
                nombreUsuario: r.identificador || `Respuesta #${r.numero || rIndex}`,
                nombreTest: b.title || 'Sin nombre',
                puntaje: r.puntaje ?? 0,
                resultado: r.resultado || ''
              });
              rIndex++;
            });
          });
        }

        // Feed states con datos REALES
        this.listaDeTestsBase = pruebasConsolidadas;
        this.resultadosData = todasLasRespuestas;

        this.filtrarGridTests();

        this.resultadosFiltrados = [...this.resultadosData];
        this.datosGlobales = this.obtenerTodosLosDatos();
        this.cargandoDatos = false;
        this.ultimaActualizacion = new Date();
      },
      error: (err: any) => {
        console.error('Error cargando bases de datos:', err);
        this.cargandoDatos = false;
      }
    });
  }

  verDetalle(test: TestAgrupadoItem) {
    this.testSeleccionado = test.nombre;
    this.testSeleccionadoId = test.id;
    this.resultadosFiltrados = this.resultadosData.filter(res => res.nombreTest === test.nombre);
    this.vistaActual = 'detalle-candidatos';
  }

  volverListaTests() {
    this.vistaActual = 'lista-tests';
    this.testSeleccionado = null;
    this.testSeleccionadoId = null;
    this.resultadosFiltrados = [];
  }

  // ----------------------------------------------------
  // ENGINE FILTROS GRID MAESTRO
  // ----------------------------------------------------

  listaDeTestsBase: TestAgrupadoItem[] = [];
  listaDeTestsFiltrada: TestAgrupadoItem[] = [];

  filtroTextoTests: string = '';
  filtroTipo: string = 'Todos';
  filtroEstado: string = 'Todos';

  onFiltroTextoChange(e: any) { this.filtroTextoTests = e.target.value; this.filtrarGridTests(); }
  onFiltroTipoChange(e: any) { this.filtroTipo = e.target.value; this.filtrarGridTests(); }
  onFiltroEstadoChange(e: any) { this.filtroEstado = e.target.value; this.filtrarGridTests(); }

  filtrarGridTests() {
    let filtrados = [...this.listaDeTestsBase];

    // 1. Filtro Búsqueda Texto
    if (this.filtroTextoTests.trim() !== '') {
      const term = this.filtroTextoTests.toLowerCase();
      filtrados = filtrados.filter(t => t.nombre.toLowerCase().includes(term));
    }

    // 2. Filtro Tipo
    if (this.filtroTipo !== 'Todos') {
      filtrados = filtrados.filter(t => t.tipo === this.filtroTipo);
    }

    // 3. Filtro Estado
    if (this.filtroEstado !== 'Todos') {
      const wantActive = this.filtroEstado === 'Activos';
      filtrados = filtrados.filter(t => t.activo === wantActive);
    }

    this.listaDeTestsFiltrada = filtrados;
  }

  filtrosRaw: any = {
    baterias: { texto: '', select: 'Todos' },
    casos: { texto: '', select: 'Todos' },
    encuestas: { texto: '', select: 'Todos' },
    bitacoras: { texto: '', select: 'Todos' },
    entrenamientos: { texto: '', select: 'Todos' }
  };

  onFiltroDinamico(event: any, tipo: 'baterias' | 'casos' | 'encuestas' | 'bitacoras' | 'entrenamientos', campo: 'texto' | 'select' = 'texto') {
    if (campo === 'texto') {
      this.filtrosRaw[tipo].texto = event.target.value.toLowerCase();
    } else {
      this.filtrosRaw[tipo].select = event.target.value;
    }

    const term = this.filtrosRaw[tipo].texto;
    const select = this.filtrosRaw[tipo].select;

    if (tipo === 'baterias') {
      this.rawDataBaterias = this.rawDataBateriasBase.filter(i => {
        const matchT = (i.nombre?.toLowerCase() || '').includes(term) || (i.creado_por?.toLowerCase() || '').includes(term);
        const matchS = select === 'Todos' || (select === 'Activo' && i.activo) || (select === 'Inactivo' && !i.activo);
        return matchT && matchS;
      });
    } else if (tipo === 'casos') {
      this.rawDataCasos = this.rawDataCasosBase.filter(i => {
        const matchT = (i.nombre?.toLowerCase() || '').includes(term) || (i.creado_por?.toLowerCase() || '').includes(term);
        const matchS = select === 'Todos' || i.estado === select;
        return matchT && matchS;
      });
    } else if (tipo === 'encuestas') {
      this.rawDataEncuestas = this.rawDataEncuestasBase.filter(i => {
        const matchT = (i.nombre?.toLowerCase() || '').includes(term) || (i.creado_por?.toLowerCase() || '').includes(term);
        const matchS = select === 'Todos' || i.estado === select;
        return matchT && matchS;
      });
    } else if (tipo === 'bitacoras') {
      this.rawDataBitacoras = this.rawDataBitacorasBase.filter(i => {
        const matchT = (i.accion?.toLowerCase() || '').includes(term) || (i.usuarioAction?.toLowerCase() || '').includes(term) || (i.creado_por?.toLowerCase() || '').includes(term);
        const matchS = select === 'Todos' || (select === 'Sistema' && i.creado_por === 'Sistema');
        return matchT && matchS;
      });
    } else if (tipo === 'entrenamientos') {
      this.rawDataEntrenamientos = this.rawDataEntrenamientosBase.filter(i => {
        const matchT = (i.nombre?.toLowerCase() || '').includes(term) || (i.creado_por?.toLowerCase() || '').includes(term);
        const matchS = select === 'Todos' || (select === 'Activo' && i.activo) || (select === 'Inactivo' && !i.activo);
        return matchT && matchS;
      });
    }
  }


  // ----------------------------------------------------
  // LOGICA BASE E HISTÓRICA
  // ----------------------------------------------------

  obtenerTodosLosDatos(): ResultadoItem[] {
    // Cross reference with listaDeTestsBase for accurate tipo
    const tipoMap: { [nombre: string]: string } = {};
    this.listaDeTestsBase.forEach(t => { tipoMap[t.nombre] = t.tipo; });
    return this.resultadosData.map(res => ({
      ...res,
      tipo: tipoMap[res.nombreTest] || 'Test'
    }));
  }

  filtrarResultados(event: any) {
    const termino = event.target.value.toLowerCase();

    if (this.vistaActual === 'detalle-candidatos' && this.testSeleccionado) {
      this.resultadosFiltrados = this.resultadosData.filter(res =>
        res.nombreTest === this.testSeleccionado &&
        (res.nombreUsuario.toLowerCase().includes(termino) || res.fecha.includes(termino))
      );
    } else {
      // Búsqueda en vista global por lo cual buscaría en global globalData. Pero en HTML
      // actualmente el input está encapsulado en detalles. Si se requiere global search, este else es hit.
      this.resultadosFiltrados = this.resultadosData.filter(res =>
        res.nombreUsuario.toLowerCase().includes(termino) ||
        res.nombreTest.toLowerCase().includes(termino)
      );
    }
  }

  exportarCSV() {
    if (!this.testSeleccionadoId) return;
    // Usar el endpoint del backend que incluye TODAS las preguntas como columnas
    this.toast.success('Descargando CSV con todas las preguntas...');
    window.open(`${environment.apiBaseUrl}/api/export/results?testId=${this.testSeleccionadoId}`, '_blank');
  }

  async exportarTestPDF() {
    if (!this.testSeleccionadoId) return;
    this.toast.success('Generando PDF... Obteniendo datos completos.');

    try {
      // 1. Obtener la definición del test (con preguntas)
      const testDoc: any = await this.http.get<any>(`/api/test/${this.testSeleccionadoId}`).toPromise().catch(() => null);
      const preguntas: any[] = (testDoc?.datos?.preguntas || testDoc?.data?.preguntas || testDoc?.preguntas || [])
        .filter((p: any) => p.tipo !== 'system_settings' && p.typeId !== 'system_settings' && p.id !== 'SYSTEM_SETTINGS' && p.textoPregunta !== 'SYSTEM_SETTINGS' && p.text !== 'SYSTEM_SETTINGS');

      // Build ordered columns with ALL possible IDs per question (like CSV export)
      const pdfColumns: { label: string; ids: Set<string>; oMap: { [k: string]: string } }[] = [];
      let qNum = 0;
      preguntas.forEach((p: any) => {
        qNum++;
        const txt = `${qNum}. ${p.textoPregunta || p.text || p.label || p.pregunta || 'Pregunta'}`;
        const ids = new Set<string>();
        if (p.id) ids.add(String(p.id));
        if (p._id) ids.add(String(p._id));
        // Build option map for MCQ resolution — handle both raw (opciones) and API-transformed (options) formats
        const oMap: { [k: string]: string } = {};
        const opts = p.opciones || p.options || [];
        if (Array.isArray(opts)) {
          opts.forEach((opt: any, oIdx: number) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const label = isObj ? (opt.label || opt.texto || opt.value || String(opt)) : String(opt);
            oMap[String(oIdx)] = label;
            oMap[label] = label;
          });
        }
        pdfColumns.push({ label: txt, ids, oMap });
      });

      // 2. Obtener respuestas completas
      const admRes: any = await this.http.get<any>(`/api/export/responses-full?instrumentId=${this.testSeleccionadoId}`).toPromise().catch(() => null);
      let responses = admRes?.data || [];
      if (!Array.isArray(responses)) responses = [];

      // Cross-reference: match response questionIds to definition columns by position
      const allRespQids = new Set<string>();
      responses.forEach((r: any) => {
        if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
          r.resultadosCompletos.forEach((a: any) => allRespQids.add(String(a.questionId)));
        }
      });
      const matchedIds = new Set<string>();
      allRespQids.forEach(rqId => {
        pdfColumns.forEach(col => { if (col.ids.has(rqId)) matchedIds.add(rqId); });
      });
      const unmatchedRqIds = [...allRespQids].filter(id => !matchedIds.has(id));
      const matchedColIndices = new Set<number>();
      allRespQids.forEach(rqId => {
        pdfColumns.forEach((col, idx) => { if (col.ids.has(rqId)) matchedColIndices.add(idx); });
      });
      const unmatchedColIndices = pdfColumns.map((_, i) => i).filter(i => !matchedColIndices.has(i));
      if (unmatchedRqIds.length > 0 && unmatchedColIndices.length > 0) {
        const orderedUnmatched: string[] = [];
        for (const r of responses) {
          if (r.resultadosCompletos) {
            r.resultadosCompletos.forEach((a: any) => {
              const qId = String(a.questionId);
              if (unmatchedRqIds.includes(qId) && !orderedUnmatched.includes(qId)) orderedUnmatched.push(qId);
            });
            if (orderedUnmatched.length >= unmatchedRqIds.length) break;
          }
        }
        orderedUnmatched.forEach((rqId, i) => {
          if (i < unmatchedColIndices.length) pdfColumns[unmatchedColIndices[i]].ids.add(rqId);
        });
      }

      // Helper: resolve MCQ option values
      const resolveValue = (oMap: { [k: string]: string }, rawVal: any): string => {
        if (rawVal === null || rawVal === undefined) return '—';
        if (typeof rawVal === 'string' && rawVal.startsWith('data:image')) return '[Imagen/Firma adjunta]';
        if (typeof rawVal === 'object') return JSON.stringify(rawVal);
        const val = String(rawVal);
        if (!oMap || Object.keys(oMap).length === 0) return val;
        if (val.includes(',')) return val.split(',').map(p => oMap[p.trim()] || p.trim()).join(', ');
        if (oMap[val] !== undefined) return oMap[val];
        return val;
      };

      const jsPDFMod = await import('jspdf') as any;
      const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default || jsPDFMod;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(`Resultados: ${this.testSeleccionado || 'Test'}`, 15, 20);

      doc.setDrawColor(81, 182, 165);
      doc.setLineWidth(0.8);
      doc.line(15, 25, 195, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tipo: Test  |  Fecha: ${new Date().toLocaleDateString()}  |  Total: ${responses.length} respuesta(s)  |  Preguntas: ${pdfColumns.length}`, 15, 32);

      let yPos = 42;
      const pageHeight = 280;

      for (let i = 0; i < responses.length; i++) {
        const resp = responses[i];
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const name = resp.datosFormulario?.nombre || resp.nombreCandidato || `Respuesta #${i + 1}`;
        doc.text(`#${i + 1} — ${name}`, 15, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const fecha = resp.fechaFinalizacion ? new Date(resp.fechaFinalizacion).toLocaleString() : '—';
        const puntaje = resp.puntaje !== undefined && resp.puntaje !== null ? `${resp.puntaje} pts` : 'N/A';
        doc.text(`Fecha: ${fecha}  |  Puntaje: ${puntaje}`, 18, yPos);
        yPos += 6;

        // Build raw answer map from response
        const rawAnswers: { [key: string]: any } = {};
        if (resp.resultadosCompletos && Array.isArray(resp.resultadosCompletos)) {
          resp.resultadosCompletos.forEach((ans: any) => {
            rawAnswers[String(ans.questionId)] = ans.value;
          });
        }

        doc.setFontSize(9);
        for (const col of pdfColumns) {
          if (yPos > pageHeight - 10) { doc.addPage(); yPos = 20; }
          // Find answer by checking ALL registered IDs for this column
          let rawVal: any = undefined;
          for (const colId of col.ids) {
            if (rawAnswers[colId] !== undefined) { rawVal = rawAnswers[colId]; break; }
          }
          const answer = resolveValue(col.oMap, rawVal);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          const qLines = doc.splitTextToSize(`• ${col.label}`, 170);
          doc.text(qLines, 18, yPos);
          yPos += qLines.length * 4;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          const aLines = doc.splitTextToSize(answer, 165);
          doc.text(aLines, 22, yPos);
          yPos += aLines.length * 4 + 2;
        }

        yPos += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(15, yPos - 2, 195, yPos - 2);
        yPos += 3;
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Testea Engine | Pág ${p}/${totalPages}`, 105, 290, { align: 'center' });
      }

      const slug = (this.testSeleccionado || 'test').replace(/\s+/g, '_');
      doc.save(`Reporte_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`);
      this.toast.success('PDF generado con todas las preguntas.');
    } catch (e) {
      console.error('Error generando PDF:', e);
      this.toast.error('Error al generar el PDF. Intenta nuevamente.');
    }
  }

  verDetalleCandidato(id: string) {
    // Abrir la vista de detalle genérica para esta respuesta individual
    const resultado = this.resultadosFiltrados.find(r => r.id === id);
    if (resultado) {
      this.abrirDetalleInstrumento(
        this.testSeleccionadoId || '',
        resultado.nombreTest,
        'Test'
      );
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 70) return 'score-med';
    return 'score-low';
  }

  // ---- ELIMINACIÓN DE REGISTROS INDIVIDUALES ----
  abrirModalEliminar(registro: ResultadoItem) {
    this.registroAEliminar = registro;
    this.showDeleteModal = true;
  }

  cerrarModalEliminar() {
    this.showDeleteModal = false;
    this.registroAEliminar = null;
    this.eliminando = false;
  }

  confirmarEliminacion() {
    if (!this.registroAEliminar) return;
    this.eliminando = true;

    this.http.delete<any>(`/api/export/response/${this.registroAEliminar.id}`).subscribe({
      next: (res: any) => {
        // Remover de las listas locales sin recargar todo
        const deletedId = this.registroAEliminar!.id;
        this.resultadosFiltrados = this.resultadosFiltrados.filter(r => r.id !== deletedId);
        this.resultadosData = this.resultadosData.filter(r => r.id !== deletedId);
        this.cerrarModalEliminar();
      },
      error: (err: any) => {
        console.error('Error eliminando registro:', err);
        this.toast.error(err.error?.message || 'Error al eliminar el registro. Intenta nuevamente.');
        this.eliminando = false;
      }
    });
  }

  // ---- VISTA DETALLE GENÉRICA (Encuestas, Baterías, etc.) ----
  abrirDetalleInstrumento(instrumentId: string, nombre: string, tipo: string) {
    this.detalleGenericoId = instrumentId;
    this.detalleGenericoNombre = nombre;
    this.detalleGenericoTipo = tipo;
    this.vistaDetalleGenerico = true;
    this.cargandoRespuestas = true;
    this.respuestasInstrumento = [];

    this.http.get<any>(`/api/export/responses?instrumentId=${instrumentId}`).subscribe({
      next: (res: any) => {
        this.respuestasInstrumento = res.data || [];
        this.cargandoRespuestas = false;
      },
      error: (err: any) => {
        console.error('Error cargando respuestas:', err);
        this.cargandoRespuestas = false;
      }
    });
  }

  cerrarDetalleGenerico() {
    this.vistaDetalleGenerico = false;
    this.respuestasInstrumento = [];
    this.detalleGenericoId = '';
    this.detalleGenericoNombre = '';
  }

  // ---- EXPORTACIÓN DETALLE GENÉRICO ----
  exportarDetalleCSV() {
    if (!this.detalleGenericoId) return;
    // Usar los endpoints del backend que ya incluyen TODAS las preguntas como columnas
    // El tipo determina qué endpoint usar
    const tipo = (this.detalleGenericoTipo || '').toLowerCase();
    let url = '';
    if (tipo === 'encuesta') {
      url = `${environment.apiBaseUrl}/api/export/surveys/csv?surveyId=${this.detalleGenericoId}`;
    } else {
      // Tests, Baterías, Simuladores, Entrenamientos, Bitácoras
      url = `${environment.apiBaseUrl}/api/export/results?testId=${this.detalleGenericoId}`;
    }
    this.toast.success('Descargando CSV con todas las preguntas...');
    window.open(url, '_blank');
  }

  async exportarDetallePDF() {
    if (!this.detalleGenericoId) return;
    this.toast.success('Generando PDF... Obteniendo datos completos.');

    try {
      // 1. Obtener la definición del instrumento (con preguntas)
      const testDoc: any = await this.http.get<any>(`/api/test/${this.detalleGenericoId}`).toPromise().catch(() => null);
      const preguntas: any[] = (testDoc?.datos?.preguntas || testDoc?.data?.preguntas || testDoc?.preguntas || [])
        .filter((p: any) => p.tipo !== 'system_settings' && p.typeId !== 'system_settings' && p.id !== 'SYSTEM_SETTINGS' && p.textoPregunta !== 'SYSTEM_SETTINGS' && p.text !== 'SYSTEM_SETTINGS');

      // Build ordered columns with ALL possible IDs per question (like CSV export)
      const pdfColumns: { label: string; ids: Set<string>; oMap: { [k: string]: string } }[] = [];
      let qNum = 0;
      preguntas.forEach((p: any) => {
        qNum++;
        const txt = `${qNum}. ${p.textoPregunta || p.text || p.label || p.pregunta || 'Pregunta'}`;
        const ids = new Set<string>();
        if (p.id) ids.add(String(p.id));
        if (p._id) ids.add(String(p._id));
        const oMap: { [k: string]: string } = {};
        const opts = p.opciones || p.options || [];
        if (Array.isArray(opts)) {
          opts.forEach((opt: any, oIdx: number) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const label = isObj ? (opt.label || opt.texto || opt.value || String(opt)) : String(opt);
            oMap[String(oIdx)] = label;
            oMap[label] = label;
          });
        }
        pdfColumns.push({ label: txt, ids, oMap });
      });

      // 2. Obtener respuestas completas (con resultadosCompletos)
      const admRes: any = await this.http.get<any>(`/api/export/responses-full?instrumentId=${this.detalleGenericoId}`).toPromise().catch(() => null);
      let responses = admRes?.data || admRes || [];
      if (!Array.isArray(responses)) responses = [];
      responses = responses.filter((r: any) => r.estado === 'Finalizado');

      // Cross-reference: match response questionIds to definition columns by position
      const allRespQids = new Set<string>();
      responses.forEach((r: any) => {
        if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
          r.resultadosCompletos.forEach((a: any) => allRespQids.add(String(a.questionId)));
        }
      });
      const matchedIds = new Set<string>();
      allRespQids.forEach(rqId => {
        pdfColumns.forEach(col => { if (col.ids.has(rqId)) matchedIds.add(rqId); });
      });
      const unmatchedRqIds = [...allRespQids].filter(id => !matchedIds.has(id));
      const matchedColIndices = new Set<number>();
      allRespQids.forEach(rqId => {
        pdfColumns.forEach((col, idx) => { if (col.ids.has(rqId)) matchedColIndices.add(idx); });
      });
      const unmatchedColIndices = pdfColumns.map((_, i) => i).filter(i => !matchedColIndices.has(i));
      if (unmatchedRqIds.length > 0 && unmatchedColIndices.length > 0) {
        const orderedUnmatched: string[] = [];
        for (const r of responses) {
          if (r.resultadosCompletos) {
            r.resultadosCompletos.forEach((a: any) => {
              const qId = String(a.questionId);
              if (unmatchedRqIds.includes(qId) && !orderedUnmatched.includes(qId)) orderedUnmatched.push(qId);
            });
            if (orderedUnmatched.length >= unmatchedRqIds.length) break;
          }
        }
        orderedUnmatched.forEach((rqId, i) => {
          if (i < unmatchedColIndices.length) pdfColumns[unmatchedColIndices[i]].ids.add(rqId);
        });
      }

      // Helper: resolve MCQ option values
      const resolveValue = (oMap: { [k: string]: string }, rawVal: any): string => {
        if (rawVal === null || rawVal === undefined) return '—';
        if (typeof rawVal === 'string' && rawVal.startsWith('data:image')) return '[Imagen/Firma adjunta]';
        if (typeof rawVal === 'object') return JSON.stringify(rawVal);
        const val = String(rawVal);
        if (!oMap || Object.keys(oMap).length === 0) return val;
        if (val.includes(',')) return val.split(',').map(p => oMap[p.trim()] || p.trim()).join(', ');
        if (oMap[val] !== undefined) return oMap[val];
        return val;
      };

      const jsPDFMod = await import('jspdf') as any;
      const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default || jsPDFMod;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(`Resultados: ${this.detalleGenericoNombre}`, 15, 20);

      doc.setDrawColor(81, 182, 165);
      doc.setLineWidth(0.8);
      doc.line(15, 25, 195, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tipo: ${this.detalleGenericoTipo}  |  Fecha: ${new Date().toLocaleDateString()}  |  Total: ${responses.length} respuesta(s)  |  Preguntas: ${pdfColumns.length}`, 15, 32);

      let yPos = 42;
      const pageHeight = 280;

      for (let i = 0; i < responses.length; i++) {
        const resp = responses[i];
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const candidateName = resp.datosFormulario?.nombre || resp.nombreCandidato || `Respuesta #${i + 1}`;
        doc.text(`#${i + 1} — ${candidateName}`, 15, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const fecha = resp.fechaFinalizacion ? new Date(resp.fechaFinalizacion).toLocaleString() : '—';
        const puntaje = resp.puntaje !== undefined && resp.puntaje !== null ? `${resp.puntaje} pts` : 'N/A';
        doc.text(`Fecha: ${fecha}  |  Puntaje: ${puntaje}`, 18, yPos);
        yPos += 6;

        // Build raw answer map from response
        const rawAnswers: { [key: string]: any } = {};
        if (resp.resultadosCompletos && Array.isArray(resp.resultadosCompletos)) {
          resp.resultadosCompletos.forEach((ans: any) => {
            rawAnswers[String(ans.questionId)] = ans.value;
          });
        }

        doc.setFontSize(9);
        for (const col of pdfColumns) {
          if (yPos > pageHeight - 10) { doc.addPage(); yPos = 20; }
          let rawVal: any = undefined;
          for (const colId of col.ids) {
            if (rawAnswers[colId] !== undefined) { rawVal = rawAnswers[colId]; break; }
          }
          const answer = resolveValue(col.oMap, rawVal);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          const qLines = doc.splitTextToSize(`• ${col.label}`, 170);
          doc.text(qLines, 18, yPos);
          yPos += qLines.length * 4;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          const aLines = doc.splitTextToSize(answer, 165);
          doc.text(aLines, 22, yPos);
          yPos += aLines.length * 4 + 2;
        }

        yPos += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(15, yPos - 2, 195, yPos - 2);
        yPos += 3;
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Testea Engine | Pág ${p}/${totalPages}`, 105, 290, { align: 'center' });
      }

      const slug = (this.detalleGenericoNombre || 'instrumento').replace(/\s+/g, '_');
      doc.save(`Reporte_${slug}_${this.detalleGenericoId.substring(0, 8)}.pdf`);
      this.toast.success('PDF generado con todas las preguntas.');
    } catch (e) {
      console.error('Error generando PDF:', e);
      this.toast.error('Error al generar el PDF. Intenta nuevamente.');
    }
  }

  // ---- PURGE (LIMPIEZA DE DATOS) ----
  showPurgeModal = false;
  ejecutandoPurge = false;
  purgeTargetId: string | null = null;
  purgeTargetName: string = '';
  purgeTargetSource: 'tests' | 'generic' = 'generic';

  get purgeList(): any[] {
    return this.purgeTargetSource === 'tests' ? this.resultadosFiltrados : this.respuestasInstrumento;
  }

  limpiarDatosInstrumento() {
    if (!this.detalleGenericoId || this.respuestasInstrumento.length === 0) return;
    this.purgeTargetId = this.detalleGenericoId;
    this.purgeTargetName = this.detalleGenericoNombre;
    this.purgeTargetSource = 'generic';
    this.showPurgeModal = true;
  }

  limpiarDatosTests() {
    if (!this.testSeleccionadoId || this.resultadosFiltrados.length === 0) return;
    this.purgeTargetId = this.testSeleccionadoId;
    this.purgeTargetName = this.testSeleccionado || '';
    this.purgeTargetSource = 'tests';
    this.showPurgeModal = true;
  }

  cerrarPurgeModal() {
    this.showPurgeModal = false;
    this.ejecutandoPurge = false;
  }

  confirmarPurge() {
    if (!this.purgeTargetId) return;
    this.ejecutandoPurge = true;

    this.http.delete<any>(`/api/export/cleanup/purge/${this.purgeTargetId}`).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || `Se eliminaron las respuestas.`);
        if (this.purgeTargetSource === 'tests') {
          this.resultadosFiltrados = [];
          this.resultadosData = [];
        } else {
          this.respuestasInstrumento = [];
        }
        this.cerrarPurgeModal();
      },
      error: (err: any) => {
        console.error('Error limpiando datos:', err);
        this.toast.error('Error al limpiar los datos. Intenta nuevamente.');
        this.ejecutandoPurge = false;
      }
    });
  }

  abrirModalEliminarGenerico(resp: any) {
    this.respuestaAEliminar = resp;
    this.showDeleteModalGenerico = true;
  }

  cerrarModalEliminarGenerico() {
    this.showDeleteModalGenerico = false;
    this.respuestaAEliminar = null;
    this.eliminandoGenerico = false;
  }

  confirmarEliminacionGenerica() {
    if (!this.respuestaAEliminar) return;
    this.eliminandoGenerico = true;

    this.http.delete<any>(`/api/export/response/${this.respuestaAEliminar._id}`).subscribe({
      next: () => {
        this.respuestasInstrumento = this.respuestasInstrumento.filter(r => r._id !== this.respuestaAEliminar!._id);
        this.cerrarModalEliminarGenerico();
      },
      error: (err: any) => {
        console.error('Error eliminando respuesta:', err);
        this.toast.error(err.error?.message || 'Error al eliminar. Intenta nuevamente.');
        this.eliminandoGenerico = false;
      }
    });
  }

}
