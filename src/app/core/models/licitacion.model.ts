// ═══════════════════════════════════════════
// ActuaYa — Modelo de Licitaciones
// ═══════════════════════════════════════════

export interface Licitacion {
  id: string;
  titulo: string;
  entidad: string;           // Entidad contratante
  descripcion: string;
  presupuesto: string;       // Monto estimado (texto formateado)
  fechaCierre: string;       // Fecha límite YYYY-MM-DD
  ubicacion: string;         // Ciudad/Departamento
  sector: string;            // Construcción, Consultoría, TI, etc.
  fuente: string;            // URL de la fuente
  relevancia: 'alta' | 'media' | 'baja';
  estado: 'nueva' | 'revisada' | 'aplicada' | 'descartada';
  notas?: string;
}

export interface LicitacionBatch {
  id: string;
  fechaBusqueda: string;     // ISO date de cuándo se realizó la búsqueda
  semana: string;            // Ej: "Semana 12 - 2026"
  query: string;             // Prompt/query usado en Gemini
  resultados: Licitacion[];
  totalResultados: number;
}

export const SECTORES_LICITACION = [
  'Construcción',
  'Consultoría',
  'Tecnología',
  'Infraestructura',
  'Servicios',
  'Suministros',
  'Obra civil',
  'Diseño',
  'Interventoría',
  'Cooperación Internacional',
  'Becas y Premios',
  'Otros',
] as const;

export const RELEVANCIA_COLORS: Record<string, string> = {
  alta: '#e84393',
  media: '#6c5ce7',
  baja: '#00cec9',
};
