// ═══════════════════════════════════════════
// ActuaYa — Modelo de Storytelling de Datos
// ═══════════════════════════════════════════

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'kpi';

export interface DataVisual {
  id: string;
  title: string;
  type: ChartType;
  dataSourceId: string;
  config: {
    xAxis: string;       // Campo para el eje X / Categoría
    yAxis: string;       // Campo para el eje Y / Valor
    aggregate?: 'sum' | 'avg' | 'count';
    colors?: string[];
    showLabels?: boolean;
    prefix?: string;
    suffix?: string;
  };
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DataSource {
  id: string;
  name: string;
  type: 'json' | 'csv' | 'manual';
  data: any[];           // Los datos en bruto (array de objetos)
  columns: string[];     // Nombres de las columnas detectadas
  updatedAt: string;
}

export interface Storyboard {
  id: string;
  title: string;
  description: string;
  visuals: DataVisual[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shareId?: string;      // ID único para compartir el link
}
