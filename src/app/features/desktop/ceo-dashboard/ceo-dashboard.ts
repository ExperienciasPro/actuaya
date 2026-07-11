import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { WorkOrderService } from '../../../core/services/work-order.service';
import {
  WorkOrder,
  OT_STATUS_LABELS,
  OT_STATUS_COLORS,
  OT_PRIORITY_COLORS,
  OtPriority,
} from '../../../core/models/work-order.model';

// Leaflet types — loaded dynamically
declare const L: any;

@Component({
  selector: 'um-ceo-dashboard',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './ceo-dashboard.html',
  styleUrl: './ceo-dashboard.scss',
})
export class CeoDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  otSvc = inject(WorkOrderService);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ─── Timer ───
  private timerInterval: any;
  now = signal(Date.now());

  // ─── Map ───
  private map: any = null;
  mapReady = signal(false);

  // ─── SLA Config (hours) ───
  readonly SLA_LIMIT_HOURS = 2;

  // ─── Computed ───

  /** All orders from service */
  orders = computed(() => this.otSvc.orders());

  /** Orders currently in the field */
  fieldOrders = computed(() =>
    this.orders().filter(o => o.status === 'en_camino' || o.status === 'en_ejecucion')
  );

  /** Orders being executed (for live cost) */
  executingOrders = computed(() =>
    this.orders().filter(o => o.status === 'en_ejecucion' || o.status === 'en_pausa')
  );

  /** Critical orders for SLA monitor */
  criticalOrders = computed(() =>
    this.orders().filter(o => o.priority === 'critica')
  );

  /** SLA violations */
  slaViolations = computed(() => {
    return this.criticalOrders().filter(o => {
      const delta = this.getSlaResponseHours(o);
      return delta !== null && delta > this.SLA_LIMIT_HOURS;
    });
  });

  /** SLA compliant */
  slaCompliant = computed(() => {
    return this.criticalOrders().filter(o => {
      const delta = this.getSlaResponseHours(o);
      return delta !== null && delta <= this.SLA_LIMIT_HOURS;
    });
  });

  /** SLA pending (not yet en_camino) */
  slaPending = computed(() => {
    return this.criticalOrders().filter(o => {
      return !o.transitioned_to_en_camino_at && ['abierta', 'asignada'].includes(o.status);
    });
  });

  /** Total live operational cost (all executing OTs) */
  totalLiveCost = computed(() => {
    const _ = this.now(); // Trigger reactivity
    return this.executingOrders().reduce((sum, o) => sum + this.getLiveCost(o), 0);
  });

  /** Total parts cost across all active OTs */
  totalPartsCost = computed(() =>
    this.fieldOrders().reduce((sum, o) => sum + (o.parts_cost || 0), 0)
  );

  /** KPI summary */
  kpis = computed(() => {
    const all = this.orders();
    return {
      total: all.length,
      active: this.fieldOrders().length,
      executing: this.executingOrders().length,
      paused: all.filter(o => o.status === 'en_pausa').length,
      completed: all.filter(o => o.status === 'completada').length,
      closed: all.filter(o => o.status === 'cerrada').length,
      pending: all.filter(o => o.status === 'abierta' || o.status === 'asignada').length,
    };
  });

  /** SLA compliance rate */
  slaRate = computed(() => {
    const total = this.criticalOrders().length;
    if (!total) return 100;
    return Math.round((this.slaCompliant().length / total) * 100);
  });

  // ─── Lifecycle ───

  ngOnInit(): void {
    // Update clock every second for live costs
    this.timerInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);

    // Fetch fresh data
    this.otSvc.fetchOrders();

    // Load admin docs & WhatsApp config
    this.loadAdminDocs();
    this.loadWhatsAppConfig();
  }

  ngAfterViewInit(): void {
    this.loadLeaflet();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.map) this.map.remove();
  }

  // ─── Live Cost Calculation ───

  getLiveCost(ot: WorkOrder): number {
    const hourlyRate = ot.tech_hourly_rate || 0;
    const partsCost = ot.parts_cost || 0;
    const executionStart = ot.execution_started_at;

    if (!executionStart) return partsCost;

    const hoursElapsed = (this.now() - new Date(executionStart).getTime()) / 3_600_000;
    const laborCost = hoursElapsed * hourlyRate;

    return laborCost + partsCost;
  }

  getElapsedHours(ot: WorkOrder): number {
    const start = ot.execution_started_at;
    if (!start) return 0;
    return (this.now() - new Date(start).getTime()) / 3_600_000;
  }

  // ─── SLA Calculation ───

  getSlaResponseHours(ot: WorkOrder): number | null {
    if (!ot.transitioned_to_en_camino_at) {
      // Still pending — calculate from creation to now
      if (['abierta', 'asignada'].includes(ot.status)) {
        return (this.now() - new Date(ot.created_at).getTime()) / 3_600_000;
      }
      return null;
    }
    return (new Date(ot.transitioned_to_en_camino_at).getTime() - new Date(ot.created_at).getTime()) / 3_600_000;
  }

  getSlaStatus(ot: WorkOrder): 'ok' | 'warning' | 'violation' | 'pending' {
    const delta = this.getSlaResponseHours(ot);
    if (delta === null) return 'pending';
    if (delta <= this.SLA_LIMIT_HOURS * 0.75) return 'ok';
    if (delta <= this.SLA_LIMIT_HOURS) return 'warning';
    return 'violation';
  }

  // ─── Map (Leaflet CDN) ───

  private loadLeaflet(): void {
    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load JS
    if (typeof L !== 'undefined') {
      this.initMap();
      return;
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => this.initMap();
      document.head.appendChild(script);
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    if (this.map) this.map.remove();

    // Center on Colombia
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView([5.5, -74.5], 6);

    // Dark-style tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(this.map);

    this.mapReady.set(true);
    this.updateMapPins();
  }

  updateMapPins(): void {
    if (!this.map || typeof L === 'undefined') return;

    const orders = this.fieldOrders();

    for (const ot of orders) {
      if (!ot.latitude || !ot.longitude) continue;

      const isEnCamino = ot.status === 'en_camino';
      const color = isEnCamino ? '#f39c12' : '#00d592';
      const icon = isEnCamino ? '🚗' : '🔧';

      const markerIcon = L.divIcon({
        className: 'ot-map-pin',
        html: `<div style="
          background: ${color};
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          border: 3px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        ">${icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([ot.latitude, ot.longitude], { icon: markerIcon }).addTo(this.map);

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: 'Inter', sans-serif;">
          <strong style="font-size: 14px;">${ot.title}</strong><br/>
          <span style="font-size: 12px; color: #888;">📍 ${ot.location_name || ''}</span><br/>
          <span style="font-size: 12px;">👤 ${ot.tech_name || 'Sin asignar'}</span><br/>
          <span style="font-size: 12px; color: ${color}; font-weight: 700;">
            ${OT_STATUS_LABELS[ot.status]}
          </span>
          ${ot.parts_cost ? `<br/><span style="font-size: 12px;">💰 Repuestos: $${ot.parts_cost.toLocaleString('es-CO')}</span>` : ''}
        </div>
      `);
    }

    // Fit bounds if we have markers
    if (orders.length > 0) {
      const coords = orders
        .filter(o => o.latitude && o.longitude)
        .map(o => [o.latitude!, o.longitude!]);
      if (coords.length > 1) {
        this.map.fitBounds(coords, { padding: [30, 30] });
      }
    }
  }

  // ─── Formatters ───

  formatCOP(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getStatusLabel(status: string): string {
    return OT_STATUS_LABELS[status as keyof typeof OT_STATUS_LABELS] || status;
  }

  getStatusColor(status: string): string {
    return OT_STATUS_COLORS[status as keyof typeof OT_STATUS_COLORS] || '#999';
  }

  getPriorityColor(priority: string): string {
    return OT_PRIORITY_COLORS[priority as OtPriority] || '#999';
  }

  // ═══════════════════════════════════════════
  // Document Management (synced to Soy Cliente)
  // ═══════════════════════════════════════════

  private readonly DOCS_KEY = 'um_admin_docs_tecnicos';
  private readonly WA_KEY = 'um_admin_whatsapp';

  showAddDocModal = signal(false);
  adminDocs = signal<{ id: string; nombre: string; descripcion: string; icon: string; fileType: string; categoria: string }[]>([]);

  // Form
  newDocName = signal('');
  newDocDesc = signal('');
  newDocCat = signal('tecnico');
  newDocIcon = signal('🛡️');
  docIcons = ['🛡️', '⚕️', '🎓', '🪜', '📘', '⚠️', '📜', '🔧', '📋', '🏗️', '🧯', '💼'];

  // WhatsApp
  waEmpresa = signal('');
  waNumber = signal('');
  waSaved = signal(false);

  private loadAdminDocs(): void {
    try {
      const raw = localStorage.getItem(this.DOCS_KEY);
      if (raw) {
        this.adminDocs.set(JSON.parse(raw));
      }
    } catch {}
  }

  private saveAdminDocs(): void {
    localStorage.setItem(this.DOCS_KEY, JSON.stringify(this.adminDocs()));
  }

  private loadWhatsAppConfig(): void {
    try {
      const raw = localStorage.getItem(this.WA_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        this.waEmpresa.set(cfg.empresa || '');
        this.waNumber.set(cfg.number || '');
      }
    } catch {}
  }

  addDoc(): void {
    const name = this.newDocName().trim();
    if (!name) return;

    const doc = {
      id: `doc-${Date.now()}`,
      nombre: name,
      descripcion: this.newDocDesc().trim() || '',
      icon: this.newDocIcon(),
      fileType: 'pdf',
      categoria: this.newDocCat(),
    };

    this.adminDocs.update(docs => [...docs, doc]);
    this.saveAdminDocs();
    this.newDocName.set('');
    this.newDocDesc.set('');
    this.newDocCat.set('tecnico');
    this.newDocIcon.set('🛡️');
    this.showAddDocModal.set(false);
  }

  removeDoc(id: string): void {
    this.adminDocs.update(docs => docs.filter(d => d.id !== id));
    this.saveAdminDocs();
  }

  onWaEmpresaChange(e: Event): void {
    this.waEmpresa.set((e.target as HTMLInputElement).value);
  }

  onWaNumberChange(e: Event): void {
    this.waNumber.set((e.target as HTMLInputElement).value);
  }

  saveWhatsAppConfig(): void {
    localStorage.setItem(this.WA_KEY, JSON.stringify({
      empresa: this.waEmpresa(),
      number: this.waNumber(),
    }));
    this.waSaved.set(true);
    setTimeout(() => this.waSaved.set(false), 3000);
  }

  getInputVal(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
}
