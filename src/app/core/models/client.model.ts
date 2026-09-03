export interface ClientLocation {
  id: string;
  name: string;      // e.g. "Sede Principal", "Planta de Producción"
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

export interface Client {
  id: string;
  // Basic info
  commercialName: string; // Nombre comercial
  legalName: string;      // Razón social
  nit: string;            // NIT
  contactName: string;    // Persona de contacto
  email: string;          // Correo electrónico
  phone: string;          // Teléfono de contacto
  
  // Status
  status: 'Activo' | 'Inactivo';
  
  // Locations (sedes)
  locations: ClientLocation[];

  // QR / Identification
  qrCode: string;         // Código aleatorio o manual
  
  // Analytics/Meta
  lastVisitAt?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}
