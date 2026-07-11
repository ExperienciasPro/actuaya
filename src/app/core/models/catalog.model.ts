// ═══════════════════════════════════════════
// Catálogo & Cotizador — Modelos
// ═══════════════════════════════════════════

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;           // 'unidad', 'hora', 'mes', 'servicio', 'proyecto'
  category: string;
  active: boolean;
  createdAt: string;
}

export interface QuoteLineItem {
  catalogId: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

export interface Quote {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  items: QuoteLineItem[];
  notes: string;
  validDays: number;
  createdAt: string;
  status?: 'draft' | 'sent' | 'sold' | 'cancelled';
  soldAt?: string;
  cashflowTransactionId?: string;
}

export const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'hora', label: 'Hora' },
  { value: 'mes', label: 'Mes' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'kg', label: 'Kg' },
  { value: 'm2', label: 'm²' },
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
