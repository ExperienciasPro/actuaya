import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Equipo } from '../../../../../core/models/equipo.model';
import { ClientService } from '../../../../../core/services/client.service';
import { EquipoService } from '../../../../../core/services/equipo.service';

@Component({
  selector: 'um-equipo-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fadeIn" (click)="onClose()">
      <div class="modal-panel animate-slideInRight" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <h2>{{ equipo ? 'Editar Equipo' : 'Agregar Equipo' }}</h2>
          <button class="btn-close" (click)="onClose()">✕</button>
        </div>

        <div class="modal-body">
          <form #form="ngForm" class="form-grid">
            
            <div class="form-group full-width">
              <label>Nombre del equipo <span class="req">*</span></label>
              <input type="text" name="nombre" [(ngModel)]="fData.nombre" required placeholder="Ej: Aire Acondicionado Central" />
            </div>

            <div class="form-group">
              <label>Código (Identificador) <span class="req">*</span></label>
              <input type="text" name="identificador" [(ngModel)]="fData.identificador" required placeholder="Ej: AA-001" />
            </div>

            <div class="form-group">
              <label>Estado del equipo <span class="req">*</span></label>
              <select name="estatus" [(ngModel)]="fData.estatus" required>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div class="form-group">
              <label>Categoría <span class="req">*</span></label>
              <input type="text" name="categoria" [(ngModel)]="fData.categoria" list="cat-list" required placeholder="Selecciona o escribe..." />
              <datalist id="cat-list">
                @for (cat of categorias(); track cat) {
                  <option [value]="cat"></option>
                }
              </datalist>
            </div>

            <div class="form-group">
              <label>Subcategoría <span class="req">*</span></label>
              <input type="text" name="subcategoria" [(ngModel)]="fData.subcategoria" list="subcat-list" required placeholder="Selecciona o escribe..." />
              <datalist id="subcat-list">
                @for (sub of subcategorias(); track sub) {
                  <option [value]="sub"></option>
                }
              </datalist>
            </div>

            <div class="form-group full-width">
              <label>Cliente Asociado <span class="req">*</span></label>
              <select name="clienteId" [(ngModel)]="fData.clienteId" (change)="onClienteChange()" required>
                <option value="">Seleccione un cliente...</option>
                @for (c of clientes(); track c.id) {
                  <option [value]="c.id">{{ c.commercialName }}</option>
                }
              </select>
            </div>

            <div class="form-group full-width">
              <label>Sede <span class="req">*</span></label>
              <select name="sedeId" [(ngModel)]="fData.sedeId" required [disabled]="!fData.clienteId">
                <option value="">Seleccione una sede...</option>
                @for (s of sedesDisponibles; track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
            </div>

          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Cancelar</button>
          <button class="btn btn-green" (click)="onSave()" [disabled]="!isValid()">
            {{ equipo ? 'Guardar Cambios' : 'Generar Equipo' }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.4);
      display: flex; justify-content: flex-end; z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal-panel {
      width: 480px; max-width: 100%; background: white;
      height: 100%; display: flex; flex-direction: column;
      box-shadow: -4px 0 24px rgba(0,0,0,0.1);
    }
    .modal-header {
      padding: 24px; border-bottom: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
      .btn-close {
        background: none; border: none; font-size: 1.5rem; color: #94a3b8;
        cursor: pointer; padding: 4px;
        &:hover { color: #0f172a; }
      }
    }
    .modal-body {
      padding: 24px; overflow-y: auto; flex: 1;
    }
    .modal-footer {
      padding: 20px 24px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: flex-end; gap: 12px;
      background: #f8fafc;
    }
    
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .form-group {
      display: flex; flex-direction: column; gap: 6px;
      &.full-width { grid-column: 1 / -1; }
      label {
        font-size: 0.85rem; font-weight: 600; color: #475569;
        .req { color: #ef4444; }
      }
      input, select {
        padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px;
        font-size: 0.95rem; color: #1e293b; outline: none; transition: 0.2s;
        &:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        &:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
      }
    }
    
    .btn {
      padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem;
      cursor: pointer; transition: 0.2s; border: none;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
    .btn-outline:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; color: #1e293b; }
    .btn-green { background: #10b981; color: white; }
    .btn-green:hover:not(:disabled) { background: #059669; }

    /* Animations */
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
    .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class EquipoFormComponent implements OnInit {
  @Input() equipo: Equipo | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  clientService = inject(ClientService);
  equipoService = inject(EquipoService);

  clientes = this.clientService.clients;
  categorias = this.equipoService.categorias;
  subcategorias = this.equipoService.subcategorias;

  sedesDisponibles: any[] = [];

  fData: any = {
    nombre: '',
    identificador: '',
    estatus: 'Activo',
    categoria: '',
    subcategoria: '',
    clienteId: '',
    sedeId: ''
  };

  ngOnInit() {
    if (this.equipo) {
      this.fData = { ...this.equipo };
      this.loadSedes(this.fData.clienteId);
    }
  }

  onClienteChange() {
    this.fData.sedeId = '';
    this.loadSedes(this.fData.clienteId);
  }

  loadSedes(clienteId: string) {
    const c = this.clientes().find(x => x.id === clienteId);
    this.sedesDisponibles = c?.locations || [];
  }

  isValid() {
    return this.fData.nombre && 
           this.fData.identificador && 
           this.fData.categoria && 
           this.fData.subcategoria &&
           this.fData.clienteId &&
           this.fData.sedeId;
  }

  onSave() {
    if (!this.isValid()) return;
    this.save.emit(this.fData);
  }

  onClose() {
    this.close.emit();
  }
}
