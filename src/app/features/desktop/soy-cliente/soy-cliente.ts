import {
  Component,
  signal,
  computed,
  OnInit,
} from '@angular/core';

// ═══════════════════════════════════════════
// Soy Cliente — Portal de Equipos y Mantenimientos
// ═══════════════════════════════════════════

// ─── Data Models ───

export interface ClienteEquipo {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  serial: string;
  icon: string;
  ubicacion: string;
  tipoMantenimiento: string;
  frecuencia: string;
  ultimoMantenimiento: string;
  proximoMantenimiento: string;
  statusCode: 'vigente' | 'proximo' | 'vencido';
  statusLabel: string;
}

export interface ClienteAlerta {
  id: string;
  icon: string;
  titulo: string;
  mensaje: string;
  tipo: 'vencido' | 'proximo' | 'info';
  equipoNombre?: string;
  fecha: string;
}

export interface ClienteDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  icon: string;
  fileType: 'pdf' | 'xls' | 'img' | 'generic';
  categoria: 'tecnico' | 'servicio';
  url?: string;
}

// ─── Service (Local) ───

const STORAGE_KEY_EQUIPOS = 'um_cliente_equipos';
const STORAGE_KEY_DOCS = 'um_admin_docs_tecnicos';

function loadEquipos(): ClienteEquipo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EQUIPOS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getMockEquipos();
}

function loadDocs(): ClienteDocumento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getMockDocs();
}

function getMockEquipos(): ClienteEquipo[] {
  return [];
}

function getMockDocs(): ClienteDocumento[] {
  return [];
}

// ─── Component ───

@Component({
  selector: 'um-soy-cliente',
  standalone: true,
  imports: [],
  templateUrl: './soy-cliente.html',
  styleUrl: './soy-cliente.scss',
})
export class SoyClienteComponent implements OnInit {

  // ─── State ───
  activeTab = signal<'equipos' | 'alertas' | 'documentos'>('equipos');
  expandedEquipo = signal<string | null>(null);
  equipos = signal<ClienteEquipo[]>([]);
  allDocs = signal<ClienteDocumento[]>([]);

  // WhatsApp config — the admin provides this via Soy Administrador
  whatsappNumber = signal('573001234567');
  empresaNombre = signal('Mantenimientos XYZ');

  // ─── Computed ───
  equiposVigentes = computed(() => this.equipos().filter(e => e.statusCode === 'vigente'));
  equiposProximos = computed(() => this.equipos().filter(e => e.statusCode === 'proximo'));
  equiposVencidos = computed(() => this.equipos().filter(e => e.statusCode === 'vencido'));

  alertas = computed<ClienteAlerta[]>(() => {
    const alerts: ClienteAlerta[] = [];
    for (const eq of this.equipos()) {
      if (eq.statusCode === 'vencido') {
        alerts.push({
          id: `alert-${eq.id}-v`,
          icon: '🚨',
          titulo: `Mantenimiento VENCIDO: ${eq.nombre}`,
          mensaje: `Fecha programada: ${this.formatDate(eq.proximoMantenimiento)}. Contacta ahora para reprogramar.`,
          tipo: 'vencido',
          equipoNombre: eq.nombre,
          fecha: eq.proximoMantenimiento,
        });
      } else if (eq.statusCode === 'proximo') {
        alerts.push({
          id: `alert-${eq.id}-p`,
          icon: '⏳',
          titulo: `Próximo mantenimiento: ${eq.nombre}`,
          mensaje: `Programado para ${this.formatDate(eq.proximoMantenimiento)}. Coordina el acceso con tu equipo.`,
          tipo: 'proximo',
          equipoNombre: eq.nombre,
          fecha: eq.proximoMantenimiento,
        });
      }
    }
    // Sort: vencidos first
    alerts.sort((a, b) => {
      const order = { vencido: 0, proximo: 1, info: 2 };
      return order[a.tipo] - order[b.tipo];
    });
    return alerts;
  });

  alertCount = computed(() => this.alertas().filter(a => a.tipo === 'vencido' || a.tipo === 'proximo').length);

  docsTecnicos = computed(() => this.allDocs().filter(d => d.categoria === 'tecnico'));
  docsServicio = computed(() => this.allDocs().filter(d => d.categoria === 'servicio'));

  // ─── Lifecycle ───
  ngOnInit(): void {
    this.equipos.set(loadEquipos());
    this.allDocs.set(loadDocs());

    // Load WhatsApp number from admin settings
    try {
      const adminConfig = localStorage.getItem('um_admin_whatsapp');
      if (adminConfig) {
        const cfg = JSON.parse(adminConfig);
        if (cfg.number) this.whatsappNumber.set(cfg.number);
        if (cfg.empresa) this.empresaNombre.set(cfg.empresa);
      }
    } catch {}
  }

  // ─── Actions ───

  toggleEquipo(id: string): void {
    this.expandedEquipo.update(current => current === id ? null : id);
  }

  contactWhatsApp(equipoNombre?: string): void {
    const numero = this.whatsappNumber();
    let msg = `Hola, soy cliente de ${this.empresaNombre()}. `;

    if (equipoNombre) {
      msg += `Necesito programar mantenimiento para: *${equipoNombre}*. `;
    } else {
      msg += 'Me gustaría programar un mantenimiento. ';
    }
    msg += '¿Tienen disponibilidad?';

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  contactWhatsAppEquipo(equipo: ClienteEquipo): void {
    const numero = this.whatsappNumber();
    const statusMsg = equipo.statusCode === 'vencido'
      ? '⚠️ El mantenimiento se encuentra VENCIDO.'
      : equipo.statusCode === 'proximo'
        ? '⏳ El manteniemiento se aproxima.'
        : '';

    const msg = `Hola, soy cliente de ${this.empresaNombre()}.

Necesito programar mantenimiento para:
▪ *Equipo:* ${equipo.nombre}
▪ *Marca/Modelo:* ${equipo.marca} ${equipo.modelo}
▪ *Serial:* ${equipo.serial}
▪ *Ubicación:* ${equipo.ubicacion}
${statusMsg}

¿Cuándo tienen disponibilidad?`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  verHistorial(equipo: ClienteEquipo): void {
    // Placeholder — Can be expanded later
    alert(`Historial de mantenimientos para: ${equipo.nombre}\n\nÚltimo: ${this.formatDate(equipo.ultimoMantenimiento)}\nPróximo: ${this.formatDate(equipo.proximoMantenimiento)}`);
  }

  downloadDoc(doc: ClienteDocumento): void {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      alert(`📄 Descargando: ${doc.nombre}\n\n(Conecta con tu backend para archivos reales)`);
    }
  }

  // ─── Formatters ───

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
