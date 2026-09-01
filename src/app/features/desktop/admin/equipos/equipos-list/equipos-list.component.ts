import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipoService } from '../../../../../core/services/equipo.service';
import { Equipo } from '../../../../../core/models/equipo.model';
import { ClientService } from '../../../../../core/services/client.service';
import { EquipoFormComponent } from '../equipo-form/equipo-form.component';

@Component({
  selector: 'um-equipos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EquipoFormComponent],
  template: `
    <div class="equipos-layout animate-fadeIn">
      <div class="top-bar">
        <h1 class="page-title">Equipos</h1>
        <div class="actions">
          <button class="btn btn-purple" (click)="toggleFilters()">
            <span class="icon">Y</span> Filtros
          </button>
          <button class="btn btn-green" (click)="openForm()">+ Agregar equipo</button>
        </div>
      </div>

      <!-- Área de filtros -->
      @if (showFilters()) {
        <div class="filters-card">
          <div class="filter-grid">
            <div class="filter-field">
              <label>Técnico</label>
              <select [(ngModel)]="fTecnico">
                <option value="">Todos</option>
                <!-- Omitimos cargar técnicos reales por simplicidad del modelo, pero se podría conectar al User service -->
                <option value="tec-1">Técnico Juan</option>
                <option value="tec-2">Técnico Pedro</option>
              </select>
            </div>
            
            <div class="filter-field">
              <label>Cliente</label>
              <select [(ngModel)]="fCliente" (change)="fCategoria = ''; fSubcategoria = ''">
                <option value="">Todos</option>
                @for (c of clientes(); track c.id) {
                  <option [value]="c.id">{{ c.commercialName }}</option>
                }
              </select>
            </div>

            <div class="filter-field">
              <label>Categoría</label>
              <select [(ngModel)]="fCategoria" (change)="fSubcategoria = ''" [disabled]="!fCliente && false">
                <option value="">Todas</option>
                @for (cat of activeCategorias(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>

            <div class="filter-field">
              <label>Subcategoría</label>
              <select [(ngModel)]="fSubcategoria" [disabled]="!fCategoria">
                <option value="">Todas</option>
                @for (sub of activeSubcategorias(); track sub) {
                  <option [value]="sub">{{ sub }}</option>
                }
              </select>
            </div>
            
            <div class="filter-field search-field">
              <label>Buscar</label>
              <input type="text" [(ngModel)]="fSearch" placeholder="Buscar por nombre o ID..." />
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="btn-clear" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        </div>
      }

      <div class="content-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-check"><input type="checkbox"></th>
                <th class="col-photo">Foto</th>
                <th>Nombre ↕</th>
                <th>Identificador ↕</th>
                <th>Asociación (Cliente/Sede)</th>
                <th>Estatus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (equipo of filteredEquipos(); track equipo.id) {
                <tr>
                  <td class="col-check"><input type="checkbox"></td>
                  <td class="col-photo">
                    @if (equipo.fotoUrl) {
                      <img [src]="equipo.fotoUrl" class="equipo-thumb" />
                    } @else {
                      <div class="equipo-thumb-placeholder">🖼️</div>
                    }
                  </td>
                  <td class="equipo-name">{{ equipo.nombre }}</td>
                  <td class="equipo-identificador">{{ equipo.identificador }}</td>
                  <td class="equipo-asociacion">
                    {{ getClientName(equipo.clienteId) }} - {{ getSedeName(equipo.clienteId, equipo.sedeId) }}
                  </td>
                  <td>
                    <span class="status-badge" [class.active]="equipo.estatus === 'Activo'">
                      {{ equipo.estatus }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="btn-icon" (click)="openForm(equipo)">✏️</button>
                    <button class="btn-icon text-danger" (click)="deleteEquipo(equipo.id)">🗑️</button>
                  </td>
                </tr>
              }
              @if (filteredEquipos().length === 0) {
                <tr>
                  <td colspan="7" class="empty-state">No se encontraron equipos con los filtros seleccionados.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (formVisible()) {
      <um-equipo-form 
        [equipo]="editingEquipo()" 
        (save)="saveEquipo($event)" 
        (close)="closeForm()">
      </um-equipo-form>
    }
  `,
  styleUrl: './equipos-list.component.scss'
})
export class EquiposListComponent implements OnInit {
  equipoService = inject(EquipoService);
  clientService = inject(ClientService);

  equipos = this.equipoService.equipos;
  clientes = this.clientService.clients;

  showFilters = signal(false);
  formVisible = signal(false);
  editingEquipo = signal<Equipo | null>(null);

  // Filters
  fTecnico = '';
  fCliente = '';
  fCategoria = '';
  fSubcategoria = '';
  fSearch = '';

  activeCategorias = computed(() => {
    let list = this.equipos();
    if (this.fCliente) {
      list = list.filter(e => e.clienteId === this.fCliente);
    }
    return Array.from(new Set(list.map(e => e.categoria).filter(Boolean)));
  });

  activeSubcategorias = computed(() => {
    let list = this.equipos();
    if (this.fCliente) list = list.filter(e => e.clienteId === this.fCliente);
    if (this.fCategoria) list = list.filter(e => e.categoria === this.fCategoria);
    return Array.from(new Set(list.map(e => e.subcategoria).filter(Boolean)));
  });

  filteredEquipos = computed(() => {
    let list = this.equipos();
    if (this.fTecnico) list = list.filter(e => e.tecnicoId === this.fTecnico);
    if (this.fCliente) list = list.filter(e => e.clienteId === this.fCliente);
    if (this.fCategoria) list = list.filter(e => e.categoria === this.fCategoria);
    if (this.fSubcategoria) list = list.filter(e => e.subcategoria === this.fSubcategoria);
    
    if (this.fSearch) {
      const q = this.fSearch.toLowerCase();
      list = list.filter(e => 
        e.nombre.toLowerCase().includes(q) || 
        e.identificador.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit() {}

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters() {
    this.fTecnico = '';
    this.fCliente = '';
    this.fCategoria = '';
    this.fSubcategoria = '';
    this.fSearch = '';
  }

  openForm(equipo?: Equipo) {
    this.editingEquipo.set(equipo || null);
    this.formVisible.set(true);
  }

  closeForm() {
    this.formVisible.set(false);
    this.editingEquipo.set(null);
  }

  saveEquipo(data: any) {
    if (this.editingEquipo()) {
      this.equipoService.updateEquipo(this.editingEquipo()!.id, data);
    } else {
      this.equipoService.addEquipo(data);
    }
    this.closeForm();
  }

  deleteEquipo(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este equipo?')) {
      this.equipoService.deleteEquipo(id);
    }
  }

  getClientName(id: string): string {
    const c = this.clientes().find(x => x.id === id);
    return c ? c.commercialName : 'Desconocido';
  }

  getSedeName(clientId: string, sedeId: string): string {
    const c = this.clientes().find(x => x.id === clientId);
    if (!c) return '';
    const sede = c.locations?.find((l: any) => l.id === sedeId);
    return sede ? sede.name : '';
  }
}
