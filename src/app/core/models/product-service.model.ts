export interface ProductService {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  price?: number;
  currency: 'COP' | 'USD';
  icon?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ProductCategory =
  | 'producto'
  | 'servicio'
  | 'curso'
  | 'suscripcion'
  | 'consultoria'
  | 'otro';
