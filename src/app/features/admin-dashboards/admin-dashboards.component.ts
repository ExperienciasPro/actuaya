import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ResultadosService, ResultadoBackend } from '../../shared/services/resultados.service';
import { Chart, registerables } from 'chart.js';
import { DashboardChartComponent } from '../../shared/dashboard-chart.component';
import { RadarMulticapaComponent, RadarDataset } from '../../shared/components/charts/radar-multicapa.component';
import { DivergentBarComponent, LikertPregunta } from '../../shared/components/charts/divergent-bar.component';
import { SankeyChartComponent, SankeyNode, SankeyLink } from '../../shared/components/charts/sankey-chart.component';
import { CalendarHeatmapComponent, HeatmapEntry } from '../../shared/components/charts/calendar-heatmap.component';
import { WaterfallChartComponent, WaterfallStep } from '../../shared/components/charts/waterfall-chart.component';
import { QuadrantScatterComponent, ScatterPoint } from '../../shared/components/charts/quadrant-scatter.component';
import { SentimentTimelineComponent, SentimentEntry } from '../../shared/components/charts/sentiment-timeline.component';
import { DataNarrativeComponent, NarrativeStats } from '../../shared/components/data-narrative.component';
import { DrilldownContainerComponent } from '../../shared/components/drilldown-container.component';
import { ChartAnnotationLayerComponent } from '../../shared/components/chart-annotation-layer.component';
import { registerThresholdPlugin } from '../../shared/utils/chart-threshold.plugin';
import { AnalyticsDataService } from '../../shared/services/analytics-data.service';
import { ChartExportService, ExportDataSet } from '../../shared/services/chart-export.service';
import { ExportButtonComponent, ExportClickEvent } from '../../shared/components/export-button.component';
import { CrossCorrelationComponent, CorrelationDataset } from '../../shared/components/cross-correlation.component';
import { UniversalGraphicsBookComponent } from '../../shared/components/universal-graphics-book.component';
import { UiStateService } from '../../shared/services/ui-state.service';

Chart.register(...registerables);
registerThresholdPlugin();

interface MockTest {
  id: string;
  nombre: string;
  totalEvaluados: number;
  promedio: number;
  candidatosRendimiento: number[];
  candidatosNombres: string[];
}

interface UserTestResult {
  testId: string;
  testNombre: string;
  fecha: string;
  puntajeGlobal: number;
  competencias: number[];
  labelsCompetencias: string[];
}

interface MockUser {
  id: string;
  nombre: string;
  rol: string;
  iniciales: string;
  resultados: UserTestResult[];
}

@Component({
  selector: 'app-admin-dashboards',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardChartComponent,
    RadarMulticapaComponent,
    DivergentBarComponent,
    SankeyChartComponent,
    CalendarHeatmapComponent,
    WaterfallChartComponent,
    QuadrantScatterComponent,
    SentimentTimelineComponent,
    DataNarrativeComponent,
    DrilldownContainerComponent,
    ChartAnnotationLayerComponent,
    ExportButtonComponent,
    CrossCorrelationComponent,
    UniversalGraphicsBookComponent
  ],
  template: `
    <div class="test-layout-wrapper" style="padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Encabezado Estilo ActuaYa -->
      <header style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 6px;">
              <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(139,92,246,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="width: 22px; height: 22px;"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
              </div>
              <h1 style="font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.02em;">Módulo Análisis Datos</h1>
            </div>
            <p style="color: #64748b; margin: 0; font-size: 0.95rem;">Arquitectura de análisis a 3 niveles: Operativo, Producto y Talento.</p>
          </div>
        </div>

        <div class="menu-tabs horizontal-tabs" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
            <button class="btn-menu-tab" [class.active-tab]="activeAnalyticsTab === 'resumen'" (click)="selectMainTab('resumen')">
              <span class="tab-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </span>
              <span class="tab-label">Resumen</span>
            </button>
            <button class="btn-menu-tab" [class.active-tab]="activeAnalyticsTab === 'tests'" (click)="selectMainTab('tests')">
              <span class="tab-icon tab-icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </span>
              <span class="tab-label">Evaluaciones</span>
            </button>
            <button class="btn-menu-tab" [class.active-tab]="activeAnalyticsTab === 'encuestas'" (click)="selectMainTab('encuestas')">
              <span class="tab-icon tab-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </span>
              <span class="tab-label">Formularios</span>
            </button>
        </div>
      </header>

      <main class="main-content-area" style="flex: 1;">



        <!-- ═══════ RESUMEN ═══════ -->
        <div *ngIf="activeAnalyticsTab === 'resumen'" class="analytics-content fade-in">
          <div class="resumen-header">
            <h2 class="resumen-title">Resumen de tu cuenta</h2>
            <p class="resumen-sub">Vista general de toda tu actividad e instrumentos</p>
          </div>

          <!-- KPI Row -->
          <div class="resumen-kpi-grid">
            <div class="resumen-kpi">
              <div class="resumen-kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <div class="resumen-kpi-body">
                <span class="resumen-kpi-num">{{ resumenStats.totalInstrumentos }}</span>
                <span class="resumen-kpi-label">Instrumentos</span>
                <div class="resumen-spark" *ngIf="resumenStats.totalInstrumentos > 0">
                  <div class="resumen-spark-bar" style="background:var(--accent);width:100%"></div>
                </div>
              </div>
            </div>
            <div class="resumen-kpi">
              <div class="resumen-kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div class="resumen-kpi-body">
                <span class="resumen-kpi-num">{{ resumenStats.totalEvaluados }}</span>
                <span class="resumen-kpi-label">Evaluados</span>
                <div class="resumen-spark" *ngIf="resumenStats.totalEvaluados > 0">
                  <div class="resumen-spark-bar" style="background:var(--accent)" [style.width]="(resumenStats.totalEvaluados > 50 ? 100 : resumenStats.totalEvaluados * 2) + '%'"></div>
                </div>
              </div>
            </div>
            <div class="resumen-kpi">
              <div class="resumen-kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div class="resumen-kpi-body">
                <span class="resumen-kpi-num">{{ resumenStats.promedioGeneral || '—' }}</span>
                <span class="resumen-kpi-label">Promedio General</span>
                <div class="resumen-spark" *ngIf="resumenStats.promedioNum > 0">
                  <div class="resumen-spark-bar" style="background:var(--accent)" [style.width]="resumenStats.promedioNum + '%'"></div>
                </div>
              </div>
            </div>
            <div class="resumen-kpi">
              <div class="resumen-kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <div class="resumen-kpi-body">
                <span class="resumen-kpi-num">{{ resumenStats.ultimaActividad || 'Sin actividad' }}</span>
                <span class="resumen-kpi-label">Última Actividad</span>
              </div>
            </div>
          </div>



          <!-- Recent Activity -->
          <h3 class="resumen-section-title" *ngIf="actividadReciente.length > 0">Actividad Reciente</h3>
          <div class="instr-list" *ngIf="actividadReciente.length > 0">
            <div class="instr-card" *ngFor="let item of actividadReciente; let i = index" style="cursor: default;">
              <div class="instr-card-num" [style.background]="item.puntaje >= 80 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : item.puntaje >= 60 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'color-mix(in srgb, var(--accent) 10%, transparent)'" [style.color]="item.puntaje >= 80 ? 'var(--accent)' : item.puntaje >= 60 ? 'var(--accent)' : 'var(--accent)'">{{ item.iniciales }}</div>
              <div class="instr-card-body">
                <div class="instr-card-name">{{ item.nombre }}</div>
                <div class="instr-card-desc">{{ item.test }}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;position:relative;z-index:1;">
                <div style="font-size:14px;font-weight:700;" [style.color]="item.puntaje >= 80 ? 'var(--accent)' : item.puntaje >= 60 ? 'var(--accent)' : 'var(--accent)'">{{ item.puntaje }}/100</div>
                <div style="font-size:10px;color:#94a3b8;">{{ item.fecha }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Unified contextual header for ALL tabs -->
        <div class="instr-context-bar" *ngIf="activeAnalyticsTab !== 'resumen'">
          <!-- When viewing the list -->
          <ng-container *ngIf="modoVista === 'global'">
            <div class="instr-context-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--accent)"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>{{ activeAnalyticsTab === 'tests' ? 'Mis Tests' : activeAnalyticsTab === 'encuestas' ? 'Mis Encuestas' : activeAnalyticsTab === 'baterias' ? 'Mis Baterías' : activeAnalyticsTab === 'bitacoras' ? 'Mis Bitácoras' : activeAnalyticsTab === 'entrenamientos' ? 'Mis Entrenamientos' : 'Mis Simuladores' }}</span>
            </div>
            <span class="instr-context-hint">Selecciona un instrumento para ver su análisis detallado</span>
          </ng-container>
          <!-- When viewing a selected instrument -->
          <ng-container *ngIf="modoVista === 'por-test' && selectedTestObj">
            <button class="instr-back-btn" (click)="cambiarModo('global')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Volver a la lista
            </button>
            <div class="instr-breadcrumb-sep">›</div>
            <span class="instr-breadcrumb-name">{{ selectedTestObj.nombre }}</span>
          </ng-container>
          <!-- Por Usuario (only tests) -->
          <ng-container *ngIf="modoVista === 'por-usuario'">
            <button class="instr-back-btn" (click)="cambiarModo('global')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Volver a la lista
            </button>
            <div class="instr-breadcrumb-sep">›</div>
            <span class="instr-breadcrumb-name">Por Usuario</span>
          </ng-container>
        </div>

        <!-- ═══════ CONTENIDO DE TESTS ═══════ -->
        <div *ngIf="activeAnalyticsTab === 'tests'" class="analytics-content fade-in">
        <!-- ESTADO CARGANDO -->
        <div class="empty-state-card premium-card mt-4" *ngIf="cargando">
          <svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
          <h3>Cargando datos desde el servidor...</h3>
          <p>Sincronizando modelos analíticos con la base de datos en tiempo real.</p>
        </div>

        <!-- ESTADO SIN DATOS -->
        <div class="empty-state-card premium-card mt-4" *ngIf="!cargando && sinDatos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          <h3>Aún no hay tests aplicados</h3>
          <p>No hay resultados de evaluaciones en la base de datos para generar estadísticas.</p>
        </div>

        <ng-container *ngIf="!cargando && !sinDatos">

        <!-- ============================================== -->
        <!-- VISTA 1: GLOBAL -->
        <!-- ============================================== -->
        <div *ngIf="modoVista === 'global'" class="view-section fade-in">

          <!-- Search -->
          <div class="instr-search-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:#94a3b8;flex-shrink:0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="instr-search" [(ngModel)]="instrumentSearchQuery" placeholder="Buscar test...">
            <span class="instr-count">{{ filteredTestsList.length }} tests</span>
          </div>

          <!-- Empty -->
          <div class="empty-state-card premium-card mt-4" *ngIf="baseTests.length === 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            <h3>Aún no hay tests con resultados</h3>
            <p>No hay resultados de evaluaciones en la base de datos.</p>
          </div>

          <!-- List using baseTests -->
          <div class="instr-list" *ngIf="baseTests.length > 0">
            <div class="instr-card" *ngFor="let test of filteredTestsList; let i = index" (click)="selectTestFromList(test)">
              <div class="instr-card-num">{{ i + 1 }}</div>
              <div class="instr-card-body">
                <div class="instr-card-name">{{ test.nombre }}</div>
                <div class="instr-card-meta">
                  <span class="instr-meta-tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    {{ test.totalEvaluados }} evaluados
                  </span>
                  <span class="instr-meta-tag" *ngIf="test.promedio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    Promedio: {{ test.promedio }}/100
                  </span>
                </div>
                <div class="instr-gauge" *ngIf="test.promedio">
                  <div class="instr-gauge-fill" [style.width]="test.promedio + '%'" [style.background]="test.promedio >= 80 ? 'linear-gradient(90deg,var(--accent),var(--accent))' : test.promedio >= 60 ? 'linear-gradient(90deg,var(--accent),var(--accent))' : 'linear-gradient(90deg,var(--accent),var(--accent))'"></div>
                </div>
              </div>
              <svg class="instr-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- VISTA 2: POR PRUEBA / TEST -->
        <!-- ============================================== -->
        <div *ngIf="activeAnalyticsTab === 'tests' && modoVista === 'por-test'" class="view-section fade-in">

          <!-- Si HAY test seleccionado -->
          <ng-container *ngIf="selectedTestObj">

            <!-- Action bar -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px;">
              <button class="btn-action-outline" (click)="compartirInforme('test', selectedTestObj.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Compartir Informe
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="kpi-card premium-card">
                 <div class="kpi-icon icon-blue">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                 </div>
                 <div class="kpi-content">
                   <h4>Evaluados en este Test</h4>
                   <p class="kpi-number">{{ selectedTestObj.totalEvaluados }}</p>
                   <span class="kpi-trend" [ngClass]="trendTestVolumen.cls">{{ trendTestVolumen.icon }} {{ trendTestVolumen.text }}</span>
                 </div>
              </div>
              <div class="kpi-card premium-card">
                 <div class="kpi-icon icon-purple">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                 </div>
                 <div class="kpi-content">
                   <h4>Promedio del Test</h4>
                   <p class="kpi-number">{{ selectedTestObj.promedio }}<span style="font-size: 14px; color: #94a3b8;">/100</span></p>
                   <span class="kpi-trend" [ngClass]="trendTestPromedio.cls">{{ trendTestPromedio.icon }} {{ trendTestPromedio.text }}</span>
                 </div>
              </div>
              <div class="kpi-card premium-card">
                 <div class="kpi-icon icon-teal">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                 </div>
                 <div class="kpi-content">
                   <h4>Rango de Puntajes</h4>
                   <p class="kpi-number" style="font-size: 22px;">{{ getTestMinScore() }} – {{ getTestMaxScore() }}</p>
                   <span class="kpi-trend trend-neutral">Mín – Máx</span>
                 </div>
              </div>
            </div>

            <!-- Libro de Gráficas Universal (Tests) -->
            <div style="margin-top: 24px;">
              <app-universal-graphics-book
                [instrumentId]="selectedTestObj.id"
                [instrumentType]="'test'"
                [instrumentName]="selectedTestObj.nombre"
                (bookModeChange)="onBookModeChange($event)"
                (shareRequest)="onShareRequest($event)"
              ></app-universal-graphics-book>
            </div>

            <div class="chart-card premium-card mt-6">
              <h3 class="chart-title">Rendimiento Comparativo de Candidatos ({{ selectedTestObj.nombre }})</h3>
              <div class="canvas-container big-bar-container w-full overflow-hidden relative">
                <canvas id="testPerformanceChart"></canvas>
              </div>
            </div>

            <!-- Tabla de Candidatos -->
            <div class="premium-card" style="padding: 24px; margin-top: 24px;">
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0f172a;">Ranking de Candidatos</h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #f1f5f9;">
                      <th style="text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                      <th style="text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Candidato</th>
                      <th style="text-align: center; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Puntaje</th>
                      <th style="text-align: center; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let nombre of selectedTestObj.candidatosNombres; let i = index" style="border-bottom: 1px solid #f8fafc;">
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #cbd5e1;">{{ i + 1 }}</td>
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #1e293b;">{{ nombre }}</td>
                      <td style="padding: 10px 12px; text-align: center; font-size: 14px; font-weight: 700;"
                        [style.color]="selectedTestObj.candidatosRendimiento[i] >= 80 ? 'var(--accent)' : selectedTestObj.candidatosRendimiento[i] >= 60 ? 'var(--accent)' : 'var(--accent)'">
                        {{ selectedTestObj.candidatosRendimiento[i] }}
                      </td>
                      <td style="padding: 10px 12px; text-align: center;">
                        <span style="padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase;"
                          [style.background]="selectedTestObj.candidatosRendimiento[i] >= 90 ? 'rgba(16,185,129,0.08)' : selectedTestObj.candidatosRendimiento[i] >= 70 ? 'rgba(59,130,246,0.08)' : selectedTestObj.candidatosRendimiento[i] >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'"
                          [style.color]="selectedTestObj.candidatosRendimiento[i] >= 90 ? 'var(--accent)' : selectedTestObj.candidatosRendimiento[i] >= 70 ? 'var(--accent)' : selectedTestObj.candidatosRendimiento[i] >= 50 ? 'var(--accent)' : '#dc2626'">
                          {{ selectedTestObj.candidatosRendimiento[i] >= 90 ? 'Excelente' : selectedTestObj.candidatosRendimiento[i] >= 70 ? 'Bueno' : selectedTestObj.candidatosRendimiento[i] >= 50 ? 'Regular' : 'Bajo' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


          </ng-container>

        </div>

        <!-- ============================================== -->
        <!-- VISTA 3: POR USUARIO -->
        <!-- ============================================== -->
        <div *ngIf="activeAnalyticsTab === 'tests' && modoVista === 'por-usuario'" class="view-section fade-in">
          
          <div class="flex flex-col md:flex-row gap-4 mb-6 w-full">
            <div class="select-premium-wrapper w-full">
              <select class="select-premium" (change)="onSelectUser($event)">
                <option value="">Selecciona un Candidato o Empleado...</option>
                <option *ngFor="let user of baseUsers" [value]="user.id">{{ user.nombre }} - {{ user.rol }}</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          <div class="empty-state-card premium-card" *ngIf="!selectedUserObj">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <h3>Búsqueda de Talento</h3>
            <p>Selecciona un usuario en la barra superior para generar su expedientes analítico completo.</p>
          </div>

          <ng-container *ngIf="selectedUserObj">
            <!-- Action bar -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px;">
              <button class="btn-action-outline" (click)="compartirInforme('usuario', selectedUserObj.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Compartir Informe
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
              
              <!-- Tarjeta Perfil Izquierda -->
              <div class="executive-summary-card premium-card">
                <div class="resume-avatar">
                  <span class="avatar-initials">{{ selectedUserObj.iniciales }}</span>
                </div>
                <h2 class="resume-name">{{ selectedUserObj.nombre }}</h2>
                <p class="resume-role">{{ selectedUserObj.rol }}</p>
                <div class="resume-divider"></div>
                
                <div class="kpi-minimal">
                   <span class="data-label">Pruebas Totales</span>
                   <strong class="data-value highlight-blue">{{ selectedUserObj.resultados.length }}</strong>
                </div>

                <!-- Matchmaker Action Button -->
                <button class="btn-matchmaker" (click)="openMatchmakerModal(selectedUserObj.id)">
                   <svg viewBox="0 0 24 24" fill="none" class="match-icon" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                   Comparar con Perfil Ideal
                </button>
              </div>

              <!-- Historial Global (Bar Chart) Derecha -->
              <div class="chart-card premium-card">
                <h3 class="chart-title">Historial de Puntajes Globales</h3>
                <div class="canvas-container history-bar-container w-full overflow-hidden relative">
                  <canvas id="userHistoryChart"></canvas>
                </div>
              </div>

            </div>

            <div class="chart-card premium-card mt-6" style="padding-top: 30px;">
              <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h3 class="chart-title" style="margin: 0;">Análisis Profundo de Competencias</h3>
                <div class="select-premium-wrapper w-full md:w-[300px]" style="height: 44px;">
                  <select class="select-premium w-full min-h-[44px]" style="font-size: 14px;" (change)="onSelectUserTest($event)">
                    <option value="">Desglosar prueba...</option>
                    <option *ngFor="let r of selectedUserObj.resultados" [value]="r.testId">{{ r.testNombre }}</option>
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <!-- Radar Container -->
              <div class="canvas-container radar-container w-full overflow-hidden relative" [hidden]="!selectedUserResultObj">
                <canvas id="radarChart"></canvas>
              </div>
              <div class="empty-state-mini" *ngIf="!selectedUserResultObj">
                 Selecciona una prueba en el menú superior derecho para visualizar el despliegue de su radar.
              </div>
            </div>

            <!-- Historial de Pruebas -->
            <div class="premium-card" style="padding: 24px; margin-top: 24px;">
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0f172a;">Historial de Pruebas</h3>
              <div style="display: flex; flex-direction: column; gap: 0;">
                <div *ngFor="let r of selectedUserObj.resultados; let last = last" style="display: flex; align-items: center; gap: 14px; padding: 12px 0;" [style.border-bottom]="!last ? '1px solid #f1f5f9' : 'none'">
                  <div style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;"
                    [style.background]="r.puntajeGlobal >= 80 ? 'var(--accent)' : r.puntajeGlobal >= 60 ? 'var(--accent)' : 'var(--accent)'"></div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">{{ r.testNombre }}</div>
                    <div style="font-size: 11px; color: #94a3b8;">{{ r.fecha }}</div>
                  </div>
                  <div style="font-size: 14px; font-weight: 700;"
                    [style.color]="r.puntajeGlobal >= 80 ? 'var(--accent)' : r.puntajeGlobal >= 60 ? 'var(--accent)' : 'var(--accent)'">
                    {{ r.puntajeGlobal }}/100
                  </div>
                </div>
              </div>
            </div>

          </ng-container>

        </div>
        </ng-container>

        </div>


        <!-- ============================================== -->
        <!-- UNIFIED INSTRUMENT LIST (all non-tests tabs) -->
        <!-- ============================================== -->
        <div *ngIf="activeAnalyticsTab !== 'tests' && modoVista === 'global'" class="analytics-content fade-in">

          <!-- Search -->
          <div class="instr-search-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:#94a3b8;flex-shrink:0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="instr-search" [(ngModel)]="instrumentSearchQuery" placeholder="Buscar instrumento...">
            <span class="instr-count">{{ filteredInstrumentList.length }} instrumentos</span>
          </div>

          <!-- Loading -->
          <div *ngIf="loadingInstruments" class="empty-state-card premium-card mt-4">
            <svg viewBox="0 0 24 24" fill="none" class="spin" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
            <h3>Cargando instrumentos...</h3>
          </div>

          <!-- Empty -->
          <div *ngIf="!loadingInstruments && filteredInstrumentList.length === 0" class="empty-state-card premium-card mt-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            <h3>No se encontraron instrumentos</h3>
            <p>No hay {{ activeAnalyticsTab === 'encuestas' ? 'encuestas' : activeAnalyticsTab === 'baterias' ? 'baterías' : activeAnalyticsTab === 'bitacoras' ? 'bitácoras' : activeAnalyticsTab === 'entrenamientos' ? 'entrenamientos' : 'simuladores' }} creados aún.</p>
          </div>

          <!-- List -->
          <div class="instr-list" *ngIf="!loadingInstruments && filteredInstrumentList.length > 0">
            <div class="instr-card" *ngFor="let inst of filteredInstrumentList; let i = index" (click)="selectInstrumentFromList(inst)">
              <div class="instr-card-num">{{ i + 1 }}</div>
              <div class="instr-card-body">
                <div class="instr-card-name">{{ inst.nombre }}</div>
                <div class="instr-card-desc" *ngIf="inst.descripcion">{{ inst.descripcion | slice:0:100 }}{{ inst.descripcion.length > 100 ? '...' : '' }}</div>
                <div class="instr-card-meta">
                  <span *ngIf="inst.creador" class="instr-meta-tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    {{ inst.creador }}
                  </span>
                  <span *ngIf="inst.fecha" class="instr-meta-tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {{ (inst.fecha | date:'dd/MM/yyyy') || inst.fecha }}
                  </span>
                  <span *ngIf="inst.totalRespuestas !== undefined" class="instr-meta-tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    {{ inst.totalRespuestas }} respuestas
                  </span>
                </div>
              </div>
              <div class="instr-card-status">
                <span class="instr-badge" [ngClass]="{'badge-pub': inst.estado === 'Publicado', 'badge-draft': inst.estado === 'Borrador'}">{{ inst.estado }}</span>
              </div>
              <svg class="instr-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
        </div>



        <!-- ═══════ POR INSTRUMENTO: vista drill-down para cualquier tab no-tests ═══════ -->
        <div *ngIf="activeAnalyticsTab !== 'tests' && activeAnalyticsTab !== 'resumen' && modoVista === 'por-test'" class="analytics-content fade-in">

          <!-- Si HAY instrumento seleccionado -->
          <ng-container *ngIf="selectedTestObj">

            <!-- KPIs contextuales -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" *ngIf="activeAnalyticsTab !== 'encuestas'">
              <div class="kpi-card premium-card">
                <div class="kpi-icon icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <div class="kpi-content">
                  <h4>Total Evaluados</h4>
                  <p class="kpi-number">{{ selectedTestObj.totalEvaluados }}</p>
                </div>
              </div>
              <div class="kpi-card premium-card">
                <div class="kpi-icon icon-teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div class="kpi-content">
                  <h4>Promedio</h4>
                  <p class="kpi-number">{{ selectedTestObj.promedio }}<span style="font-size: 14px; color: #94a3b8;">/100</span></p>
                </div>
              </div>
              <div class="kpi-card premium-card">
                <div class="kpi-icon icon-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
                </div>
                <div class="kpi-content">
                  <h4>Instrumento</h4>
                  <p class="kpi-number" style="font-size: 16px;">{{ selectedTestObj.nombre }}</p>
                </div>
              </div>
            </div>

            <!-- Libro de Gráficas Unificado -->
            <app-universal-graphics-book
              [instrumentId]="selectedTestObj.id"
              [instrumentType]="activeAnalyticsTab === 'encuestas' ? 'survey' : activeAnalyticsTab === 'baterias' ? 'battery' : activeAnalyticsTab === 'casos' ? 'simulator' : 'test'"
              [instrumentName]="selectedTestObj.nombre"
              (bookModeChange)="onBookModeChange($event)"
              (shareRequest)="onShareRequest($event)"
            ></app-universal-graphics-book>
          </ng-container>
        </div>

        <!-- ═══════ POR USUARIO: vista drill-down para cualquier tab no-tests ═══════ -->
        <div *ngIf="activeAnalyticsTab !== 'tests' && modoVista === 'por-usuario'" class="analytics-content fade-in">
          <div class="flex flex-col md:flex-row gap-4 mb-6 w-full">
            <div class="select-premium-wrapper w-full">
              <select class="select-premium" (change)="onSelectUser($event)">
                <option value="">Selecciona un Candidato o Empleado...</option>
                <option *ngFor="let user of baseUsers" [value]="user.id">{{ user.nombre }} - {{ user.rol }}</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" class="select-chevron" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          <div class="empty-state-card premium-card" *ngIf="!selectedUserObj">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <h3>Búsqueda de Talento</h3>
            <p>Selecciona un usuario en la barra superior para generar su expediente analítico completo.</p>
          </div>

          <ng-container *ngIf="selectedUserObj">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="premium-card" style="padding: 24px; display: flex; align-items: center; gap: 16px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; flex-shrink: 0;">{{ selectedUserObj.iniciales }}</div>
                <div>
                  <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1e293b;">{{ selectedUserObj.nombre }}</h3>
                  <p style="margin: 0; font-size: 13px; color: #64748b;">{{ selectedUserObj.rol }}</p>
                </div>
              </div>
              <div class="kpi-card premium-card">
                <div class="kpi-icon icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div class="kpi-content">
                  <h4>Pruebas Realizadas</h4>
                  <p class="kpi-number">{{ selectedUserObj.resultados.length }}</p>
                </div>
              </div>
            </div>

            <div class="premium-card" style="padding: 24px;">
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0f172a;">Historial de Evaluaciones</h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Instrumento</th>
                      <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Fecha</th>
                      <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let result of selectedUserObj.resultados" style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px 16px; font-size: 14px; font-weight: 500; color: #1e293b;">{{ result.testNombre }}</td>
                      <td style="padding: 12px 16px; text-align: center; font-size: 13px; color: #64748b;">{{ result.fecha }}</td>
                      <td style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 700; color: #1e293b;">{{ result.puntajeGlobal }}/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </ng-container>
        </div>


      </main>
    </div>

    <!-- ====== MODAL COMPARTIR INFORME (root level for proper fixed positioning) ====== -->
    <div class="share-modal-overlay" *ngIf="mostrarModalCompartir" (click)="cerrarModalCompartir()">
      <div class="share-modal" (click)="$event.stopPropagation()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">Compartir Informe</h3>
          <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px;" (click)="cerrarModalCompartir()">&times;</button>
        </div>
        <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.5;">
          Genera un enlace para compartir este informe con gráficas completas.
        </p>

        <!-- Visibilidad Toggle -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Visibilidad</label>
          <div style="display: flex; gap: 8px;">
            <button
              (click)="compartirVisibilidad = 'publico'"
              [style.background]="compartirVisibilidad === 'publico' ? '#ecfdf5' : '#f8fafc'"
              [style.borderColor]="compartirVisibilidad === 'publico' ? 'var(--accent)' : '#e2e8f0'"
              [style.color]="compartirVisibilidad === 'publico' ? '#065f46' : '#64748b'"
              style="flex: 1; padding: 12px; border-radius: 12px; border: 2px solid; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span style="font-size: 13px; font-weight: 700;">Público</span>
              </div>
              <span style="font-size: 11px; opacity: 0.8;">Cualquier persona con el enlace</span>
            </button>
            <button
              (click)="compartirVisibilidad = 'privado'"
              [style.background]="compartirVisibilidad === 'privado' ? '#eff6ff' : '#f8fafc'"
              [style.borderColor]="compartirVisibilidad === 'privado' ? 'var(--accent)' : '#e2e8f0'"
              [style.color]="compartirVisibilidad === 'privado' ? '#1e40af' : '#64748b'"
              style="flex: 1; padding: 12px; border-radius: 12px; border: 2px solid; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="font-size: 13px; font-weight: 700;">Privado</span>
              </div>
              <span style="font-size: 11px; opacity: 0.8;">Solo usuarios con cuenta en Testea</span>
            </button>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Enlace compartible</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" [value]="enlaceCompartir" readonly style="flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; color: #1e293b; background: #f8fafc; font-family: monospace;">
            <button style="padding: 10px 16px; border-radius: 10px; border: none; background: #0f172a; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s;" (click)="copiarEnlace()">
              {{ enlaceCopiadoMsg }}
            </button>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Expiración del enlace</label>
          <select style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; color: #1e293b; background: #fff; cursor: pointer;">
            <option>7 días</option>
            <option>30 días</option>
            <option>Sin expiración</option>
          </select>
        </div>

        <div style="display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          <button style="flex: 1; padding: 11px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; font-weight: 600; cursor: pointer;" (click)="cerrarModalCompartir()">Cancelar</button>
          <button style="flex: 1; padding: 11px; border-radius: 10px; border: none; background: #0f172a; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;" (click)="copiarEnlace()">Copiar y Cerrar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .fade-in { animation: fadeIn 0.35s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .test-layout-wrapper { display: flex; flex-direction: column; width: 100%; background-color: transparent; }
    
    .horizontal-tabs {
      flex-direction: row;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 5px;
    }
    .horizontal-tabs::-webkit-scrollbar { height: 4px; }
    .horizontal-tabs::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    /* Vertical menu tabs to horizontal base */
    .menu-tabs { display: flex; flex-direction: column; gap: 8px; }
    .btn-menu-tab { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 50px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 14px; color: #475569; }
    .tab-icon { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; transition: all 0.25s ease; }
    .tab-icon svg { width: 16px; height: 16px; }
    .tab-icon-teal { background: rgba(81,182,165,0.12); color: #51B6A5; }
    .tab-icon-blue { background: rgba(59,130,246,0.12); color: var(--accent); }
    .tab-icon-orange { background: rgba(249,115,22,0.12); color: #f97316; }
    .tab-icon-purple { background: rgba(139,92,246,0.12); color: var(--accent); }
    .tab-icon-amber { background: rgba(245,158,11,0.12); color: var(--accent); }
    .tab-icon-emerald { background: rgba(16,185,129,0.12); color: var(--accent); }
    .tab-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1; }
    .btn-menu-tab:hover { background-color: #ffffff; color: #334155; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e1; }
    .btn-menu-tab.active-tab {
      color: #1e293b; background: #f8fafc;
      border-color: #e2e8f0; box-shadow: 0 4px 16px rgba(139,92,246,0.08);
      border-bottom: 2px solid var(--accent); border-radius: 12px 12px 0 0;

    }
    .btn-menu-tab.active-tab .tab-label { color: var(--accent); font-weight: 700; }
    .btn-menu-tab.active-tab .tab-icon-teal { background: rgba(81,182,165,0.2); }
    .btn-menu-tab.active-tab .tab-icon-blue { background: rgba(59,130,246,0.2); }
    .btn-menu-tab.active-tab .tab-icon-orange { background: rgba(249,115,22,0.2); }
    .btn-menu-tab.active-tab .tab-icon-purple { background: rgba(139,92,246,0.2); }
    .btn-menu-tab.active-tab .tab-icon-amber { background: rgba(245,158,11,0.2); }
    .btn-menu-tab.active-tab .tab-icon-emerald { background: rgba(16,185,129,0.2); }
    .icon-emerald { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); }
    @media (max-width: 1024px) {
      .menu-tabs { flex-direction: row; overflow-x: auto; gap: 10px; padding-bottom: 4px; scrollbar-width: none; }
      .menu-tabs::-webkit-scrollbar { display: none; }
      .btn-menu-tab { padding: 10px 16px; min-width: max-content; border-radius: 50px; border-left: none !important; }
      .btn-menu-tab.active-tab { border-left: none !important; border-bottom: 3px solid var(--accent); transform: none; }
      .tab-icon { width: 28px; height: 28px; border-radius: 8px; }
      .tab-icon svg { width: 14px; height: 14px; }
      .tab-label { font-size: 13px; }
    }

    /* Main content area */
    .main-content-area { flex: 1; display: flex; flex-direction: column; width: 100%; overflow: hidden; padding-bottom: 50px; }

    .tab-btn { border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600; color: #64748b; background: transparent; border: 1px solid transparent; cursor: pointer; transition: all 0.2s ease; }
    .tab-btn:hover { color: #1e293b; }
    .tab-btn.active { background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

    /* ── VIEW MODE BAR (Subordinate segment control) ── */
    .view-mode-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .view-mode-bar::-webkit-scrollbar { display: none; }
    .view-mode-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: none;
      border-bottom: 2px solid transparent;
      border-radius: 0;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      background: transparent;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
      flex-shrink: 0;
      margin-bottom: -1px;
    }
    .view-mode-btn svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      transition: all 0.25s ease;
    }
    .view-mode-btn:hover {
      color: #475569;
    }
    .view-mode-btn.active {
      color: var(--color-primario, #51B6A5);
      border-bottom-color: var(--color-primario, #51B6A5);
      background: transparent;
    }
    .view-mode-btn.active svg {
      stroke: var(--color-primario, #51B6A5);
    }

    .premium-card { background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 1px solid #e8ecf1; transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .premium-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); }

    .select-premium-wrapper { position: relative; width: 100%; height: 48px; }
    .select-premium { appearance: none; -webkit-appearance: none; width: 100%; height: 48px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 40px 0 16px; font-size: 14px; font-weight: 600; color: #1e293b; font-family: inherit; cursor: pointer; transition: all 0.2s ease; position: relative; z-index: 1; }
    .select-premium:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent); }
    .select-chevron { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; z-index: 2; }

    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 0; }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card { padding: 18px; display: flex; align-items: center; gap: 14px; transition: transform 0.3s ease, box-shadow 0.3s ease; border-left: 3px solid transparent; }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
    .kpi-card:nth-child(1) { border-left-color: var(--accent); }
    .kpi-card:nth-child(2) { border-left-color: var(--accent); }
    .kpi-card:nth-child(3) { border-left-color: var(--accent); }
    .kpi-icon { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-icon svg { width: 20px; height: 20px; }
    .icon-purple { background: rgba(139, 92, 246, 0.08); color: var(--accent); }
    .icon-blue { background: rgba(59, 130, 246, 0.08); color: var(--accent); }
    .icon-teal { background: rgba(45, 212, 191, 0.08); color: var(--accent); }
    .kpi-content h4 { font-size: 11px; color: #94a3b8; margin: 0 0 4px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-number { font-size: 24px; color: #0f172a; font-weight: 800; margin: 0 0 6px 0; line-height: 1; }
    .kpi-trend { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 3px; letter-spacing: 0.2px; }
    .trend-up { color: var(--accent); background: rgba(16, 185, 129, 0.08); }
    .trend-down { color: #dc2626; background: rgba(239, 68, 68, 0.08); }
    .trend-neutral { color: #64748b; background: rgba(100, 116, 139, 0.06); }

    .mt-4 { margin-top: 20px; }
    .mb-4 { margin-bottom: 20px; }

    .chart-card { padding: 24px; display: flex; flex-direction: column; }
    .chart-title { font-size: 16px; color: #0f172a; margin: 0 0 20px 0; font-weight: 700; }
    .canvas-container { position: relative; width: 100%; display: flex; justify-content: center; align-items: center; }
    .doughnut-container { height: 280px; }
    .bar-container { height: 280px; }
    .big-bar-container { height: 360px; }
    .radar-container { height: 380px; }
    .history-bar-container { height: 260px; }

    .executive-summary-card { padding: 36px 28px; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .resume-avatar { width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 10%, transparent)); color: var(--accent); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .avatar-initials { font-size: 26px; font-weight: 800; }
    .resume-name { font-size: 22px; color: #0f172a; margin: 0; font-weight: 700; }
    .resume-role { font-size: 14px; color: #94a3b8; margin: 6px 0 20px 0; font-weight: 500; }
    .resume-divider { width: 100%; height: 1px; background: #f1f5f9; margin-bottom: 20px; }
    .kpi-minimal { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .kpi-minimal .data-label { color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .kpi-minimal .data-value { font-size: 36px; line-height: 1; }
    .highlight-blue { color: var(--accent); }
    .btn-matchmaker { margin-top: 20px; width: 100%; padding: 11px; border-radius: 50px; background: transparent; border: 2px solid #0f172a; color: #0f172a; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }
    .btn-matchmaker .match-icon { width: 16px; height: 16px; }
    .btn-matchmaker:hover { background: #0f172a; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,23,42,0.15); }

    .empty-state-card { padding: 50px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; background: #fafbfc; border: 1px dashed #d1d5db; border-radius: 16px; box-shadow: none; }
    .empty-state-card svg { width: 44px; height: 44px; color: #cbd5e1; margin-bottom: 16px; }
    .empty-state-card h3 { font-size: 17px; color: #1e293b; margin: 0 0 6px 0; font-weight: 700; }
    .empty-state-card p { color: #64748b; font-size: 14px; margin: 0; max-width: 380px; line-height: 1.5; }
    .empty-state-mini { padding: 36px; text-align: center; color: #64748b; border: 1px dashed #e2e8f0; border-radius: 14px; margin-top: 16px; font-size: 13px; background: #fafbfc; }
    .btn-action-outline { display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; color: #1e293b; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
    .btn-action-outline:hover { background: #0f172a; color: #fff; border-color: #0f172a; }
    .btn-action-outline:hover svg { stroke: #fff; }
    .share-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .share-modal { background: #fff; border-radius: 20px; padding: 28px; width: 480px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: modalIn 0.25s ease; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    /* ═══════════════════════════════════════════════════════════════════════════
       RESPONSIVE: Tablet ≤ 1024px
    ═══════════════════════════════════════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .main-content-area { padding: 0 16px; }
      .page-title { font-size: 28px; }
      .kpi-number { font-size: 26px; }
      .kpi-icon { width: 44px; height: 44px; }
      .kpi-icon svg { width: 20px; height: 20px; }
      .chart-card { padding: 18px; }
      .chart-title { font-size: 14px; margin-bottom: 14px; }
      .big-bar-container { height: 300px; }
      .radar-container { height: 320px; }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       RESPONSIVE: Mobile ≤ 768px
    ═══════════════════════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {
      .test-layout-wrapper { padding-top: 12px; }
      .main-content-area { padding: 0 12px; padding-bottom: 30px; }
      .header-section { margin-bottom: 16px; }
      .page-title { font-size: 22px; }
      .page-desc { font-size: 13px; }

      /* Tabs: scroll horizontal compacto */
      .main-tabs-bar { gap: 4px; padding: 4px; margin-bottom: 16px; border-radius: 12px; }
      .main-tab-btn { padding: 8px 12px; font-size: 12px; gap: 6px; }
      .tab-icon { width: 14px; height: 14px; }

      /* KPIs: stack vertical 1 col */
      .kpi-card { padding: 16px; gap: 12px; }
      .kpi-icon { width: 40px; height: 40px; border-radius: 10px; }
      .kpi-icon svg { width: 18px; height: 18px; }
      .kpi-content h4 { font-size: 11px; margin-bottom: 4px; }
      .kpi-number { font-size: 22px; margin-bottom: 4px; }
      .kpi-trend { font-size: 10px; padding: 2px 8px; }

      /* Distribution grid: 2 cols on mobile */
      .premium-card { border-radius: 12px; }
      .chart-card { padding: 14px; }
      .chart-title { font-size: 13px; margin-bottom: 12px; }

      /* Chart heights reducidas */
      .doughnut-container { height: 220px; }
      .bar-container { height: 220px; }
      .big-bar-container { height: 260px; }
      .radar-container { height: 280px; }
      .history-bar-container { height: 200px; }

      /* User Profile */
      .executive-summary-card { padding: 24px 16px; }
      .resume-avatar { width: 56px; height: 56px; border-radius: 14px; }
      .avatar-initials { font-size: 20px; }
      .resume-name { font-size: 18px; }
      .resume-role { font-size: 12px; }
      .kpi-minimal .data-value { font-size: 28px; }

      /* Tabs internos */
      .tab-btn { padding: 6px 14px; font-size: 12px; }
      .view-mode-btn { padding: 10px 16px; font-size: 12px; gap: 8px; }
      .view-mode-btn svg { width: 16px; height: 16px; }
      .view-mode-bar { padding: 5px; gap: 4px; border-radius: 14px; margin-bottom: 20px; }

      /* Tables */
      .empty-state-card { padding: 30px 16px; }
      .empty-state-card svg { width: 36px; height: 36px; }
      .empty-state-card h3 { font-size: 15px; }
      .empty-state-card p { font-size: 13px; }

      /* Select */
      .select-premium { font-size: 13px; padding-left: 12px; }

      /* Modal */
      .share-modal { padding: 20px; border-radius: 16px; }

      /* Action buttons */
      .btn-action-outline { padding: 8px 14px; font-size: 12px; }
      .btn-matchmaker { font-size: 12px; padding: 10px; }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       RESPONSIVE: Small Mobile ≤ 480px
    ═══════════════════════════════════════════════════════════════════════════ */
    @media (max-width: 480px) {
      .main-content-area { padding: 0 8px; }
      .page-title { font-size: 19px; letter-spacing: -0.3px; }
      .page-desc { font-size: 12px; }

      /* Tabs: icon-only en extra small */
      .main-tab-btn { padding: 8px 10px; font-size: 11px; }

      /* KPIs ultra compactos */
      .kpi-card { padding: 12px; gap: 10px; }
      .kpi-icon { width: 36px; height: 36px; }
      .kpi-icon svg { width: 16px; height: 16px; }
      .kpi-number { font-size: 20px; }
      .kpi-content h4 { font-size: 10px; }

      /* Charts aún más reducidos */
      .doughnut-container { height: 180px; }
      .bar-container { height: 180px; }
      .big-bar-container { height: 220px; }
      .radar-container { height: 240px; }
      .history-bar-container { height: 180px; }

      /* Cards compactas */
      .chart-card { padding: 12px; }
      .chart-title { font-size: 12px; margin-bottom: 10px; }
      .premium-card { border-radius: 10px; }

      .executive-summary-card { padding: 18px 12px; }
      .resume-avatar { width: 48px; height: 48px; }
      .avatar-initials { font-size: 18px; }
      .resume-name { font-size: 16px; }
    }

    /* ─── Instrument List ─── */
    .instr-search-row {
      display: flex; align-items: center; gap: 10px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 12px 18px; margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .instr-search-row:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(139,92,246,0.08); }
    .instr-search { flex: 1; border: none; outline: none; font-size: 13px; color: #1e293b; background: transparent; font-family: inherit; }
    .instr-search::placeholder { color: #b0b8c8; }
    .instr-count { font-size: 11px; color: #94a3b8; font-weight: 600; white-space: nowrap; background: #f1f5f9; padding: 3px 10px; border-radius: 20px; }

    .instr-list { display: flex; flex-direction: column; gap: 10px; }

    .instr-card {
      display: flex; align-items: center; gap: 16px; padding: 18px 20px;
      background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
      border: 1px solid #e8ecf4; border-radius: 16px;
      border-left: 4px solid #d4d8e8;
      cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .instr-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(59,130,246,0.02) 100%);
      opacity: 0; transition: opacity 0.25s;
    }
    .instr-card:hover::before { opacity: 1; }
    .instr-card:hover {
      border-left-color: var(--accent); border-color: rgba(139,92,246,0.25);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(139,92,246,0.10), 0 2px 8px rgba(0,0,0,0.04);
    }

    .instr-card-num {
      width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: var(--accent);
      background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08));
      flex-shrink: 0; position: relative; z-index: 1;
    }

    .instr-card-body { flex: 1; min-width: 0; position: relative; z-index: 1; }
    .instr-card-name {
      font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .instr-card:hover .instr-card-name { color: var(--accent); }
    .instr-card-desc { font-size: 12px; color: #94a3b8; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
    .instr-card-meta { display: flex; gap: 14px; margin-top: 8px; flex-wrap: wrap; }
    .instr-meta-tag {
      display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b;
      background: rgba(241,245,249,0.8); padding: 2px 8px; border-radius: 6px;
    }

    .instr-card-status { flex-shrink: 0; position: relative; z-index: 1; }
    .instr-badge {
      font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.4px;
      border: 1px solid transparent;
    }
    .badge-pub { background: rgba(16,185,129,0.08); color: var(--accent); border-color: rgba(16,185,129,0.15); }
    .badge-draft { background: rgba(245,158,11,0.08); color: var(--accent); border-color: rgba(245,158,11,0.15); }
    .instr-badge:not(.badge-pub):not(.badge-draft) { background: rgba(100,116,139,0.08); color: #64748b; border-color: rgba(100,116,139,0.12); }
    .instr-card-chevron {
      width: 18px; height: 18px; color: #cbd5e1; flex-shrink: 0;
      transition: transform 0.25s, color 0.25s; position: relative; z-index: 1;
    }
    .instr-card:hover .instr-card-chevron { color: var(--accent); transform: translateX(3px); }

    /* ─── Mini Gauge Bar ─── */
    .instr-gauge { width: 100%; height: 4px; background: #f1f5f9; border-radius: 4px; margin-top: 8px; overflow: hidden; }
    .instr-gauge-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

    /* ─── Sparkline Bar (Resumen KPIs) ─── */
    .resumen-spark { width: 100%; height: 3px; background: #f1f5f9; border-radius: 3px; margin-top: 6px; overflow: hidden; }
    .resumen-spark-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

    /* ─── Context Bar (non-tests) ─── */
    .instr-context-bar {
      display: flex; align-items: center; gap: 12px; padding: 12px 0; margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0; min-height: 44px;
    }
    .instr-context-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #1e293b; }
    .instr-context-hint { font-size: 12px; color: #94a3b8; margin-left: auto; }
    .instr-back-btn {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid #e2e8f0;
      border-radius: 8px; background: #fff; font-size: 12px; font-weight: 600; color: #64748b;
      cursor: pointer; transition: all 0.2s ease; font-family: inherit;
    }
    .instr-back-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(139,92,246,0.04); }
    .instr-breadcrumb-sep { font-size: 16px; color: #cbd5e1; }
    .instr-breadcrumb-name { font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; }

    /* ─── Resumen Dashboard ─── */
    .resumen-header { margin-bottom: 24px; }
    .resumen-title { margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .resumen-sub { margin: 0; font-size: 13px; color: #94a3b8; }

    .resumen-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .resumen-kpi {
      display: flex; align-items: center; gap: 12px; padding: 16px 18px;
      background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
      border: 1px solid #e8ecf4; border-radius: 14px;
    }
    .resumen-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .resumen-kpi-body { display: flex; flex-direction: column; }
    .resumen-kpi-num { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .resumen-kpi-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }

    .resumen-section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }

    .resumen-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
    .resumen-type-card {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
      border: 1px solid #e8ecf4; border-radius: 14px;
      cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .resumen-type-card:hover { border-color: rgba(139,92,246,0.25); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(139,92,246,0.08); }
    .resumen-type-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .resumen-type-body { flex: 1; min-width: 0; }
    .resumen-type-name { display: block; font-size: 13px; font-weight: 700; color: #0f172a; }
    .resumen-type-count { display: block; font-size: 11px; color: #94a3b8; margin-top: 2px; }

    @media (max-width: 1024px) { .resumen-kpi-grid { grid-template-columns: repeat(2, 1fr); } .resumen-type-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .resumen-kpi-grid { grid-template-columns: 1fr; } .resumen-type-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminDashboardsComponent implements OnInit, OnDestroy, AfterViewInit {
  activeAnalyticsTab: 'resumen' | 'tests' | 'baterias' | 'casos' | 'encuestas' | 'bitacoras' | 'entrenamientos' = 'resumen';

  resumenStats: any = { totalInstrumentos: 0, totalEvaluados: 0, promedioGeneral: '', promedioNum: 0, ultimaActividad: '' };

  // ... (lines in between stay the same)

  /** Compute summary stats for the Resumen tab */
  computeResumenStats(): void {
    const totalTests = this.baseTests.length;
    const totalEvaluados = this.baseTests.reduce((sum: number, t: any) => sum + (t.totalEvaluados || 0), 0);
    const promedios = this.baseTests.filter((t: any) => t.promedio > 0).map((t: any) => t.promedio);
    const promedioGeneral = promedios.length > 0 ? Math.round(promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) : 0;

    let ultimaFecha = '';
    if (this.actividadReciente.length > 0) {
      ultimaFecha = this.actividadReciente[0].fecha || '';
    }

    this.resumenStats = {
      totalInstrumentos: totalTests,
      totalEvaluados,
      promedioGeneral: promedioGeneral > 0 ? `${promedioGeneral}/100` : '',
      promedioNum: promedioGeneral,
      ultimaActividad: ultimaFecha
    };

    // Enrich: count instruments from ALL APIs
    const apis = [
      '/api/encuestas/raw',
      '/api/test/list',
      '/api/baterias/list',
      '/api/entrenamientos/list'
    ];
    let extraCount = 0;
    let completed = 0;
    apis.forEach(url => {
      this.http.get<any>(url).subscribe({
        next: (resp) => {
          const data = resp?.data || resp;
          if (Array.isArray(data)) extraCount += data.length;
          completed++;
          if (completed === apis.length) {
            this.resumenStats = { ...this.resumenStats, totalInstrumentos: Math.max(extraCount, totalTests) };
          }
        },
        error: () => {
          completed++;
          if (completed === apis.length) {
            this.resumenStats = { ...this.resumenStats, totalInstrumentos: Math.max(extraCount, totalTests) };
          }
        }
      });
    });
  }
  modoVista: 'global' | 'por-test' | 'por-usuario' = 'global';
  sidebarCollapsed = false;
  private _exitFocusSub: any;

  // Instrument list for the "global" view per tab
  instrumentList: { id: string; nombre: string; descripcion: string; estado: string; creador: string; fecha: string; totalRespuestas?: number }[] = [];
  loadingInstruments = false;
  instrumentSearchQuery = '';

  // Controladores de Chart.js
  chartGrupalDoughnut: Chart | null = null;
  chartGrupalBar: Chart | null = null;
  chartTestPerformance: Chart | null = null;
  chartUserHistory: Chart | null = null;
  chartUserRadar: Chart | null = null;

  cargando: boolean = true;
  sinDatos: boolean = false;

  totalTest: number = 0;
  promedioGeneral: number = 0;
  tasaFinalizacion: string = '100%';

  // Dynamic KPI values
  kpiTotalEvaluados: number = 0;
  kpiPromedioGeneral: string = '0';
  kpiTasaFinalizacion: string = '–';

  // Distribución de rendimiento
  distExcelente: number = 0;
  distBueno: number = 0;
  distRegular: number = 0;
  distBajo: number = 0;

  // Actividad reciente
  actividadReciente: { nombre: string; iniciales: string; test: string; puntaje: number; fecha: string }[] = [];

  // Trend indicators (Idea #15)
  trendEvaluados = { icon: '–', text: 'Sin datos previos', cls: 'trend-neutral' };
  trendPromedio = { icon: '–', text: 'Sin datos previos', cls: 'trend-neutral' };
  trendFinalizacion = { icon: '–', text: 'Sin datos previos', cls: 'trend-neutral' };
  trendTestVolumen = { icon: '–', text: '', cls: 'trend-neutral' };
  trendTestPromedio = { icon: '–', text: '', cls: 'trend-neutral' };
  trendBaterias = { icon: '↑', text: '4.2% vs mes anterior', cls: 'trend-up' };
  trendEncuestas = { icon: '–', text: 'Aceptable vs Abandonos', cls: 'trend-neutral' };
  trendBitacoras = { icon: '↑', text: 'Calidad Alta de Inputs', cls: 'trend-up' };
  trendEntrenamientos = { icon: '↑', text: 'Planes activos crecientes', cls: 'trend-up' };

  donutLabels: string[] = [];
  donutData: number[] = [];

  baseTests: MockTest[] = [];
  baseUsers: MockUser[] = [];

  selectedTestObj: MockTest | null = null;
  selectedUserObj: MockUser | null = null;
  selectedUserResultObj: UserTestResult | null = null;

  // --- MOCK DATA NUEVAS PESTAÑAS ---
  // BATERÍAS
  dataBateriasRendimiento: any;
  optionsBateriasRendimiento: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } };
  kpiTasaFinalizacionBaterias: string = '88%';

  // CASOS (SIMULADOR)
  dataCasosRutas: any;
  optionsCasosRutas: any = { responsive: true, maintainAspectRatio: false, cutout: '65%' };
  dataCasosPuntajes: any;
  optionsCasosPuntajes: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, indexAxis: 'y' }; // Barras horizontales

  // ENCUESTAS
  dataEncuestasRespuestas: any;
  optionsEncuestasRespuestas: any = { responsive: true, maintainAspectRatio: false };
  kpiEncuestasParticipacion: string = '74%';

  // BITÁCORAS
  dataBitacorasTimeline: any;
  optionsBitacorasTimeline: any = { responsive: true, maintainAspectRatio: false, tension: 0.4 }; // Línea suave
  kpiBitacorasPalabras: string = '450 pal. / 85%';

  // ENTRENAMIENTOS
  dataEntrenamientosProgreso: any;
  optionsEntrenamientosProgreso: any = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } };
  kpiEntrenamientosTotal: number = 0;
  kpiEntrenamientosProgreso: number = 0;
  kpiEntrenamientosCompletados: number = 0;
  entrenamientosPendientes: number = 0;
  entrenamientosEnProgreso: number = 0;
  entrenamientosCompletados: number = 0;

  // Phase 4: Entrenamientos Dashboard
  radarEntrenamientoDatasets: RadarDataset[] = [];
  radarEntrenamientoLabels: string[] = [];
  heatmapEmocionalEntries: HeatmapEntry[] = [];
  waterfallEntrenamientoSteps: WaterfallStep[] = [];
  narrativeEntrenamientoStats: NarrativeStats | null = null;
  adherenciaSemanal: number = 0;
  promedioEmocional: string = '0';
  victoriasRegistradas: number = 0;
  simuladorPromedio: number = 0;

  // ── Nuevos componentes especializados ──
  narrativeStats: NarrativeStats | null = null;
  radarBateriaDatasets: RadarDataset[] = [];
  radarBateriaLabels: string[] = [];
  sankeyNodes: SankeyNode[] = [];
  sankeyLinks: SankeyLink[] = [];
  waterfallSteps: WaterfallStep[] = [];
  likertPreguntasData: LikertPregunta[] = [];
  scatterEncuestasPoints: ScatterPoint[] = [];
  heatmapEntries: HeatmapEntry[] = [];
  sentimentEntries: SentimentEntry[] = [];
  correlationDatasets: CorrelationDataset[] = [];

  // ── Encuestas: gráfica por pregunta individual ──
  encuestaPreguntasList: { id: string; label: string; data?: any }[] = [];
  encuestaPreguntaSeleccionada: string = '';
  encuestaPreguntaChartData: any = null;
  encuestaPreguntaChartOptions: any = {};
  encuestaPreguntaChartType: 'bar' | 'pie' | 'doughnut' = 'bar';
  encuestaCargandoPreguntas: boolean = false;
  private encuestaRespuestasRaw: any[] = [];
  private encuestaPreguntasRaw: any[] = [];

  // Export
  exportLoading = false;
  constructor(
    private resultadosService: ResultadosService,
    private router: Router,
    private analyticsService: AnalyticsDataService,
    private exportService: ChartExportService,
    private http: HttpClient,
    private uiState: UiStateService
  ) { }

  ngOnInit(): void {
    this.initMockDataForTabs();
    this.loadSpecializedData();

    // Listen for shell back button to exit book focus mode
    this._exitFocusSub = this.uiState.exitFocusMode$.subscribe(() => {
      this.sidebarCollapsed = false;
      // Don't reset modoVista or selectedTestObj — the book component
      // will call backToSelection() which returns to the question picker
    });

    this.resultadosService.obtenerTodosLosResultados().subscribe((res: any[]) => {
      this.cargando = false;
      if (!res || res.length === 0) {
        this.sinDatos = true;
        return;
      }
      this.sinDatos = false;

      // KPIs Generales
      this.totalTest = res.length;
      let sumaTotal = 0;

      const testMap = new Map<string, MockTest & { _suma: number }>();
      const userMap = new Map<string, MockUser>();
      const tipoContador: { [key: string]: number } = {};

      res.forEach((item: any) => {
        sumaTotal += item.puntajeGlobal;

        // Contador para Dona
        const testName = item.testNombre || 'Desconocido';
        tipoContador[testName] = (tipoContador[testName] || 0) + 1;

        // Mapeo Tests — only include actual tests (exclude encuestas, simuladores, baterias, bitacoras)
        const tId = item.testId || item.testNombre;
        const itemTipo = (item.tipo || '').toLowerCase();
        const isNonTest = itemTipo.includes('encuesta') || itemTipo.includes('simulador') || itemTipo.includes('bateria') || itemTipo.includes('batería') || itemTipo.includes('bitacora') || itemTipo.includes('bitácora');

        if (!isNonTest) {
          if (!testMap.has(tId)) {
            testMap.set(tId, {
              id: tId, nombre: testName, totalEvaluados: 0, promedio: 0,
              candidatosRendimiento: [], candidatosNombres: [], _suma: 0
            });
          }
          const t = testMap.get(tId)!;
          t.totalEvaluados++;
          t._suma += item.puntajeGlobal;
          t.candidatosRendimiento.push(item.puntajeGlobal);
          t.candidatosNombres.push(item.usuarioNombre || 'Anónimo');
        }

        // Mapeo Users
        const uId = item.usuarioId || ('usr_' + item.usuarioNombre);
        if (!userMap.has(uId)) {
          const splitName = (item.usuarioNombre || 'Anonimo').split(' ');
          const ini = splitName.length > 1 ? (splitName[0][0] + splitName[1][0]).toUpperCase() : splitName[0].substring(0, 2).toUpperCase();
          userMap.set(uId, {
            id: uId, nombre: item.usuarioNombre || 'Candidato Anónimo', rol: item.usuarioRol || 'Candidato', iniciales: ini, resultados: []
          });
        }
        const u = userMap.get(uId)!;
        u.resultados.push({
          testId: tId,
          testNombre: testName,
          fecha: item.fecha || new Date().toLocaleDateString(),
          puntajeGlobal: item.puntajeGlobal,
          competencias: item.competencias || [0, 0, 0, 0, 0, 0],
          labelsCompetencias: item.labelsCompetencias || ['Comp A', 'Comp B', 'Comp C', 'Comp D', 'Comp E', 'Comp F']
        });
      });

      this.promedioGeneral = Math.round(sumaTotal / this.totalTest);

      // Populate KPI display values
      this.kpiTotalEvaluados = this.totalTest;
      this.kpiPromedioGeneral = this.promedioGeneral.toString();
      this.kpiTasaFinalizacion = this.tasaFinalizacion;

      // Distribución de rendimiento
      this.distExcelente = res.filter((r: any) => r.puntajeGlobal >= 90).length;
      this.distBueno = res.filter((r: any) => r.puntajeGlobal >= 70 && r.puntajeGlobal < 90).length;
      this.distRegular = res.filter((r: any) => r.puntajeGlobal >= 50 && r.puntajeGlobal < 70).length;
      this.distBajo = res.filter((r: any) => r.puntajeGlobal < 50).length;

      // Actividad reciente (últimos 6)
      this.actividadReciente = res.slice(-6).reverse().map((r: any) => {
        const nombre = r.usuarioNombre || 'Candidato';
        const splitN = nombre.split(' ');
        const ini = splitN.length > 1 ? (splitN[0][0] + splitN[1][0]).toUpperCase() : splitN[0].substring(0, 2).toUpperCase();
        return {
          nombre,
          iniciales: ini,
          test: r.testNombre || 'Test',
          puntaje: r.puntajeGlobal,
          fecha: r.fecha || 'Hoy'
        };
      });

      // Compute trends (Idea #15)
      this.computeTrends(res);

      this.donutLabels = Object.keys(tipoContador);
      this.donutData = Object.values(tipoContador);

      this.baseTests = Array.from(testMap.values()).map(t => {
        t.promedio = Math.round(t._suma / t.totalEvaluados);
        return t;
      });
      this.baseUsers = Array.from(userMap.values());

      setTimeout(() => this.initCurrentViewCharts(), 100);
      this.computeResumenStats();

      // Si baseTests está vacío aún, cargar desde export/responses como fallback
      if (this.baseTests.length === 0) {
        this.loadBaseDataFromExport();
      }
    });
  }

  /** Carga baseTests y baseUsers desde /api/export/responses (MongoDB) como fuente secundaria */
  private loadBaseDataFromExport() {
    this.http.get<any>('/api/export/responses').subscribe({
      next: (resp) => {
        if (!resp || !resp.data || resp.data.length === 0) return;

        const testMap = new Map<string, MockTest & { _suma: number }>();
        const userMap = new Map<string, MockUser>();

        resp.data.forEach((item: any) => {
          const tId = item.instrumentoId || item.instrumento;
          const testName = item.instrumento || 'Instrumento';
          const score = item.puntaje || 0;
          const userName = item.identificador || 'Candidato';

          // Mapeo Tests
          if (tId && !testMap.has(tId)) {
            testMap.set(tId, {
              id: tId, nombre: testName, totalEvaluados: 0, promedio: 0,
              candidatosRendimiento: [], candidatosNombres: [], _suma: 0
            });
          }
          if (tId && testMap.has(tId)) {
            const t = testMap.get(tId)!;
            t.totalEvaluados++;
            t._suma += score;
            t.candidatosRendimiento.push(score);
            t.candidatosNombres.push(userName);
          }

          // Mapeo Users
          const uId = 'usr_' + userName;
          if (!userMap.has(uId)) {
            const splitName = userName.split(' ');
            const ini = splitName.length > 1 ? (splitName[0][0] + splitName[1][0]).toUpperCase() : splitName[0].substring(0, 2).toUpperCase();
            userMap.set(uId, {
              id: uId, nombre: userName, rol: 'Candidato', iniciales: ini, resultados: []
            });
          }
          const u = userMap.get(uId)!;
          u.resultados.push({
            testId: tId,
            testNombre: testName,
            fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-CO') : 'Sin fecha',
            puntajeGlobal: score,
            competencias: [score, Math.max(0, score - 5), Math.min(100, score + 3), 80, 85, 78],
            labelsCompetencias: ['Aptitud', 'Precisión', 'Análisis', 'Velocidad', 'Cognitivo', 'Resolución']
          });
        });

        // Merge con datos existentes (no reemplazar si ya hay datos)
        if (this.baseTests.length === 0) {
          this.baseTests = Array.from(testMap.values()).map(t => {
            t.promedio = t.totalEvaluados > 0 ? Math.round(t._suma / t.totalEvaluados) : 0;
            return t;
          });
        }
        if (this.baseUsers.length === 0) {
          this.baseUsers = Array.from(userMap.values());
        }

        // Actualizar KPIs si estaban en 0
        if (this.totalTest === 0 && resp.data.length > 0) {
          this.sinDatos = false;
          this.cargando = false;
          this.totalTest = resp.data.length;
          this.kpiTotalEvaluados = this.totalTest;
          const sumaTotal = resp.data.reduce((sum: number, r: any) => sum + (r.puntaje || 0), 0);
          this.promedioGeneral = Math.round(sumaTotal / this.totalTest);
          this.kpiPromedioGeneral = this.promedioGeneral.toString();
        }
      },
      error: () => { /* silent fallback */ }
    });
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroyAllCharts();
    this._exitFocusSub?.unsubscribe();
    // Ensure sidebar is restored if we navigate away while in book mode
    this.uiState.showSidebar();
  }

  // ----------------------------------------------------------------------
  // CONTROLES DE VISTA
  // ----------------------------------------------------------------------

  selectMainTab(tabName: 'resumen' | 'tests' | 'baterias' | 'casos' | 'encuestas' | 'bitacoras' | 'entrenamientos') {
    this.activeAnalyticsTab = tabName;
    // Reset sub-view to global when switching instrument tabs
    this.modoVista = 'global';
    this.instrumentSearchQuery = '';
    this.sidebarCollapsed = false;
    this.uiState.showSidebar();
    this.selectedTestObj = null;
    this.selectedUserObj = null;
    this.selectedUserResultObj = null;
    this.destroyAllCharts();
    // Load instrument list for instrument tabs
    if (tabName !== 'tests' && tabName !== 'resumen') {
      this.loadInstrumentList(tabName);
    }
    if (tabName === 'resumen') { this.computeResumenStats(); }
    setTimeout(() => this.initCurrentViewCharts(), 50);
  }

  onBookModeChange(isBookMode: boolean): void {
    this.sidebarCollapsed = isBookMode;
    if (isBookMode) { this.uiState.hideSidebar(); }
    else { this.uiState.showSidebar(); }
  }

  get filteredInstrumentList() {
    if (!this.instrumentSearchQuery) return this.instrumentList;
    const q = this.instrumentSearchQuery.toLowerCase();
    return this.instrumentList.filter(i => i.nombre.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q));
  }

  get filteredTestsList() {
    if (!this.instrumentSearchQuery) return this.baseTests;
    const q = this.instrumentSearchQuery.toLowerCase();
    return this.baseTests.filter((t: any) => t.nombre.toLowerCase().includes(q));
  }

  selectTestFromList(test: any): void {
    this.selectedTestObj = test;
    this.modoVista = 'por-test';
    this.destroyAllCharts();
    setTimeout(() => this.initCurrentViewCharts(), 50);
  }



  private loadInstrumentList(tab: string): void {
    const apiMap: Record<string, string> = {
      tests: '/api/test/list',
      encuestas: '/api/encuestas/raw',
      baterias: '/api/baterias/raw',
      bitacoras: '/api/bitacoras/raw',
      entrenamientos: '/api/entrenamientos/raw',
      casos: '/api/test/list', // simulators are tests
    };
    const url = apiMap[tab];
    if (!url) return;
    this.loadingInstruments = true;
    this.instrumentList = [];
    this.instrumentSearchQuery = '';

    this.http.get<any>(url).subscribe({
      next: (resp) => {
        const items = resp?.data || resp || [];
        this.instrumentList = items.map((item: any) => ({
          id: item.id || item._id || '',
          nombre: item.nombre || item.title || 'Sin nombre',
          descripcion: item.descripcion || '',
          estado: item.estado || item.estadoPublicacion || 'Activo',
          creador: item.creado_por || item.autor_nombre || '',
          fecha: item.fechaAlta || item.createdAt || item.fechaCreacion || '',
          totalRespuestas: item.totalRespuestas || item.totalEvaluados || undefined
        }));
        this.loadingInstruments = false;
      },
      error: () => {
        this.loadingInstruments = false;
      }
    });
  }

  selectInstrumentFromList(instrument: any): void {
    // Create a MockTest-like object and switch to por-test mode
    this.selectedTestObj = {
      id: instrument.id,
      nombre: instrument.nombre,
      totalEvaluados: instrument.totalRespuestas || 0,
      promedio: 0,
      tipo: this.activeAnalyticsTab,
      candidatosRendimiento: []
    } as any;
    this.modoVista = 'por-test';
    this.destroyAllCharts();
  }

  cambiarModo(modo: 'global' | 'por-test' | 'por-usuario') {
    if (this.modoVista !== modo) {
      this.modoVista = modo;
      this.destroyAllCharts();

      // Reset states
      if (modo !== 'por-test') this.selectedTestObj = null;
      if (modo !== 'por-usuario') { this.selectedUserObj = null; this.selectedUserResultObj = null; }

      setTimeout(() => {
        this.initCurrentViewCharts();
      }, 50);
    }
  }

  // Idea #15: Compute trend indicators from real data
  computeTrends(resultados: ResultadoBackend[]): void {
    if (resultados.length < 2) {
      // Not enough data to compare
      this.trendEvaluados = { icon: '📊', text: `${resultados.length} evaluación${resultados.length !== 1 ? 'es' : ''} total`, cls: 'trend-neutral' };
      this.trendPromedio = { icon: '–', text: 'Insuficiente para tendencia', cls: 'trend-neutral' };
      this.trendFinalizacion = { icon: '✓', text: this.tasaFinalizacion, cls: 'trend-up' };
      return;
    }

    // Split results into halves (recent vs older) to simulate period comparison
    const sorted = [...resultados].sort((a, b) => {
      return new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime();
    });
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    // TREND: Evaluados (volume change)
    const olderCount = older.length;
    const recentCount = recent.length;
    if (olderCount > 0) {
      const pctChange = Math.round(((recentCount - olderCount) / olderCount) * 100);
      if (pctChange > 0) {
        this.trendEvaluados = { icon: '↑', text: `${pctChange}% vs período anterior`, cls: 'trend-up' };
      } else if (pctChange < 0) {
        this.trendEvaluados = { icon: '↓', text: `${Math.abs(pctChange)}% vs período anterior`, cls: 'trend-down' };
      } else {
        this.trendEvaluados = { icon: '–', text: 'Estable vs período anterior', cls: 'trend-neutral' };
      }
    }

    // TREND: Promedio (point change)
    const olderAvg = older.reduce((s, r) => s + r.puntajeGlobal, 0) / (older.length || 1);
    const recentAvg = recent.reduce((s, r) => s + r.puntajeGlobal, 0) / (recent.length || 1);
    const pointDiff = Math.round((recentAvg - olderAvg) * 10) / 10;
    if (pointDiff > 0) {
      this.trendPromedio = { icon: '↑', text: `${pointDiff} pts de mejora`, cls: 'trend-up' };
    } else if (pointDiff < 0) {
      this.trendPromedio = { icon: '↓', text: `${Math.abs(pointDiff)} pts de caída`, cls: 'trend-down' };
    } else {
      this.trendPromedio = { icon: '–', text: 'Estable vs período anterior', cls: 'trend-neutral' };
    }

    // TREND: Tasa de finalización (based on completed vs started ratio)
    const finRate = parseInt(this.tasaFinalizacion) || 0;
    if (finRate >= 90) {
      this.trendFinalizacion = { icon: '✓', text: 'Excelente tasa de finalización', cls: 'trend-up' };
    } else if (finRate >= 70) {
      this.trendFinalizacion = { icon: '–', text: 'Aceptable, puede mejorar', cls: 'trend-neutral' };
    } else {
      this.trendFinalizacion = { icon: '↓', text: 'Baja tasa, revisar abandono', cls: 'trend-down' };
    }
  }

  destroyAllCharts() {
    if (this.chartGrupalDoughnut) { this.chartGrupalDoughnut.destroy(); this.chartGrupalDoughnut = null; }
    if (this.chartGrupalBar) { this.chartGrupalBar.destroy(); this.chartGrupalBar = null; }
    if (this.chartTestPerformance) { this.chartTestPerformance.destroy(); this.chartTestPerformance = null; }
    if (this.chartUserHistory) { this.chartUserHistory.destroy(); this.chartUserHistory = null; }
    if (this.chartUserRadar) { this.chartUserRadar.destroy(); this.chartUserRadar = null; }
  }

  initCurrentViewCharts() {
    if (this.modoVista === 'global') this.renderGlobalCharts();
    if (this.modoVista === 'por-test' && this.selectedTestObj) this.renderTestCharts();
    if (this.modoVista === 'por-usuario' && this.selectedUserObj) this.renderUserCharts();
  }

  // ----------------------------------------------------------------------
  // SELECTORS HANDLERS
  // ----------------------------------------------------------------------
  onSelectTest(e: any) {
    const val = e.target.value;
    this.selectedTestObj = this.baseTests.find(t => t.id === val) || null;
    if (this.chartTestPerformance) { this.chartTestPerformance.destroy(); this.chartTestPerformance = null; }
    if (this.selectedTestObj) {
      // Compute per-test trends (Idea #15)
      const avg = this.selectedTestObj.promedio;
      const diff = avg - this.promedioGeneral;
      if (diff > 0) {
        this.trendTestPromedio = { icon: '↑', text: `${Math.abs(diff)} pts sobre promedio global`, cls: 'trend-up' };
      } else if (diff < 0) {
        this.trendTestPromedio = { icon: '↓', text: `${Math.abs(diff)} pts bajo promedio global`, cls: 'trend-down' };
      } else {
        this.trendTestPromedio = { icon: '–', text: 'Igual al promedio global', cls: 'trend-neutral' };
      }
      const pct = this.totalTest > 0 ? Math.round((this.selectedTestObj.totalEvaluados / this.totalTest) * 100) : 0;
      this.trendTestVolumen = { icon: '📊', text: `${pct}% del volumen total`, cls: 'trend-neutral' };

      setTimeout(() => this.renderTestCharts(), 50);

      // Si estamos en tab encuestas, cargar preguntas de la encuesta seleccionada
      if (this.activeAnalyticsTab === 'encuestas') {
        this.loadEncuestaPreguntas(this.selectedTestObj.id);
      }
    } else {
      this.encuestaPreguntasList = [];
      this.encuestaPreguntaSeleccionada = '';
      this.encuestaPreguntaChartData = null;
    }
  }

  // ── Cargar preguntas de encuesta para gráfica individual ──
  loadEncuestaPreguntas(instrumentId: string) {
    this.encuestaCargandoPreguntas = true;
    this.encuestaPreguntasList = [];
    this.encuestaPreguntaSeleccionada = '';
    this.encuestaPreguntaChartData = null;
    this.encuestaRespuestasRaw = [];
    this.encuestaPreguntasRaw = [];

    // 1. Obtener definición del instrumento
    this.http.get<any>(`/api/test/${instrumentId}`).subscribe({
      next: (testDoc: any) => {
        const preguntas = (testDoc?.datos?.preguntas || testDoc?.data?.preguntas || testDoc?.preguntas || [])
          .filter((p: any) => p.tipo !== 'system_settings' && p.typeId !== 'system_settings' &&
            p.id !== 'SYSTEM_SETTINGS' && p.text !== 'SYSTEM_SETTINGS' && p.textoPregunta !== 'SYSTEM_SETTINGS');

        this.encuestaPreguntasRaw = preguntas;
        this.encuestaPreguntasList = preguntas.map((p: any, i: number) => ({
          id: p.id || p._id || `q${i}`,
          label: `${i + 1}. ${p.textoPregunta || p.text || p.label || 'Pregunta ' + (i + 1)}`,
          data: p
        }));

        // 2. Obtener respuestas
        this.http.get<any>(`/api/export/responses-full?instrumentId=${instrumentId}`).subscribe({
          next: (admRes: any) => {
            this.encuestaRespuestasRaw = (admRes?.data || []).filter((r: any) => r.estado === 'Finalizado');
            this.encuestaCargandoPreguntas = false;
          },
          error: () => { this.encuestaCargandoPreguntas = false; }
        });
      },
      error: () => { this.encuestaCargandoPreguntas = false; }
    });
  }

  onSelectEncuestaPregunta(e: any) {
    const val = e.target.value;
    this.encuestaPreguntaSeleccionada = val;
    if (!val) { this.encuestaPreguntaChartData = null; return; }
    this.buildEncuestaPreguntaChart(val);
  }

  setEncuestaChartType(type: 'bar' | 'pie' | 'doughnut') {
    this.encuestaPreguntaChartType = type;
    if (this.encuestaPreguntaSeleccionada) {
      this.buildEncuestaPreguntaChart(this.encuestaPreguntaSeleccionada);
    }
  }

  private buildEncuestaPreguntaChart(preguntaId: string) {
    const pregIndex = this.encuestaPreguntasList.findIndex(p => p.id === preguntaId);
    const pregDef = pregIndex >= 0 ? this.encuestaPreguntasList[pregIndex] : null;
    if (!pregDef) { this.encuestaPreguntaChartData = null; return; }

    // Extraer respuestas para esta pregunta por posición (cross-reference positional)
    const respuestas: { [answer: string]: number } = {};

    this.encuestaRespuestasRaw.forEach((resp: any) => {
      if (!resp.resultadosCompletos || !Array.isArray(resp.resultadosCompletos)) return;

      // Try direct ID match first
      let match = resp.resultadosCompletos.find((a: any) => String(a.questionId) === String(preguntaId));

      // Positional fallback
      if (!match && pregIndex < resp.resultadosCompletos.length) {
        match = resp.resultadosCompletos[pregIndex];
      }

      if (match) {
        let val = match.value != null ? String(match.value) : 'Sin respuesta';
        // Resolve option label
        val = this.resolveEncuestaOptionLabel(pregDef.data, val);
        respuestas[val] = (respuestas[val] || 0) + 1;
      }
    });

    const labels = Object.keys(respuestas);
    const data = Object.values(respuestas);
    const colors = ['var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--accent)', '#ef4444', '#ec4899', 'var(--accent)', 'var(--accent)', '#f97316'];
    const isPie = this.encuestaPreguntaChartType === 'pie' || this.encuestaPreguntaChartType === 'doughnut';

    this.encuestaPreguntaChartData = {
      labels,
      datasets: [{
        label: 'Respuestas',
        data,
        backgroundColor: isPie
          ? labels.map((_, i) => colors[i % colors.length])
          : labels.map((_, i) => colors[i % colors.length] + '80'),
        borderColor: labels.map((_, i) => colors[i % colors.length]),
        borderWidth: 2,
        borderRadius: isPie ? 0 : 6
      }]
    };

    this.encuestaPreguntaChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: isPie, position: 'bottom', labels: { font: { size: 11, family: "'Inter', sans-serif" }, padding: 12 } },
        title: { display: false }
      },
      scales: isPie ? {} : {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
        y: { beginAtZero: true, title: { display: true, text: 'Frecuencia', font: { size: 11, weight: '600' } }, grid: { color: 'rgba(0,0,0,0.04)' } }
      }
    };
  }

  private resolveEncuestaOptionLabel(question: any, rawValue: string): string {
    if (!question) return rawValue;
    const opts = question.opciones || question.options || [];
    if (opts.length === 0) return rawValue;
    const idx = parseInt(rawValue, 10);
    if (!isNaN(idx) && idx >= 0 && idx < opts.length) {
      const opt = opts[idx];
      return typeof opt === 'object' ? (opt.label || opt.texto || rawValue) : String(opt);
    }
    return rawValue;
  }

  onSelectUser(e: any) {
    const val = e.target.value;
    this.selectedUserObj = this.baseUsers.find(u => u.id === val) || null;
    this.selectedUserResultObj = null; // reset sub-selector

    if (this.chartUserHistory) { this.chartUserHistory.destroy(); this.chartUserHistory = null; }
    if (this.chartUserRadar) { this.chartUserRadar.destroy(); this.chartUserRadar = null; }

    if (this.selectedUserObj) {
      setTimeout(() => this.renderUserCharts(), 50);
    }
  }

  onSelectUserTest(e: any) {
    const val = e.target.value;
    if (!this.selectedUserObj) return;
    this.selectedUserResultObj = this.selectedUserObj.resultados.find(r => r.testId === val) || null;

    if (this.chartUserRadar) { this.chartUserRadar.destroy(); this.chartUserRadar = null; }

    if (this.selectedUserResultObj) {
      setTimeout(() => this.renderRadarChart(), 50);
    }
  }

  // ----------------------------------------------------------------------
  // RENDER CHARTS
  // ----------------------------------------------------------------------
  renderGlobalCharts() {
    // 1. Doughnut
    const ctxDoughnut = document.getElementById('donutChart') as HTMLCanvasElement;
    if (ctxDoughnut) {
      this.chartGrupalDoughnut = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
          labels: this.donutLabels.slice(0, 6),
          datasets: [{
            data: this.donutData.slice(0, 6),
            backgroundColor: ['var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--accent)', '#ec4899', 'var(--accent)'],
            borderWidth: 0, hoverOffset: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'inherit' }, boxWidth: 12 } } },
          cutout: '75%'
        }
      });
    }

    // 2. Bar Global
    const ctxBar = document.getElementById('barChart') as HTMLCanvasElement;
    if (ctxBar) {
      this.chartGrupalBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Promedio Empresa',
            data: [72, 75, 80, 78, 85, 89],
            backgroundColor: 'var(--accent)', borderRadius: 6, barThickness: 30
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, border: { display: false } },
            x: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }
  }

  renderTestCharts() {
    if (!this.selectedTestObj) return;
    const ctx = document.getElementById('testPerformanceChart') as HTMLCanvasElement;
    if (ctx) {
      this.chartTestPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.selectedTestObj.candidatosNombres,
          datasets: [{
            label: 'Puntaje',
            data: this.selectedTestObj.candidatosRendimiento,
            backgroundColor: 'var(--accent)', // purple
            borderRadius: 6,
            barThickness: 25
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, border: { display: false } },
            x: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }
  }

  renderUserCharts() {
    if (!this.selectedUserObj) return;

    // Historial Global de Tests del Usuario
    const ctxHistory = document.getElementById('userHistoryChart') as HTMLCanvasElement;
    if (ctxHistory) {
      this.chartUserHistory = new Chart(ctxHistory, {
        type: 'bar',
        data: {
          labels: this.selectedUserObj.resultados.map(r => r.testNombre),
          datasets: [{
            label: 'Puntaje Obtenido',
            data: this.selectedUserObj.resultados.map(r => r.puntajeGlobal),
            backgroundColor: 'var(--accent)', // emerald
            borderRadius: 6,
            barThickness: 40
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, border: { display: false } },
            x: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }
  }

  renderRadarChart() {
    if (!this.selectedUserResultObj) return;
    const ctxRadar = document.getElementById('radarChart') as HTMLCanvasElement;
    if (ctxRadar) {
      this.chartUserRadar = new Chart(ctxRadar, {
        type: 'radar',
        data: {
          labels: this.selectedUserResultObj.labelsCompetencias,
          datasets: [{
            label: 'Candidato',
            data: this.selectedUserResultObj.competencias,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'var(--accent)',
            pointBackgroundColor: '#fff',
            pointBorderColor: 'var(--accent)',
            pointHoverBackgroundColor: 'var(--accent)',
            pointHoverBorderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            r: {
              min: 0, max: 100,
              angleLines: { color: '#e2e8f0' },
              grid: { color: '#e2e8f0' },
              pointLabels: { font: { family: 'inherit', size: 12 }, color: 'var(--color-texto-suave)' },
              ticks: { display: false }
            }
          }
        }
      });
    }
  }

  // ----------------------------------------------------------------------
  // INYECCIÓN MOCK DATA PARA SUBCOMPONENTES DE GRÁFICAS REUTILIZABLES
  // ----------------------------------------------------------------------
  private initMockDataForTabs() {
    // 1. Data Baterías
    this.dataBateriasRendimiento = {
      labels: ['Batería Liderazgo', 'Batería Ingeniería', 'Batería Ventas', 'Batería Administrativa'],
      datasets: [{
        label: 'Promedio de Rendimiento',
        data: [82, 91, 76, 85],
        backgroundColor: 'var(--accent)',
        borderRadius: 8,
        barThickness: 45
      }]
    };

    // 2. Data Casos
    this.dataCasosRutas = {
      labels: ['Ruta Democrática', 'Ruta Autocrática', 'Ruta Laissez-Faire', 'Otras rutas'],
      datasets: [{
        data: [45, 25, 20, 10],
        backgroundColor: ['var(--accent)', 'var(--accent)', 'var(--accent)', '#94a3b8'],
        borderWidth: 0
      }]
    };

    this.dataCasosPuntajes = {
      labels: ['Liderazgo en Crisis 101', 'Desafío Cadena de Supply', 'Conflicto Organizacional', 'Venta Difícil Corporativa'],
      datasets: [
        { label: 'Exitosos', data: [70, 65, 80, 50], backgroundColor: 'var(--accent)', borderRadius: 4 },
        { label: 'Fracasos', data: [30, 35, 20, 50], backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    };
    this.optionsCasosPuntajes.scales = { x: { stacked: true }, y: { stacked: true } };

    // 3. Data Encuestas
    this.dataEncuestasRespuestas = {
      labels: ['Pregunta 1', 'Pregunta 2', 'Pregunta 3', 'Pregunta 4', 'Pregunta 5'],
      datasets: [
        { label: 'Totalmente de acuerdo', data: [120, 110, 90, 150, 80], backgroundColor: 'var(--accent)' },
        { label: 'De acuerdo', data: [80, 70, 60, 40, 50], backgroundColor: 'var(--accent)' },
        { label: 'Neutral', data: [40, 50, 70, 20, 60], backgroundColor: '#94a3b8' },
        { label: 'En desacuerdo', data: [15, 20, 30, 10, 40], backgroundColor: 'var(--accent)' },
        { label: 'Totalmente en desacuerdo', data: [5, 10, 10, 5, 20], backgroundColor: '#ef4444' }
      ]
    };
    this.optionsEncuestasRespuestas.scales = { x: { stacked: true }, y: { stacked: true } };

    // 4. Data Bitácoras
    this.dataBitacorasTimeline = {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [{
        label: 'Entradas de Bitácora Globales',
        data: [15, 30, 45, 25, 60, 10, 5],
        borderColor: 'var(--accent)',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderColor: 'var(--accent)',
        pointRadius: 5
      }]
    };

    // 5. Data Entrenamientos
    this.kpiEntrenamientosTotal = 8;
    this.kpiEntrenamientosProgreso = 54;
    this.kpiEntrenamientosCompletados = 3;
    this.entrenamientosPendientes = 2;
    this.entrenamientosEnProgreso = 3;
    this.entrenamientosCompletados = 3;

    this.dataEntrenamientosProgreso = {
      labels: ['Liderazgo Situacional', 'Comunicación Efectiva', 'Gestión de Equipos', 'Resolución de Conflictos', 'Análisis Financiero', 'Razonamiento Lógico', 'Habilidades Digitales', 'Atención al Cliente'],
      datasets: [{
        label: 'Progreso (%)',
        data: [100, 85, 100, 60, 45, 100, 30, 0],
        backgroundColor: [100, 85, 100, 60, 45, 100, 30, 0].map(v => v >= 100 ? 'var(--accent)' : v >= 50 ? 'var(--accent)' : v > 0 ? 'var(--accent)' : '#e2e8f0'),
        borderRadius: 6,
        barThickness: 28
      }]
    };

    // Phase 4 — Entrenamientos Dashboard Data
    this.initEntrenamientosPhase4();

    // ── Inicializar datos para componentes especializados ──
    this.initSpecializedChartData();
  }

  private initEntrenamientosPhase4(): void {
    // 4.1 Radar de Flexibilidad y Crecimiento
    this.radarEntrenamientoLabels = ['Asertividad', 'Autocontrol', 'Empatía', 'Toma de Decisiones', 'Comunicación', 'Resiliencia'];
    this.radarEntrenamientoDatasets = [
      {
        label: 'Evaluación Inicial',
        data: [45, 55, 60, 40, 50, 35],
        color: '#94a3b8'
      },
      {
        label: 'Post-Entrenamiento',
        data: [72, 68, 75, 65, 78, 60],
        color: 'var(--accent)'
      }
    ];

    // 4.2 Heatmap Emocional (simulated data — last 4 weeks)
    const today = new Date();
    this.heatmapEmocionalEntries = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const intensity = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 6) + 2;
      this.heatmapEmocionalEntries.push({ date: dateStr, value: intensity });
    }

    // 4.3 Adherencia y ROI
    this.adherenciaSemanal = 75;
    this.promedioEmocional = '6.2';
    this.victoriasRegistradas = 24;
    this.simuladorPromedio = 68;

    // 4.3b Waterfall de Mejora
    this.waterfallEntrenamientoSteps = [
      { label: 'Línea Base', delta: 48, tipo: 'total' },
      { label: 'Sprint 1: Asertividad', delta: 8, tipo: 'incremento' },
      { label: 'Sprint 2: Autocontrol', delta: 5, tipo: 'incremento' },
      { label: 'Sprint 3: Empatía', delta: 7, tipo: 'incremento' },
      { label: 'Sprint 4: Comunicación', delta: 4, tipo: 'incremento' },
      { label: 'Semana sin actividad', delta: -2, tipo: 'decremento' },
      { label: 'Sprint 5: Resiliencia', delta: 6, tipo: 'incremento' },
      { label: 'Puntaje Actual', delta: 76, tipo: 'total' }
    ];

    // 4.4 Narrativa de Entrenamientos
    this.narrativeEntrenamientoStats = {
      count: this.kpiEntrenamientosTotal || 8,
      promedio: this.kpiEntrenamientosProgreso || 54,
      mediana: 52,
      minimo: 15,
      maximo: 100,
      desviacionEstandar: 22.5,
      distribucion: {
        excelente: this.kpiEntrenamientosCompletados || 3,
        bueno: this.entrenamientosEnProgreso || 3,
        regular: this.entrenamientosPendientes || 2,
        bajo: 0
      },
      tendenciaTemporal: [
        { mes: 'Ene 2026', totalEvaluados: 3, promedioMes: 35 },
        { mes: 'Feb 2026', totalEvaluados: 5, promedioMes: 48 },
        { mes: 'Mar 2026', totalEvaluados: 8, promedioMes: 54 }
      ]
    };
  }

  private initSpecializedChartData(): void {
    // 1. Narrativa de Datos (Tests - Global)
    this.narrativeStats = {
      count: this.kpiTotalEvaluados || 25,
      promedio: parseFloat(this.kpiPromedioGeneral) || 72,
      mediana: 74,
      minimo: 35,
      maximo: 98,
      desviacionEstandar: 15.3,
      percentil25: 62,
      percentil75: 85,
      distribucion: {
        excelente: this.distExcelente || 5,
        bueno: this.distBueno || 12,
        regular: this.distRegular || 6,
        bajo: this.distBajo || 2
      },
      tendenciaTemporal: [
        { mes: 'Ene 2026', totalEvaluados: 8, promedioMes: 68 },
        { mes: 'Feb 2026', totalEvaluados: 12, promedioMes: 71 },
        { mes: 'Mar 2026', totalEvaluados: 15, promedioMes: 74 }
      ]
    };

    // 2. Radar Multicapa (Baterías)
    this.radarBateriaLabels = ['Aptitud Verbal', 'Razonamiento Lógico', 'Aptitud Numérica', 'Atención al Detalle', 'Pensamiento Crítico'];
    this.radarBateriaDatasets = [
      { label: 'Batería Ejecutiva', data: [82, 78, 90, 65, 88], color: 'var(--accent)' },
      { label: 'Batería Técnica', data: [70, 92, 85, 80, 72], color: '#f43f5e' },
      { label: 'Perfil Ideal', data: [85, 85, 85, 85, 85], color: 'var(--accent)' }
    ];

    // 3. Sankey (Simulador)
    this.sankeyNodes = [
      { id: 'inicio', label: 'Escenario Inicial' },
      { id: 'invertir', label: 'Invertir en I+D' },
      { id: 'reducir', label: 'Reducir Costos' },
      { id: 'expandir', label: 'Expandir Mercado' },
      { id: 'innov_ok', label: 'Innovación Exitosa' },
      { id: 'innov_fail', label: 'Sin Retorno' },
      { id: 'ahorro', label: 'Ahorro Logrado' },
      { id: 'market_ok', label: 'Éxito Comercial' },
      { id: 'market_fail', label: 'Fracaso Comercial' }
    ];
    this.sankeyLinks = [
      { source: 'inicio', target: 'invertir', value: 45 },
      { source: 'inicio', target: 'reducir', value: 30 },
      { source: 'inicio', target: 'expandir', value: 25 },
      { source: 'invertir', target: 'innov_ok', value: 35 },
      { source: 'invertir', target: 'innov_fail', value: 10 },
      { source: 'reducir', target: 'ahorro', value: 30 },
      { source: 'expandir', target: 'market_ok', value: 18 },
      { source: 'expandir', target: 'market_fail', value: 7 }
    ];

    // 4. Waterfall (Simulador)
    this.waterfallSteps = [
      { label: 'Presupuesto', delta: 1000, tipo: 'total' },
      { label: 'Inversión I+D', delta: -200, tipo: 'decremento' },
      { label: 'Ahorro operativo', delta: 150, tipo: 'incremento' },
      { label: 'Marketing', delta: -120, tipo: 'decremento' },
      { label: 'Ventas nuevas', delta: 380, tipo: 'incremento' },
      { label: 'Impuestos', delta: -95, tipo: 'decremento' },
      { label: 'Balance Final', delta: 0, tipo: 'total' }
    ];

    // 5. Divergent Bar (Encuestas)
    this.likertPreguntasData = [
      { pregunta: '¿Recomendarías esta empresa?', conteos: [3, 8, 20, 35, 34] },
      { pregunta: '¿Estás satisfecho con tu rol?', conteos: [5, 12, 25, 30, 28] },
      { pregunta: '¿El ambiente laboral es positivo?', conteos: [2, 6, 18, 40, 34] },
      { pregunta: '¿La comunicación interna es clara?', conteos: [8, 15, 30, 25, 22] },
      { pregunta: '¿Tienes oportunidades de crecimiento?', conteos: [10, 18, 28, 24, 20] }
    ];

    // 6. Quadrant Scatter (Encuestas)
    this.scatterEncuestasPoints = [
      { x: 85, y: 90, label: 'Encuesta Clima Laboral', group: 'Satisfacción' },
      { x: 45, y: 75, label: 'Encuesta Liderazgo', group: 'Satisfacción' },
      { x: 70, y: 30, label: 'Encuesta Onboarding', group: 'Participación' },
      { x: 90, y: 85, label: 'Encuesta Beneficios', group: 'Satisfacción' },
      { x: 30, y: 40, label: 'Encuesta Tecnología', group: 'Participación' },
      { x: 60, y: 55, label: 'Encuesta Capacitación', group: 'Participación' },
      { x: 80, y: 70, label: 'Encuesta Bienestar', group: 'Satisfacción' },
      { x: 50, y: 85, label: 'Encuesta Diversidad', group: 'Satisfacción' }
    ];

    // 7. Calendar Heatmap (Bitácoras)
    const today = new Date();
    this.heatmapEntries = [];
    for (let i = 0; i < 180; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      const val = Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : 0;
      if (val > 0) {
        this.heatmapEntries.push({ date: dateStr, value: val });
      }
    }

    // 8. Sentiment Timeline (Bitácoras)
    this.sentimentEntries = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      this.sentimentEntries.push({
        date: d.toISOString(),
        value: parseFloat((Math.random() * 2 - 1).toFixed(2)),
        text: ['Reflexión positiva', 'Día productivo', 'Frustración con proyecto', 'Aprendizaje valioso', 'Día tranquilo'][Math.floor(Math.random() * 5)]
      });
    }

    // 9. Correlation Datasets (Cross-Correlation)
    this.correlationDatasets = [
      {
        id: 'tests_puntaje', label: 'Puntajes Tests',
        values: Array.from({ length: 20 }, () => Math.round(Math.random() * 80 + 20)),
        color: 'var(--accent)'
      },
      {
        id: 'baterias_global', label: 'Score Baterías',
        values: Array.from({ length: 20 }, () => Math.round(Math.random() * 70 + 30)),
        color: 'var(--accent)'
      },
      {
        id: 'simulador_eficacia', label: 'Eficacia Simulador',
        values: Array.from({ length: 20 }, () => Math.round(Math.random() * 60 + 40)),
        color: 'var(--accent)'
      },
      {
        id: 'encuestas_satisfaccion', label: 'Satisfacción Encuestas',
        values: Array.from({ length: 20 }, () => Math.round(Math.random() * 50 + 50)),
        color: '#ec4899'
      }
    ];
  }

  /** Intenta cargar datos reales desde la API para los componentes especializados.
   *  Si falla, los mock data de initSpecializedChartData() se mantienen. */
  private loadSpecializedData(): void {
    // Stats-based charts (narrative, likert, waterfall, radar)
    this.analyticsService.getTransformedData().subscribe({
      next: (data: any) => {
        if (data.raw.count > 0) {
          this.narrativeStats = data.narrative;
          if (data.likert.length > 0) this.likertPreguntasData = data.likert;
          if (data.waterfall.length > 0) this.waterfallSteps = data.waterfall;
          if (data.radar.datasets.length > 0) {
            this.radarBateriaDatasets = data.radar.datasets;
            this.radarBateriaLabels = data.radar.labels;
          }
        }
      },
      error: (err: any) => {
        console.warn('[Analytics] Usando datos demo para gráficas especializadas:', err.message);
      }
    });

    // Result-based charts (heatmap, sentiment, scatter)
    this.analyticsService.getTransformedResults().subscribe({
      next: (data: any) => {
        if (data.raw.length > 0) {
          if (data.heatmap.length > 0) this.heatmapEntries = data.heatmap;
          if (data.sentiment.length > 0) this.sentimentEntries = data.sentiment;
          if (data.scatter.length > 0) this.scatterEncuestasPoints = data.scatter;
        }
      },
      error: (err: any) => {
        console.warn('[Analytics] Usando datos demo para heatmap/sentiment/scatter:', err.message);
      }
    });
  }

  openMatchmakerModal(candidateId: string) {
    this.router.navigate(['/admin-home/perfiles-puesto/match', candidateId]);
  }

  // Compartir Informe
  mostrarModalCompartir = false;
  enlaceCompartir = '';
  enlaceCopiadoMsg = 'Copiar';
  compartirVisibilidad: 'publico' | 'privado' = 'publico';

  compartirInforme(tipo: string, id: string) {
    const base = window.location.origin;
    const token = Math.random().toString(36).substring(2, 10);
    this.enlaceCompartir = `${base}/informe-publico/${tipo}/${id}?token=${token}&acceso=${this.compartirVisibilidad}`;
    this.enlaceCopiadoMsg = 'Copiar';
    this.compartirVisibilidad = 'publico';
    this.mostrarModalCompartir = true;
  }

  onShareRequest(event: { instrumentId: string; instrumentType: string; instrumentName: string; brandColor: string; brandName: string }) {
    // Map instrumentType to the correct tipo for the URL
    const tipoMap: Record<string, string> = {
      'test': 'test', 'survey': 'encuesta', 'battery': 'bateria',
      'simulator': 'caso', 'bitacora': 'bitacora', 'entrenamiento': 'entrenamiento'
    };
    const tipo = tipoMap[event.instrumentType] || event.instrumentType;
    this.compartirInforme(tipo, event.instrumentId);
  }

  copiarEnlace() {
    navigator.clipboard.writeText(this.enlaceCompartir).then(() => {
      this.enlaceCopiadoMsg = '✓ Copiado';
      setTimeout(() => {
        this.cerrarModalCompartir();
      }, 800);
    });
  }

  cerrarModalCompartir() {
    this.mostrarModalCompartir = false;
  }

  getTestMinScore(): number {
    if (!this.selectedTestObj || this.selectedTestObj.candidatosRendimiento.length === 0) return 0;
    return Math.min(...this.selectedTestObj.candidatosRendimiento);
  }

  getTestMaxScore(): number {
    if (!this.selectedTestObj || this.selectedTestObj.candidatosRendimiento.length === 0) return 0;
    return Math.max(...this.selectedTestObj.candidatosRendimiento);
  }

  // ── Export Handler ──

  async handleExport(event: ExportClickEvent): Promise<void> {
    this.exportLoading = true;

    try {
      // Construir datasets desde la data actual
      const datasets: ExportDataSet[] = this.buildExportDatasets();

      const exportOpts = {
        title: 'Informe Análisis de Datos — Testea',
        subtitle: `Tab: ${this.activeAnalyticsTab} | Vista: ${this.modoVista}`,
        watermark: 'Testea — Plataforma de Evaluación',
        fileName: `Testea_Analytics_${this.activeAnalyticsTab}`
      };

      switch (event.format) {
        case 'csv':
          if (datasets.length > 0) {
            this.exportService.exportCSV(datasets[0], exportOpts);
          }
          break;

        case 'excel':
          await this.exportService.exportExcel(datasets, exportOpts);
          break;

        case 'pdf':
          await this.exportService.exportPDF(datasets, exportOpts);
          break;

        case 'png':
          const chartArea = document.querySelector('.main-content-area') as HTMLElement;
          if (chartArea) {
            await this.exportService.exportPNG({
              elementRef: chartArea,
              fileName: `Testea_Grafica_${this.activeAnalyticsTab}`,
              backgroundColor: '#f8fafc'
            });
          }
          break;

        case 'full-report':
          const chartCards = Array.from(
            document.querySelectorAll('.chart-card, app-divergent-bar, app-sankey-chart, app-calendar-heatmap, app-radar-multicapa, app-waterfall-chart, app-quadrant-scatter, app-sentiment-timeline')
          ) as HTMLElement[];
          await this.exportService.exportFullReport(datasets, chartCards, exportOpts);
          break;
      }
    } catch (err) {
      console.error('[Analytics] Error durante exportación:', err);
    } finally {
      this.exportLoading = false;
    }
  }

  private buildExportDatasets(): ExportDataSet[] {
    const datasets: ExportDataSet[] = [];

    // 1. Tests disponibles con sus métricas
    if (this.baseTests && this.baseTests.length > 0) {
      datasets.push({
        title: 'Tests — Rendimiento por Prueba',
        columns: [
          { key: 'nombre', header: 'Test', width: 25 },
          { key: 'evaluados', header: 'Evaluados', format: 'number' },
          { key: 'promedio', header: 'Promedio', format: 'number' },
          { key: 'min', header: 'Mínimo', format: 'number' },
          { key: 'max', header: 'Máximo', format: 'number' }
        ],
        rows: this.baseTests.map((t: MockTest) => ({
          nombre: t.nombre,
          evaluados: t.totalEvaluados,
          promedio: t.promedio,
          min: t.candidatosRendimiento.length > 0 ? Math.min(...t.candidatosRendimiento) : 0,
          max: t.candidatosRendimiento.length > 0 ? Math.max(...t.candidatosRendimiento) : 0
        }))
      });
    }

    // 2. Usuarios con sus resultados
    if (this.baseUsers && this.baseUsers.length > 0) {
      const userRows: Record<string, any>[] = [];
      this.baseUsers.forEach((u: MockUser) => {
        u.resultados.forEach(r => {
          userRows.push({
            usuario: u.nombre,
            rol: u.rol,
            test: r.testNombre,
            puntaje: r.puntajeGlobal,
            fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '–'
          });
        });
      });

      if (userRows.length > 0) {
        datasets.push({
          title: 'Resultados por Usuario',
          columns: [
            { key: 'usuario', header: 'Usuario', width: 20 },
            { key: 'rol', header: 'Rol', width: 15 },
            { key: 'test', header: 'Prueba', width: 20 },
            { key: 'puntaje', header: 'Puntaje', format: 'number' },
            { key: 'fecha', header: 'Fecha', format: 'date' }
          ],
          rows: userRows
        });
      }
    }

    // 3. Si no hay datos específicos, al menos exportar resumen KPI
    if (datasets.length === 0) {
      datasets.push({
        title: 'Resumen Analytics',
        columns: [
          { key: 'metrica', header: 'Métrica', width: 25 },
          { key: 'valor', header: 'Valor' }
        ],
        rows: [
          { metrica: 'Total Evaluados', valor: this.kpiTotalEvaluados },
          { metrica: 'Promedio General', valor: this.kpiPromedioGeneral },
          { metrica: 'Tasa Finalización', valor: this.kpiTasaFinalizacion },
          { metrica: 'Tab Activa', valor: this.activeAnalyticsTab },
          { metrica: 'Fecha Export', valor: new Date().toLocaleString('es-ES') }
        ]
      });
    }

    return datasets;
  }
}
