export interface ProductService {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category: ProductCategory;
  commercialCategory?: string;
  price?: number;
  costPrice?: number;
  unit?: string;
  currency: 'COP' | 'USD';
  icon?: string;
  color: string;
  taxRate?: number;
  deliveryTime?: string;
  includesOrDeliverables?: string;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export type ProductCategory =
  | 'producto'
  | 'servicio'
  | 'curso'
  | 'suscripcion'
  | 'consultoria'
  | 'otro';
