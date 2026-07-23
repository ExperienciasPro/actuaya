// ═══════════════════════════════════════════
// Menú Digital — Modelos
// ═══════════════════════════════════════════

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  imageDataUrl?: string; // base64 — optional photo
  tags?: string[];       // 'vegano', 'sin gluten', 'picante', etc.
}

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
  order: number;
}

export type MenuFontFamily = 'Inter' | 'Roboto' | 'Playfair Display' | 'Poppins' | 'Outfit' | 'Lora' | 'DM Sans';
export type MenuTheme = 'light' | 'dark' | 'auto';
export type MenuLayout = 'list' | 'grid' | 'compact';
export type MenuRadius = 'rounded' | 'sharp' | 'pill';
export type MenuHeaderStyle = 'solid' | 'gradient' | 'minimal';
export type MenuFontSize = 'normal' | 'large' | 'xlarge';

export interface MenuConfig {
  businessName: string;
  tagline: string;
  slug?: string;
  logoDataUrl?: string;
  coverImageDataUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;       // 'COP', 'USD', 'MXN', etc.
  showImages: boolean;
  showPrices: boolean;
  footerNote: string;
  lastUpdated: string;
  // New appearance options
  fontFamily: MenuFontFamily;
  theme: MenuTheme;
  layout: MenuLayout;
  borderRadius: MenuRadius;
  headerStyle: MenuHeaderStyle;
  fontSize: MenuFontSize;
  showPoweredBy: boolean;
  wifiName: string;
  wifiPassword: string;
  schedule: string;       // business hours text
  socialInstagram: string;
  socialWhatsapp: string;
}

export const FONT_FAMILIES: { value: MenuFontFamily; label: string }[] = [
  { value: 'Inter',              label: 'Inter (Moderna)' },
  { value: 'Roboto',             label: 'Roboto (Limpia)' },
  { value: 'Playfair Display',   label: 'Playfair (Elegante)' },
  { value: 'Poppins',            label: 'Poppins (Amigable)' },
  { value: 'Outfit',             label: 'Outfit (Contemporánea)' },
  { value: 'Lora',               label: 'Lora (Clásica)' },
  { value: 'DM Sans',            label: 'DM Sans (Minimalista)' },
];

export const THEME_OPTIONS: { value: MenuTheme; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro',      icon: '☀️' },
  { value: 'dark',  label: 'Oscuro',     icon: '🌙' },
  { value: 'auto',  label: 'Automático', icon: '🔄' },
];

export const LAYOUT_OPTIONS: { value: MenuLayout; label: string; icon: string }[] = [
  { value: 'list',    label: 'Lista',    icon: '📄' },
  { value: 'grid',    label: 'Cuadrícula', icon: '🔲' },
  { value: 'compact', label: 'Compacto', icon: '📑' },
];

export const RADIUS_OPTIONS: { value: MenuRadius; label: string }[] = [
  { value: 'rounded', label: 'Redondeado' },
  { value: 'sharp',   label: 'Recto' },
  { value: 'pill',    label: 'Píldora' },
];

export const HEADER_STYLES: { value: MenuHeaderStyle; label: string; icon: string }[] = [
  { value: 'solid',    label: 'Color sólido', icon: '🎨' },
  { value: 'gradient', label: 'Degradado',    icon: '🌈' },
  { value: 'minimal',  label: 'Minimalista',  icon: '✨' },
];

export const FONT_SIZE_OPTIONS: { value: MenuFontSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large',  label: 'Grande' },
  { value: 'xlarge', label: 'Extra Grande' },
];

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  businessName: 'Mi Restaurante',
  tagline: 'Bienvenido a nuestra carta',
  primaryColor: '#e67e22',
  secondaryColor: '#2d3436',
  logoDataUrl: '',
  currency: 'COP',
  showImages: false,
  showPrices: true,
  footerNote: 'Precios incluyen impuestos. Consulta alérgenos con el personal.',
  lastUpdated: new Date().toISOString(),
  fontFamily: 'Inter',
  theme: 'light',
  layout: 'list',
  borderRadius: 'rounded',
  headerStyle: 'solid',
  fontSize: 'normal',
  showPoweredBy: true,
  wifiName: '',
  wifiPassword: '',
  schedule: '',
  socialInstagram: '',
  socialWhatsapp: '',
  coverImageDataUrl: '',
};
