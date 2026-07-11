/**
 * ActuaYa — OT Seed Script
 * 
 * Injects 15+ fake OTs with different states, times, spare part costs,
 * tech rates, priorities, and GPS coordinates across Colombia.
 * 
 * Run: node scripts/seed.js
 */

import { initDB } from '../src/db.js';
import { v4 as uuidv4 } from 'uuid';

const db = initDB();

// Clear existing data
db.clear();

// ─── Colombian GPS Coordinates ───
const LOCATIONS = [
  { lat: 4.6097,  lng: -74.0817, city: 'Bogotá — Centro' },
  { lat: 4.6486,  lng: -74.1078, city: 'Bogotá — Chapinero' },
  { lat: 4.6955,  lng: -74.0302, city: 'Bogotá — Usaquén' },
  { lat: 6.2476,  lng: -75.5658, city: 'Medellín — Poblado' },
  { lat: 6.2518,  lng: -75.5636, city: 'Medellín — Laureles' },
  { lat: 3.4516,  lng: -76.5320, city: 'Cali — San Fernando' },
  { lat: 3.3950,  lng: -76.5255, city: 'Cali — Sur' },
  { lat: 10.3910, lng: -75.5145, city: 'Cartagena — Bocagrande' },
  { lat: 10.4025, lng: -75.5140, city: 'Cartagena — Centro' },
  { lat: 7.1254,  lng: -73.1198, city: 'Bucaramanga — Cabecera' },
  { lat: 4.8133,  lng: -75.6961, city: 'Pereira — Centro' },
  { lat: 4.4389,  lng: -75.2322, city: 'Ibagué' },
  { lat: 5.5353,  lng: -73.3577, city: 'Tunja' },
  { lat: 1.2136,  lng: -77.2811, city: 'Pasto' },
  { lat: 11.2408, lng: -74.1990, city: 'Santa Marta' },
];

// ─── Technicians ───
const TECHS = [
  { id: 'tech-001', name: 'Carlos Gutiérrez', hourlyRate: 45000 },
  { id: 'tech-002', name: 'María López', hourlyRate: 52000 },
  { id: 'tech-003', name: 'Andrés Rodríguez', hourlyRate: 48000 },
  { id: 'tech-004', name: 'Laura Martínez', hourlyRate: 55000 },
  { id: 'tech-005', name: 'Diego Herrera', hourlyRate: 50000 },
];

// ─── Spare Parts Catalog ───
const PARTS = [
  { sku: 'AC-001', name: 'Capacitor 25μF 450V', cost: 45000 },
  { sku: 'AC-002', name: 'Compresor 12000 BTU', cost: 380000 },
  { sku: 'AC-003', name: 'Filtro HEPA recambio', cost: 28000 },
  { sku: 'EL-010', name: 'Cable THW #12 (metro)', cost: 3200 },
  { sku: 'EL-011', name: 'Breaker 20A', cost: 18500 },
  { sku: 'PL-020', name: 'Tubo PVC 1/2" (metro)', cost: 5600 },
  { sku: 'HV-030', name: 'Motor ventilador 1/4 HP', cost: 165000 },
  { sku: 'HV-031', name: 'Termostato digital', cost: 95000 },
  { sku: 'GE-040', name: 'Silicona industrial 280ml', cost: 8500 },
];

// ─── OT Definitions (15 total) ───

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minutesAgo(m) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

const OTS = [
  // ── Active in the field (En Camino / En Ejecución) ──
  {
    title: 'Mantenimiento A/C Oficina 302',
    description: 'Revisión y limpieza de unidad split 24000 BTU.',
    status: 'en_camino',
    priority: 'alta',
    tech: TECHS[0],
    loc: LOCATIONS[0],
    createdAt: hoursAgo(1.5),
    transitionedAt: minutesAgo(30),
    parts: [PARTS[0], PARTS[2]],
    slaTarget: 2,
  },
  {
    title: 'Reparación fuga tuberías P3',
    description: 'Fuga detectada en tubería principal del tercer piso.',
    status: 'en_ejecucion',
    priority: 'critica',
    tech: TECHS[1],
    loc: LOCATIONS[1],
    createdAt: hoursAgo(3),
    transitionedAt: hoursAgo(2.5),
    parts: [PARTS[5], PARTS[8]],
    slaTarget: 2,
  },
  {
    title: 'Instalación paneles LED Sala Conferencias',
    description: 'Reemplazo de luminarias fluorescentes por LED.',
    status: 'en_ejecucion',
    priority: 'media',
    tech: TECHS[2],
    loc: LOCATIONS[3],
    createdAt: hoursAgo(4),
    transitionedAt: hoursAgo(3),
    parts: [PARTS[3], PARTS[4]],
    slaTarget: 2,
  },
  {
    title: 'Revisión UPS Data Center',
    description: 'Mantenimiento preventivo UPS 10KVA.',
    status: 'en_camino',
    priority: 'critica',
    tech: TECHS[3],
    loc: LOCATIONS[4],
    createdAt: hoursAgo(0.5),
    transitionedAt: minutesAgo(15),
    parts: [],
    slaTarget: 2,
  },
  {
    title: 'Cambio motor extractor cocina industrial',
    description: 'Motor quemado, requiere reemplazo urgente.',
    status: 'en_ejecucion',
    priority: 'critica',
    tech: TECHS[4],
    loc: LOCATIONS[5],
    createdAt: hoursAgo(5),
    transitionedAt: hoursAgo(4),
    parts: [PARTS[6], PARTS[7]],
    slaTarget: 2,
  },
  {
    title: 'Inspección sistema contra incendios',
    description: 'Inspección anual de rociadores y alarmas.',
    status: 'en_camino',
    priority: 'alta',
    tech: TECHS[0],
    loc: LOCATIONS[7],
    createdAt: hoursAgo(1),
    transitionedAt: minutesAgo(20),
    parts: [],
    slaTarget: 2,
  },

  // ── Pending / Assigned ──
  {
    title: 'Mantenimiento ascensor Edificio Norte',
    description: 'Revisión semestral de cables y frenos.',
    status: 'asignada',
    priority: 'critica',
    tech: TECHS[1],
    loc: LOCATIONS[8],
    createdAt: hoursAgo(3.5),
    transitionedAt: null,
    parts: [],
    slaTarget: 2,
  },
  {
    title: 'Calibración sensor temperatura bodega',
    description: 'Sensor reporta lecturas erráticas.',
    status: 'asignada',
    priority: 'media',
    tech: TECHS[2],
    loc: LOCATIONS[9],
    createdAt: hoursAgo(1.2),
    transitionedAt: null,
    parts: [PARTS[7]],
    slaTarget: 2,
  },
  {
    title: 'Reparación puerta automática acceso principal',
    description: 'Motor de puerta no cierra completamente.',
    status: 'abierta',
    priority: 'baja',
    tech: null,
    loc: LOCATIONS[10],
    createdAt: hoursAgo(8),
    transitionedAt: null,
    parts: [],
    slaTarget: 2,
  },

  // ── Paused ──
  {
    title: 'Reemplazo compresor chiller zona sur',
    description: 'Esperando repuesto importado.',
    status: 'en_pausa',
    priority: 'alta',
    tech: TECHS[3],
    loc: LOCATIONS[6],
    createdAt: hoursAgo(24),
    transitionedAt: hoursAgo(20),
    parts: [PARTS[1]],
    slaTarget: 2,
  },

  // ── Completed ──
  {
    title: 'Limpieza ductos ventilación Piso 5',
    description: 'Limpieza profunda y desinfección.',
    status: 'completada',
    priority: 'media',
    tech: TECHS[4],
    loc: LOCATIONS[11],
    createdAt: hoursAgo(48),
    transitionedAt: hoursAgo(46),
    parts: [PARTS[8]],
    slaTarget: 2,
  },
  {
    title: 'Reparación circuito iluminación parking',
    description: 'Breaker disparado, cortocircuito en sector B.',
    status: 'completada',
    priority: 'alta',
    tech: TECHS[0],
    loc: LOCATIONS[12],
    createdAt: hoursAgo(36),
    transitionedAt: hoursAgo(35),
    parts: [PARTS[3], PARTS[4]],
    slaTarget: 2,
  },

  // ── Closed ──
  {
    title: 'Instalación sistema CCTV perímetro',
    description: '8 cámaras IP + NVR instalados.',
    status: 'cerrada',
    priority: 'alta',
    tech: TECHS[1],
    loc: LOCATIONS[13],
    createdAt: hoursAgo(72),
    transitionedAt: hoursAgo(70),
    parts: [PARTS[3]],
    slaTarget: 2,
  },
  {
    title: 'Mantenimiento preventivo planta eléctrica',
    description: 'Cambio aceite, filtros y prueba de carga.',
    status: 'cerrada',
    priority: 'critica',
    tech: TECHS[2],
    loc: LOCATIONS[14],
    createdAt: hoursAgo(96),
    transitionedAt: hoursAgo(94),
    parts: [PARTS[6]],
    slaTarget: 2,
  },
  {
    title: 'Reparación fachada ventanal cristal templado',
    description: 'Vidrio roto por impacto, reemplazo urgente.',
    status: 'cerrada',
    priority: 'critica',
    tech: TECHS[4],
    loc: LOCATIONS[2],
    createdAt: hoursAgo(120),
    transitionedAt: hoursAgo(118),
    parts: [],
    slaTarget: 2,
  },
];

// ─── Insert OTs ───
console.log('🌱 Seeding OT database...\n');

for (const otDef of OTS) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const partsCost = otDef.parts.reduce((sum, p) => sum + p.cost, 0);

  const ot = {
    id,
    title: otDef.title,
    description: otDef.description,
    status: otDef.status,
    assigned_to: otDef.tech?.id || null,
    justification_reason: otDef.status === 'en_pausa' ? 'Esperando repuesto importado' : null,
    created_by: 'admin-001',
    created_at: otDef.createdAt,
    updated_at: otDef.transitionedAt || otDef.createdAt,
    // ── CEO Dashboard extended fields ──
    priority: otDef.priority,
    tech_name: otDef.tech?.name || null,
    tech_hourly_rate: otDef.tech?.hourlyRate || 0,
    latitude: otDef.loc.lat,
    longitude: otDef.loc.lng,
    location_name: otDef.loc.city,
    sla_hours: otDef.slaTarget,
    parts_cost: partsCost,
    parts: otDef.parts.map(p => ({ sku: p.sku, name: p.name, cost: p.cost, qty: 1 })),
    transitioned_to_en_camino_at: otDef.transitionedAt,
    execution_started_at: ['en_ejecucion', 'en_pausa', 'completada', 'cerrada'].includes(otDef.status)
      ? otDef.transitionedAt
      : null,
  };

  db.insertWorkOrder(ot);

  // Insert initial history
  db.insertStatusHistory({
    work_order_id: id,
    from_status: null,
    to_status: 'abierta',
    changed_by: 'admin-001',
    justification_reason: null,
    timestamp: otDef.createdAt,
  });

  // Simulate transitions based on current status
  const LIFECYCLE = ['abierta', 'asignada', 'en_camino', 'en_ejecucion'];
  const statusIndex = LIFECYCLE.indexOf(otDef.status);

  if (statusIndex > 0 || ['en_pausa', 'completada', 'cerrada'].includes(otDef.status)) {
    const stepsNeeded = statusIndex > 0 ? statusIndex : LIFECYCLE.length;
    for (let i = 1; i <= stepsNeeded; i++) {
      db.insertStatusHistory({
        work_order_id: id,
        from_status: LIFECYCLE[i - 1],
        to_status: LIFECYCLE[i] || otDef.status,
        changed_by: otDef.tech?.id || 'admin-001',
        justification_reason: null,
        timestamp: new Date(new Date(otDef.createdAt).getTime() + i * 600_000).toISOString(),
      });
    }
  }

  if (otDef.status === 'en_pausa') {
    db.insertStatusHistory({
      work_order_id: id,
      from_status: 'en_ejecucion',
      to_status: 'en_pausa',
      changed_by: otDef.tech?.id || 'admin-001',
      justification_reason: 'Esperando repuesto importado',
      timestamp: otDef.transitionedAt,
    });
  }

  if (otDef.status === 'completada' || otDef.status === 'cerrada') {
    db.insertStatusHistory({
      work_order_id: id,
      from_status: 'en_ejecucion',
      to_status: 'completada',
      changed_by: otDef.tech?.id || 'admin-001',
      justification_reason: null,
      timestamp: new Date(new Date(otDef.transitionedAt).getTime() + 3600_000).toISOString(),
    });
  }

  if (otDef.status === 'cerrada') {
    db.insertStatusHistory({
      work_order_id: id,
      from_status: 'completada',
      to_status: 'cerrada',
      changed_by: 'admin-001',
      justification_reason: null,
      timestamp: new Date(new Date(otDef.transitionedAt).getTime() + 7200_000).toISOString(),
    });
  }

  const emoji = { abierta: '📋', asignada: '👤', en_camino: '🚗', en_ejecucion: '🔧', en_pausa: '⏸️', completada: '✅', cerrada: '🔒' };
  console.log(`  ${emoji[otDef.status]} [${otDef.status.padEnd(13)}] ${otDef.title}`);
  console.log(`     📍 ${otDef.loc.city} | 💰 Repuestos: $${partsCost.toLocaleString('es-CO')}`);
  if (otDef.tech) console.log(`     👤 ${otDef.tech.name} ($${otDef.tech.hourlyRate.toLocaleString('es-CO')}/h)`);
  console.log();
}

db.close();
console.log(`\n✅ ${OTS.length} OTs insertadas exitosamente.`);
console.log('📂 Data guardada en backend-ot/data/ot_data.json\n');
