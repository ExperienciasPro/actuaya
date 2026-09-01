export interface Tecnico {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  estatus: 'Activo' | 'Inactivo';
  createdAt: string;
  updatedAt: string;
}
