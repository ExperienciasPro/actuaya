// ═══════════════════════════════════════════
// Subscription Manager — Modelo de datos
// ═══════════════════════════════════════════

/** Soluciones/Apps disponibles en el ecosistema */
export enum AppSolution {
  ACTUAYA     = 'ACTUAYA',
  PSICODATA   = 'PSICODATA',
  TESTEA      = 'TESTEA',
  DIGIOBRA    = 'DIGIOBRA',
  CHATBOT     = 'CHATBOT',
  LICITACIONES = 'LICITACIONES',
}

/** Estados posibles de una suscripción */
export enum SubscriptionStatus {
  ACTIVE    = 'ACTIVE',
  EXPIRED   = 'EXPIRED',
  TRIAL     = 'TRIAL',
  SUSPENDED = 'SUSPENDED',
}

/** Tipo de cliente */
export enum SubscriptionType {
  PERSONA       = 'PERSONA',
  MARCA_BLANCA  = 'MARCA_BLANCA',
}

/** Periodicidad del pago */
export enum PaymentFrequency {
  MONTHLY     = 'MONTHLY',
  QUARTERLY   = 'QUARTERLY',
  SEMIANNUAL  = 'SEMIANNUAL',
  ANNUAL      = 'ANNUAL',
}

/** Monedas soportadas */
export type Currency = 'COP' | 'USD';

/** Información de contacto de la empresa */
export interface CompanyContact {
  name: string;
  email: string;
  whatsapp: string;
  phone: string;             // Número de celular
}

/** Información de la empresa suscriptora */
export interface CompanyInfo {
  name: string;
  nit: string;
}

/** Entidad principal de Suscripción */
export interface Subscription {
  id: string;
  company: CompanyInfo;
  contact: CompanyContact;
  app: AppSolution;
  status: SubscriptionStatus;
  clientType: SubscriptionType;
  startDate: string;          // ISO YYYY-MM-DD
  nextRenewalDate: string;    // ISO YYYY-MM-DD (calculada)
  lastPaymentDate: string;    // ISO YYYY-MM-DD
  amount: number;
  paymentFrequency: PaymentFrequency; // Periodicidad del pago
  currency: Currency;
  notes?: string;
  // — Embajador / Vendedor —
  ambassadorName?: string;       // Nombre del embajador/vendedor
  ambassadorCommission?: number; // Porcentaje de comisión (ej: 10 = 10%)
  // — Marca Blanca —
  appLoginUrl?: string;
  // — Almacenamiento —
  storageUsedMB?: number;
  storageLimitMB?: number;
  createdAt: string;
  updatedAt?: string;
}

/** Resultado de la evaluación de salud de renovación */
export interface RenewalHealth {
  daysUntilRenewal: number;
  isUrgent: boolean;          // < 15 días
  isCritical: boolean;        // < 5 días
  isOverdue: boolean;         // Ya venció
  label: string;
}

// ─── Labels & Constants ─────────────────────

export const APP_LABELS: Record<AppSolution, string> = {
  [AppSolution.ACTUAYA]:      'ActuaYa',
  [AppSolution.PSICODATA]:    'PsicoData',
  [AppSolution.TESTEA]:       'Testea',
  [AppSolution.DIGIOBRA]:     'Digiobra',
  [AppSolution.CHATBOT]:      'Chatbot IA',
  [AppSolution.LICITACIONES]: 'Licitaciones',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]:    'Activa',
  [SubscriptionStatus.EXPIRED]:   'Vencida',
  [SubscriptionStatus.TRIAL]:     'Prueba',
  [SubscriptionStatus.SUSPENDED]: 'Suspendida',
};

export const APP_ICONS: Record<AppSolution, string> = {
  [AppSolution.ACTUAYA]:      '🎯',
  [AppSolution.PSICODATA]:    '🧠',
  [AppSolution.TESTEA]:       '📝',
  [AppSolution.DIGIOBRA]:     '🏗️',
  [AppSolution.CHATBOT]:      '🤖',
  [AppSolution.LICITACIONES]: '📄',
};

export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]:    '#00b894',
  [SubscriptionStatus.EXPIRED]:   '#e84393',
  [SubscriptionStatus.TRIAL]:     '#fdcb6e',
  [SubscriptionStatus.SUSPENDED]: '#636e72',
};

export const SUBSCRIPTION_TYPE_LABELS: Record<SubscriptionType, string> = {
  [SubscriptionType.PERSONA]:      'Persona',
  [SubscriptionType.MARCA_BLANCA]: 'Marca Blanca / Empresa',
};

export const SUBSCRIPTION_TYPE_ICONS: Record<SubscriptionType, string> = {
  [SubscriptionType.PERSONA]:      '👤',
  [SubscriptionType.MARCA_BLANCA]: '🏢',
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  [PaymentFrequency.MONTHLY]:    'Mensual',
  [PaymentFrequency.QUARTERLY]:  'Trimestral',
  [PaymentFrequency.SEMIANNUAL]: 'Semestral',
  [PaymentFrequency.ANNUAL]:     'Anual',
};

export const PAYMENT_FREQUENCY_ICONS: Record<PaymentFrequency, string> = {
  [PaymentFrequency.MONTHLY]:    '📅',
  [PaymentFrequency.QUARTERLY]:  '📆',
  [PaymentFrequency.SEMIANNUAL]: '🗓️',
  [PaymentFrequency.ANNUAL]:     '📋',
};

/** Cuántos meses cubre cada periodicidad */
export const PAYMENT_FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  [PaymentFrequency.MONTHLY]:    1,
  [PaymentFrequency.QUARTERLY]:  3,
  [PaymentFrequency.SEMIANNUAL]: 6,
  [PaymentFrequency.ANNUAL]:     12,
};
