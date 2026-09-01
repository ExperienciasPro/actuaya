import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TecnicoService } from '../../../../../core/services/tecnico.service';
import { Tecnico } from '../../../../../core/models/tecnico.model';
import { TecnicoFormComponent } from '../tecnico-form/tecnico-form.component';

@Component({
  selector: 'um-tecnicos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TecnicoFormComponent],
  template: `
    <div class="tecnicos-layout animate-fadeIn">
      <div class="top-bar">
        <h1 class="page-title">Técnicos</h1>
        <div class="actions">
          <button class="btn btn-green" (click)="openForm()">+ Agregar técnico</button>
        </div>
      </div>

      <div class="content-card">
        <div class="search-bar">
          <label for="search">Buscar:</label>
          <input 
            id="search" 
            type="text" 
            class="search-input" 
            [(ngModel)]="searchQuery" 
            placeholder="Buscar por nombre o correo..."
          />
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-check"><input type="checkbox"></th>
                <th>Nombre del técnico ↕</th>
                <th>Teléfono de contacto</th>
                <th>Correo de contacto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (tecnico of filteredTecnicos(); track tecnico.id) {
                <tr>
                  <td class="col-check"><input type="checkbox"></td>
                  <td class="tecnico-name">{{ tecnico.nombre }}</td>
                  <td>{{ tecnico.telefono }}</td>
                  <td>{{ tecnico.correo }}</td>
                  <td>
                    <span class="status-badge" [class.active]="tecnico.estatus === 'Activo'">
                      {{ tecnico.estatus }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="btn-icon" (click)="openForm(tecnico)">✏️</button>
                    <button class="btn-icon text-danger" (click)="deleteTecnico(tecnico.id)">🗑️</button>
                  </td>
                </tr>
              }
              @if (filteredTecnicos().length === 0) {
                <tr>
                  <td colspan="6" class="empty-state">No se encontraron técnicos.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (formVisible()) {
      <um-tecnico-form 
        [tecnico]="editingTecnico()" 
        (save)="saveTecnico($event)" 
        (close)="closeForm()">
      </um-tecnico-form>
    }
  `,
  styleUrl: './tecnicos-list.component.scss'
})
export class TecnicosListComponent implements OnInit {
  tecnicoService = inject(TecnicoService);
  tecnicos = this.tecnicoService.tecnicos;

  formVisible = signal(false);
  editingTecnico = signal<Tecnico | null>(null);

  searchQuery = '';

  filteredTecnicos = computed(() => {
    let list = this.tecnicos();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(t => 
        t.nombre.toLowerCase().includes(q) || 
        t.correo.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit() {}

  openForm(tecnico?: Tecnico) {
    this.editingTecnico.set(tecnico || null);
    this.formVisible.set(true);
  }

  closeForm() {
    this.formVisible.set(false);
    this.editingTecnico.set(null);
  }

  saveTecnico(data: any) {
    if (this.editingTecnico()) {
      this.tecnicoService.updateTecnico(this.editingTecnico()!.id, data);
    } else {
      this.tecnicoService.addTecnico(data);
    }
    this.closeForm();
  }

  deleteTecnico(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este técnico?')) {
      this.tecnicoService.deleteTecnico(id);
    }
  }
}
