// ═══════════════════════════════════════════
// Catálogo & Cotizador — Modelos
// ═══════════════════════════════════════════

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  sku?: string;
  price: number;
  currency?: 'COP' | 'USD';
  unit: string;           // 'unidad', 'hora', 'mes', 'servicio', 'proyecto', etc.
  category: string;
  itemType?: string;
  icon?: string;
  color?: string;
  trackInventory?: boolean;
  currentStock?: number;
  taxRate?: number;
  deliveryTime?: string;
  includesOrDeliverables?: string;
  active: boolean;
  createdAt: string;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface QuoteLineItem {
  catalogId: string;
  name: string;
  description: string;
  sku?: string;
  deliveryTime?: string;
  includesOrDeliverables?: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

export interface QuoteAttachment {
  id: string;
  name: string;
  caption?: string;
  dataUrl: string;          // Imagen redimensionada y comprimida (WebP / JPEG)
  mimeType: string;
  width: number;
  height: number;
  originalBytes: number;    // Peso original del archivo cargado por el usuario
  sizeBytes: number;        // Peso real serializado almacenado en la cotización
}

export const QUOTE_IMAGE_LIMITS = {
  maxImagesPerQuote: 4,
  maxRawFileBytes: 5 * 1024 * 1024,       // 5 MB máximo por archivo original seleccionado
  targetImageBytes: 90 * 1024,            // ~90 KB objetivo por imagen tras compresión
  maxSingleCompressedBytes: 115 * 1024,   // 115 KB tope estricto por imagen individual
  maxQuoteTotalBytes: 360 * 1024,         // 360 KB presupuesto máximo total de imágenes por cotización
  maxGlobalStorageBytes: 2200 * 1024,     // ~2.2 MB tope acumulado de imágenes en historial local
  maxDimensionPx: 960,                    // Resolución máxima óptima para PDF A4
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export interface Quote {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  items: QuoteLineItem[];
  attachments?: QuoteAttachment[];
  notes: string;
  validDays: number;
  createdAt: string;
  status?: 'draft' | 'sent' | 'sold' | 'cancelled';
  soldAt?: string;
  cashflowTransactionId?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'hora', label: 'Hora' },
  { value: 'día', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'sesión', label: 'Sesión' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'kg', label: 'Kilogramo (Kg)' },
  { value: 'litros', label: 'Litros' },
  { value: 'metros', label: 'Metros (m)' },
  { value: 'm2', label: 'Metro cuadrado (m²)' },
];

// ─── Quote Template / Format ──────────────
export type IvaMode = 'included' | 'excluded' | 'exempt';

export interface QuoteTemplate {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyNIT: string;
  companyWebsite: string;
  logoDataUrl: string;        // base64 data URL
  primaryColor: string;       // hex — header, accents
  secondaryColor: string;     // hex — subtle backgrounds
  fontFamily: string;
  showLogo: boolean;
  showFooterNotes: boolean;
  footerText: string;
  headerStyle: 'classic' | 'modern' | 'minimal';
  // IVA
  ivaMode: IvaMode;
  ivaRate: number;            // percentage, e.g. 19
  // Quoter / sales rep info
  quoterName: string;
  quoterRole: string;
  quoterPhone: string;
  quoterEmail: string;
  quoterSignatureDataUrl: string; // base64 data URL
  logoWidth: number;          // in pixels
}

export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplate = {
  companyName: 'Mi Empresa',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  companyNIT: '',
  companyWebsite: '',
  logoDataUrl: '',
  primaryColor: '#6c3ce9',
  secondaryColor: '#f0ebff',
  fontFamily: 'Inter',
  showLogo: true,
  showFooterNotes: true,
  footerText: 'Gracias por su preferencia. Esta cotización tiene carácter informativo.',
  headerStyle: 'modern',
  ivaMode: 'included',
  ivaRate: 19,
  quoterName: '',
  quoterRole: '',
  quoterPhone: '',
  quoterEmail: '',
  quoterSignatureDataUrl: '',
  logoWidth: 150,
};

export const QUOTE_COLOR_PRESETS = [
  { name: 'Violeta',    primary: '#6c3ce9', secondary: '#f0ebff' },
  { name: 'Azul Corp',  primary: '#1a56db', secondary: '#e8f0fe' },
  { name: 'Verde',      primary: '#059669', secondary: '#ecfdf5' },
  { name: 'Gris Exec',  primary: '#334155', secondary: '#f1f5f9' },
  { name: 'Rojo',       primary: '#dc2626', secondary: '#fef2f2' },
  { name: 'Naranja',    primary: '#ea580c', secondary: '#fff7ed' },
];

export const QUOTE_FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Arial',
];
