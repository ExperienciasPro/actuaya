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
  const today = new Date();
  return [
    {
      id: 'eq-001',
      nombre: 'Aire Acondicionado — Oficina Principal',
      marca: 'Daikin',
      modelo: 'FTXF35A',
      serial: 'DAI-2024-001',
      icon: '❄️',
      ubicacion: 'Oficina 301, Piso 3',
      tipoMantenimiento: 'Preventivo',
      frecuencia: 'Cada 3 meses',
      ultimoMantenimiento: new Date(today.getFullYear(), today.getMonth() - 4, 15).toISOString(),
      proximoMantenimiento: new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString(),
      statusCode: 'vencido',
      statusLabel: '⚠️ Vencido',
    },
    {
      id: 'eq-002',
      nombre: 'Planta Eléctrica',
      marca: 'Caterpillar',
      modelo: 'C15 ACERT',
      serial: 'CAT-2023-045',
      icon: '⚡',
      ubicacion: 'Cuarto de máquinas, Sótano 1',
      tipoMantenimiento: 'Preventivo + Correctivo',
      frecuencia: 'Cada 6 meses',
      ultimoMantenimiento: new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString(),
      proximoMantenimiento: new Date(today.getFullYear(), today.getMonth() + 0, 20).toISOString(),
      statusCode: 'proximo',
      statusLabel: '⏳ Próximo',
    },
    {
      id: 'eq-003',
      nombre: 'Ascensor — Torre A',
      marca: 'Otis',
      modelo: 'Gen2 Comfort',
      serial: 'OTS-2022-112',
      icon: '🛗',
      ubicacion: 'Torre A, 10 pisos',
      tipoMantenimiento: 'Preventivo',
      frecuencia: 'Mensual',
      ultimoMantenimiento: new Date(today.getFullYear(), today.getMonth(), 2).toISOString(),
      proximoMantenimiento: new Date(today.getFullYear(), today.getMonth() + 1, 2).toISOString(),
      statusCode: 'vigente',
      statusLabel: '✅ Al día',
    },
    {
      id: 'eq-004',
      nombre: 'Sistema Contra Incendios',
      marca: 'Siemens',
      modelo: 'Cerberus PRO',
      serial: 'SIE-2023-088',
      icon: '🧯',
      ubicacion: 'Todos los pisos',
      tipoMantenimiento: 'Inspección + Certificación',
      frecuencia: 'Anual',
      ultimoMantenimiento: new Date(today.getFullYear() - 1, 2, 10).toISOString(),
      proximoMantenimiento: new Date(today.getFullYear(), 2, 10).toISOString(),
      statusCode: 'vencido',
      statusLabel: '⚠️ Vencido',
    },
    {
      id: 'eq-005',
      nombre: 'Bomba Hidráulica — Tanque Superior',
      marca: 'Grundfos',
      modelo: 'CR 32-2',
      serial: 'GRF-2024-019',
      icon: '💧',
      ubicacion: 'Azotea, cuarto de bombas',
      tipoMantenimiento: 'Predictivo',
      frecuencia: 'Cada 4 meses',
      ultimoMantenimiento: new Date(today.getFullYear(), today.getMonth() - 1, 20).toISOString(),
      proximoMantenimiento: new Date(today.getFullYear(), today.getMonth() + 3, 20).toISOString(),
      statusCode: 'vigente',
      statusLabel: '✅ Al día',
    },
  ];
}

function getMockDocs(): ClienteDocumento[] {
  return [
    // Documentos de Técnicos
    {
      id: 'doc-t1',
      nombre: 'Planilla de Seguridad Social',
      descripcion: 'Último período vigente',
      icon: '🛡️',
      fileType: 'pdf',
      categoria: 'tecnico',
    },
    {
      id: 'doc-t2',
      nombre: 'ARL — Riesgos Profesionales',
      descripcion: 'Certificado de cobertura ARL vigente',
      icon: '⚕️',
      fileType: 'pdf',
      categoria: 'tecnico',
    },
    {
      id: 'doc-t3',
      nombre: 'Certificaciones Técnicas',
      descripcion: 'Certificados de competencia laboral',
      icon: '🎓',
      fileType: 'pdf',
      categoria: 'tecnico',
    },
    {
      id: 'doc-t4',
      nombre: 'Carné de Alturas',
      descripcion: 'Habilitación vigente para trabajo en alturas',
      icon: '🪜',
      fileType: 'img',
      categoria: 'tecnico',
    },
    // Documentos de Servicio
    {
      id: 'doc-s1',
      nombre: 'Protocolo de Mantenimiento',
      descripcion: 'Procedimiento estándar de intervención',
      icon: '📘',
      fileType: 'pdf',
      categoria: 'servicio',
    },
    {
      id: 'doc-s2',
      nombre: 'Matriz de Riesgos HSEQ',
      descripcion: 'Identificación de peligros y controles',
      icon: '⚠️',
      fileType: 'xls',
      categoria: 'servicio',
    },
    {
      id: 'doc-s3',
      nombre: 'Póliza de Responsabilidad Civil',
      descripcion: 'Cobertura de daños a terceros',
      icon: '📜',
      fileType: 'pdf',
      categoria: 'servicio',
    },
  ];
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
