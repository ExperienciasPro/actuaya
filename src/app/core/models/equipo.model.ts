export interface Equipo {
  id: string;
  nombre: string;
  identificador: string;
  estatus: 'Activo' | 'Inactivo' | 'Mantenimiento';
  categoria: string;
  subcategoria: string;
  clienteId: string;
  sedeId: string;
  tecnicoId?: string;
  fotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipoFilter {
  tecnicoId?: string;
  clienteId?: string;
  categoria?: string;
  subcategoria?: string;
  searchQuery?: string;
}
