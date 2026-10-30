export interface Tecnico {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  especialidad?: string;
  estatus: 'Activo' | 'Inactivo';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}
