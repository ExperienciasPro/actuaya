import { PaymentMethod } from './pos.model';

export interface Zone {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface Table {
  id: string;
  zoneId: string;
  label: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  activeOrderId?: string;
  order: number;
  x?: number; // Position X for visual plane
  y?: number; // Position Y for visual plane
}

export interface TableOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  addedAt: string;
  addedBy: string;
  notes?: string;
}

export interface TableOrder {
  id: string;
  tableId: string;
  tableName: string;
  zoneId: string;
  zoneName: string;
  items: TableOrderItem[];
  status: 'open' | 'closed' | 'cancelled';
  openedAt: string;
  closedAt?: string;
  userId: string;
  userName: string;
  subtotal: number;
  discount: number;
  tip: number;
  total: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  guestCount?: number;
}

export interface TableStatusSummary {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  billing: number;
}
