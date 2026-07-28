// ═══════════════════════════════════════════
// POS (Punto de Venta) — Modelos
// ═══════════════════════════════════════════

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';

export interface POSSaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
}

export interface POSSale {
  id: string;
  items: POSSaleItem[];
  userId: string;
  userName: string;
  subtotal: number;
  discount: number;      // Descuento total aplicado
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;  // Efectivo recibido (para calcular cambio)
  change?: number;        // Cambio a devolver
  sessionId: string;      // Turno de caja al que pertenece
  date: string;           // YYYY-MM-DD
  createdAt: string;
  voided?: boolean;       // Anulada
  voidedAt?: string;
  notes?: string;
}

export interface POSSession {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;    // Efectivo en caja al abrir
  closingCash?: number;   // Efectivo contado al cerrar
  expectedCash?: number;  // Calculado: apertura + ventas efectivo - cambios
  difference?: number;    // closingCash - expectedCash
  salesCount: number;
  totalSales: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashAuditEntry {
  sessionId: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt: string;
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  difference: number;
  salesCount: number;
  totalSales: number;
  notes?: string;
}

export interface POSCartItem {
  productId: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  maxStock: number;       // Stock disponible (para validación)
  unit: string;
}
