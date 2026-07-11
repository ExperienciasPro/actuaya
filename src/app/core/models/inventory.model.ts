// ═══════════════════════════════════════════
// Inventario — Modelos
// ═══════════════════════════════════════════

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;          // umbral de alerta "Stock Crítico"
  unit: string;              // 'unidades', 'kg', 'litros', 'cajas', 'metros'
  costPerUnit: number;
  createdAt: string;
}

export type MovementType = 'entrada' | 'salida';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reason: string;
  date: string;
  createdAt: string;
}

export const INVENTORY_UNITS = [
  { value: 'unidades', label: 'Unidades' },
  { value: 'kg', label: 'Kg' },
  { value: 'litros', label: 'Litros' },
  { value: 'cajas', label: 'Cajas' },
  { value: 'metros', label: 'Metros' },
  { value: 'rollos', label: 'Rollos' },
  { value: 'paquetes', label: 'Paquetes' },
];

export const ENTRY_REASONS = [
  'Compra a proveedor',
  'Devolución de cliente',
  'Producción',
  'Ajuste de inventario',
  'Transferencia',
  'Otro',
];

export const EXIT_REASONS = [
  'Venta',
  'Consumo interno',
  'Daño / pérdida',
  'Devolución a proveedor',
  'Ajuste de inventario',
  'Otro',
];
