import { Injectable, computed, inject } from '@angular/core';
import { Tecnico } from '../models/tecnico.model';
import { Technician } from '../models/asignaciones.model';
import { AsignacionesService } from './asignaciones.service';

@Injectable({ providedIn: 'root' })
export class TecnicoService {
  private asignacionesService = inject(AsignacionesService);

  tecnicos = computed<Tecnico[]>(() =>
    this.asignacionesService.technicians().map(t => AsignacionesService.toTecnico(t))
  );

  addTecnico(data: Omit<Tecnico, 'id' | 'createdAt' | 'updatedAt' | 'estatus'> & { estatus?: 'Activo' | 'Inactivo' }) {
    const { firstName, lastName } = AsignacionesService.splitFullName(data.nombre);
    this.asignacionesService.addTechnician({
      firstName,
      lastName,
      phone: data.telefono || '',
      email: data.correo || '',
      specialty: data.especialidad || 'General',
      active: data.estatus ? data.estatus === 'Activo' : true,
      notes: '',
    });
  }

  updateTecnico(id: string, data: Partial<Tecnico>) {
    const updates: Partial<Technician> = {};
    if (data.nombre !== undefined) {
      const { firstName, lastName } = AsignacionesService.splitFullName(data.nombre);
      updates.firstName = firstName;
      updates.lastName = lastName;
    }
    if (data.telefono !== undefined) {
      updates.phone = data.telefono;
    }
    if (data.correo !== undefined) {
      updates.email = data.correo;
    }
    if (data.especialidad !== undefined) {
      updates.specialty = data.especialidad || 'General';
    }
    if (data.estatus !== undefined) {
      updates.active = data.estatus === 'Activo';
    }
    this.asignacionesService.updateTechnician(id, updates);
  }

  deleteTecnico(id: string) {
    this.asignacionesService.deleteTechnician(id);
  }
}
