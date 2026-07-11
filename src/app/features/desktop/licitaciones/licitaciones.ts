import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { LicitacionesService } from '../../../core/services/licitaciones.service';
import {
  Licitacion, LicitacionBatch, RELEVANCIA_COLORS,
} from '../../../core/models/licitacion.model';

@Component({
  selector: 'um-licitaciones',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  template: `
    <div class="admin-page licitaciones-page">
      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div>
          <h1>📋 Licitaciones</h1>
          <p class="subtitle">Resultados semanales de búsqueda inteligente · Gemini + n8n</p>
        </div>
        <div class="header-actions">
          <button class="btn-config" (click)="showConfig.set(!showConfig())">
            ⚙️ Configurar
          </button>
          <button class="btn-import" (click)="showImport.set(!showImport())">
            📥 Importar JSON
          </button>
          <button class="btn-fetch" (click)="syncFromServer()" [disabled]="syncing()">
            {{ syncing() ? '⏳ Sincronizando...' : '🔄 Sincronizar servidor' }}
          </button>
          <div class="search-input-wrapper">
            <input type="text" class="form-input search-query" [(ngModel)]="searchQuery"
              placeholder="Ej: Licitaciones tecnología Bogotá..." />
            <button class="btn-fetch" (click)="fetchFromWebhook()" [disabled]="fetching() || !searchQuery()">
              {{ fetching() ? '⏳ Buscando...' : '🤖 Buscar con Gemini' }}
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-row animate-fadeInUp stagger-1">
        <div class="kpi-card purple">
          <span class="kpi-value">{{ svc.batches().length }}</span>
          <span class="kpi-label">Búsquedas</span>
        </div>
        <div class="kpi-card blue">
          <span class="kpi-value">{{ svc.totalActivas() }}</span>
          <span class="kpi-label">Activas</span>
        </div>
        <div class="kpi-card pink">
          <span class="kpi-value">{{ svc.altaRelevancia().length }}</span>
          <span class="kpi-label">Alta Relevancia</span>
        </div>
        <div class="kpi-card teal">
          <span class="kpi-value">{{ svc.porSector().size }}</span>
          <span class="kpi-label">Sectores</span>
        </div>
      </div>

      <!-- Config Panel -->
      @if (showConfig()) {
        <div class="config-panel animate-fadeInUp">
          <h3>⚙️ Configuración del Webhook</h3>
          <p class="config-hint">Pega la URL del webhook de n8n para buscar manualmente con Gemini.</p>
          <div class="config-row">
            <input type="url" class="form-input" [(ngModel)]="webhookUrl"
              placeholder="https://tu-n8n.com/webhook/licitaciones" />
            <button class="btn-save" (click)="saveWebhook()">Guardar</button>
          </div>
          <p class="config-hint" style="margin-top:12px; font-size:0.85rem; opacity:0.7;">
            💡 <strong>Modo automático activo:</strong> n8n envía resultados cada lunes a las 8am directamente al servidor.
            Usa "🔄 Sincronizar servidor" para traer los datos más recientes.
          </p>
          @if (configMsg()) {
            <span class="config-msg">{{ configMsg() }}</span>
          }
        </div>
      }

      <!-- Import Panel -->
      @if (showImport()) {
        <div class="config-panel animate-fadeInUp">
          <h3>📥 Importar Resultados JSON</h3>
          <p class="config-hint">Pega el JSON de resultados de Gemini/n8n:</p>
          <textarea class="json-input" rows="6" [(ngModel)]="importJson"
            placeholder='[{"titulo": "...", "entidad": "...", ...}]'></textarea>
          <div class="import-actions">
            <button class="btn-save" (click)="doImport()">Importar</button>
            <button class="btn-demo" (click)="loadDemo()">🎲 Cargar demo</button>
          </div>
          @if (importMsg()) {
            <span class="config-msg" [class.error]="importError()">{{ importMsg() }}</span>
          }
        </div>
      }

      <!-- Status message -->
      @if (statusMsg()) {
        <div class="status-bar animate-fadeInUp" [class.error]="statusError()">
          {{ statusMsg() }}
        </div>
      }

      <!-- Filters -->
      @if (svc.batches().length) {
        <div class="filter-row animate-fadeInUp stagger-2">
          <select class="filter-select" [(ngModel)]="filterBatch">
            <option value="all">Todas las semanas</option>
            @for (b of svc.batches(); track b.id) {
              <option [value]="b.id">{{ b.semana }} ({{ b.totalResultados }})</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="filterRelevancia">
            <option value="all">Todas las relevancias</option>
            <option value="alta">🔴 Alta</option>
            <option value="media">🟣 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
          <select class="filter-select" [(ngModel)]="filterEstado">
            <option value="all">Todos los estados</option>
            <option value="nueva">🆕 Nuevas</option>
            <option value="revisada">👀 Revisadas</option>
            <option value="aplicada">✅ Aplicadas</option>
            <option value="descartada">❌ Descartadas</option>
          </select>
        </div>
      }

      <!-- Results -->
      @if (filteredResults().length) {
        <div class="results-grid animate-fadeInUp stagger-3">
          @for (item of filteredResults(); track item.lic.id) {
            <div class="lic-card" [class]="'rel-' + item.lic.relevancia">
              <div class="lic-header">
                <span class="lic-relevancia" [style.background]="getRelevanciaColor(item.lic.relevancia)">
                  {{ item.lic.relevancia | uppercase }}
                </span>
                <span class="lic-sector">{{ item.lic.sector }}</span>
              </div>
              <h4 class="lic-titulo">{{ item.lic.titulo }}</h4>
              <p class="lic-entidad">🏛️ {{ item.lic.entidad }}</p>
              <p class="lic-desc">{{ item.lic.descripcion }}</p>

              <div class="lic-meta">
                @if (item.lic.presupuesto) {
                  <span class="meta-item">💰 {{ item.lic.presupuesto }}</span>
                }
                @if (item.lic.fechaCierre) {
                  <span class="meta-item">📅 Cierre: {{ item.lic.fechaCierre }}</span>
                }
                @if (item.lic.ubicacion) {
                  <span class="meta-item">📍 {{ item.lic.ubicacion }}</span>
                }
              </div>

              <div class="lic-actions">
                <select class="estado-select" [ngModel]="item.lic.estado"
                  (ngModelChange)="cambiarEstado(item.batchId, item.lic.id, $event)">
                  <option value="nueva">🆕 Nueva</option>
                  <option value="revisada">👀 Revisada</option>
                  <option value="aplicada">✅ Aplicada</option>
                  <option value="descartada">❌ Descartada</option>
                </select>
                @if (item.lic.fuente) {
                  <a class="btn-link" [href]="item.lic.fuente" target="_blank" rel="noopener">
                    🔗 Ver fuente
                  </a>
                }
              </div>
            </div>
          }
        </div>
      } @else if (svc.batches().length) {
        <div class="empty animate-fadeInUp stagger-3">
          Sin resultados para los filtros seleccionados.
        </div>
      } @else {
        <div class="empty-state animate-fadeInUp stagger-2">
          <div class="empty-icon">📋</div>
          <h3>Sin licitaciones aún</h3>
          <p>Tu búsqueda automática con Gemini se ejecuta cada lunes a las 8am. También puedes sincronizar manualmente o importar datos.</p>
          <div class="empty-actions">
            <button class="btn-import" (click)="syncFromServer()">🔄 Sincronizar servidor</button>
            <button class="btn-import" (click)="showConfig.set(true)">⚙️ Configurar webhook</button>
            <button class="btn-demo" (click)="showImport.set(true); loadDemo()">🎲 Cargar datos demo</button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'licitaciones.scss',
})
export class LicitacionesComponent {
  svc = inject(LicitacionesService);

  showConfig = signal(false);
  showImport = signal(false);
  fetching = signal(false);
  syncing = signal(false);
  statusMsg = signal('');
  statusError = signal(false);
  configMsg = signal('');
  importMsg = signal('');
  importError = signal(false);

  webhookUrl = this.svc.getWebhookUrl();
  searchQuery = signal('');
  importJson = '';
  filterBatch = 'all';
  filterRelevancia = 'all';
  filterEstado = 'all';

  constructor() {
    // Auto-sync from backend on module open
    this.syncFromServer(true);
  }

  async syncFromServer(silent = false): Promise<void> {
    this.syncing.set(true);
    if (!silent) this.statusMsg.set('');
    const result = await this.svc.syncFromBackend();
    if (!silent || result.success) {
      this.statusMsg.set(result.message);
      this.statusError.set(!result.success);
      setTimeout(() => this.statusMsg.set(''), 5000);
    }
    this.syncing.set(false);
  }

  filteredResults = computed(() => {
    let items: { batchId: string; lic: Licitacion }[] = [];

    const batches = this.filterBatch === 'all'
      ? this.svc.batches()
      : this.svc.batches().filter(b => b.id === this.filterBatch);

    for (const batch of batches) {
      for (const lic of batch.resultados) {
        items.push({ batchId: batch.id, lic });
      }
    }

    if (this.filterRelevancia !== 'all') {
      items = items.filter(i => i.lic.relevancia === this.filterRelevancia);
    }
    if (this.filterEstado !== 'all') {
      items = items.filter(i => i.lic.estado === this.filterEstado);
    }

    return items;
  });

  getRelevanciaColor(rel: string): string {
    return RELEVANCIA_COLORS[rel] || '#888';
  }

  saveWebhook(): void {
    this.svc.setWebhookUrl(this.webhookUrl);
    this.configMsg.set('✅ Webhook guardado');
    setTimeout(() => this.configMsg.set(''), 3000);
  }

  async fetchFromWebhook(): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) return;

    this.fetching.set(true);
    this.statusMsg.set('Enviando búsqueda a n8n...');
    const result = await this.svc.fetchFromWebhook(query);
    this.statusMsg.set(result.message);
    this.statusError.set(!result.success);
    this.fetching.set(false);
    if (result.success) {
      this.searchQuery.set('');
    }
    setTimeout(() => this.statusMsg.set(''), 5000);
  }

  doImport(): void {
    if (!this.importJson.trim()) return;
    const result = this.svc.importFromJson(this.importJson);
    this.importMsg.set(result.message);
    this.importError.set(!result.success);
    if (result.success) {
      this.importJson = '';
      setTimeout(() => { this.showImport.set(false); this.importMsg.set(''); }, 2000);
    }
  }

  cambiarEstado(batchId: string, licId: string, estado: Licitacion['estado']): void {
    this.svc.updateEstado(batchId, licId, estado);
  }

  loadDemo(): void {
    const demo = JSON.stringify({
      semana: 'Semana Demo - 2026',
      query: 'Licitaciones construcción Colombia marzo 2026',
      resultados: [
        {
          titulo: 'Construcción de vía terciaria municipio de Rionegro',
          entidad: 'Gobernación de Antioquia',
          descripcion: 'Mejoramiento y pavimentación de 12.5 km de vía terciaria que conecta la vereda La Ceja con el casco urbano.',
          presupuesto: '$2.800.000.000 COP',
          fechaCierre: '2026-04-15',
          ubicacion: 'Rionegro, Antioquia',
          sector: 'Infraestructura',
          fuente: 'https://www.colombiacompra.gov.co',
          relevancia: 'alta',
        },
        {
          titulo: 'Consultoría diseño arquitectónico sede administrativa',
          entidad: 'Alcaldía de Medellín',
          descripcion: 'Elaboración de estudios y diseños para nueva sede administrativa con enfoque sostenible y certificación LEED.',
          presupuesto: '$450.000.000 COP',
          fechaCierre: '2026-04-08',
          ubicacion: 'Medellín, Antioquia',
          sector: 'Consultoría',
          fuente: 'https://www.colombiacompra.gov.co',
          relevancia: 'alta',
        },
        {
          titulo: 'Suministro de equipos de cómputo para instituciones educativas',
          entidad: 'Ministerio de Educación',
          descripcion: 'Adquisición de 500 equipos portátiles para dotación de colegios oficiales en zona rural.',
          presupuesto: '$1.200.000.000 COP',
          fechaCierre: '2026-04-20',
          ubicacion: 'Nacional',
          sector: 'Tecnología',
          fuente: 'https://www.colombiacompra.gov.co',
          relevancia: 'media',
        },
        {
          titulo: 'Interventoría obra de acueducto veredal',
          entidad: 'Empresa de Servicios Públicos de Bogotá',
          descripcion: 'Interventoría técnica, administrativa y financiera para la construcción del sistema de acueducto veredal.',
          presupuesto: '$380.000.000 COP',
          fechaCierre: '2026-04-12',
          ubicacion: 'Bogotá D.C.',
          sector: 'Interventoría',
          fuente: 'https://www.colombiacompra.gov.co',
          relevancia: 'media',
        },
        {
          titulo: 'Mantenimiento preventivo red eléctrica zona industrial',
          entidad: 'EPM',
          descripcion: 'Contrato de mantenimiento preventivo y correctivo de red eléctrica de media tensión en zona industrial sur.',
          presupuesto: '$180.000.000 COP',
          fechaCierre: '2026-05-01',
          ubicacion: 'Envigado, Antioquia',
          sector: 'Servicios',
          fuente: 'https://www.colombiacompra.gov.co',
          relevancia: 'baja',
        },
      ],
    }, null, 2);

    this.importJson = demo;
    this.showImport.set(true);
  }
}
