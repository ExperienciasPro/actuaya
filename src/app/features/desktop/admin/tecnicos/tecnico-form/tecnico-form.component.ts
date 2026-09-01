import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tecnico } from '../../../../../core/models/tecnico.model';

@Component({
  selector: 'um-tecnico-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fadeIn" (click)="onClose()">
      <div class="modal-panel animate-slideInRight" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <h2>{{ tecnico ? 'Editar Técnico' : 'Agregar Técnico' }}</h2>
          <button class="btn-close" (click)="onClose()">✕</button>
        </div>

        <div class="modal-body">
          <form #form="ngForm" class="form-grid">
            
            <div class="form-group full-width">
              <label>Nombre del técnico <span class="req">*</span></label>
              <input type="text" name="nombre" [(ngModel)]="fData.nombre" required placeholder="Ej: Carlos Ramírez" />
            </div>

            <div class="form-group full-width">
              <label>Teléfono de contacto <span class="req">*</span></label>
              <input type="tel" name="telefono" [(ngModel)]="fData.telefono" required placeholder="Ej: +57 300 000 0000" />
            </div>

            <div class="form-group full-width">
              <label>Correo de contacto <span class="req">*</span></label>
              <input type="email" name="correo" [(ngModel)]="fData.correo" required placeholder="Ej: carlos@actuaya.co" />
            </div>

            @if (tecnico) {
              <div class="form-group full-width">
                <label>Estado del técnico <span class="req">*</span></label>
                <select name="estatus" [(ngModel)]="fData.estatus" required>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            }

          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Cancelar</button>
          <button class="btn btn-green" (click)="onSave()" [disabled]="!isValid()">
            {{ tecnico ? 'Guardar Cambios' : 'Agregar Técnico' }}
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
      display: grid; grid-template-columns: 1fr; gap: 20px;
    }
    .form-group {
      display: flex; flex-direction: column; gap: 6px;
      label {
        font-size: 0.85rem; font-weight: 600; color: #475569;
        .req { color: #ef4444; }
      }
      input, select {
        padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px;
        font-size: 0.95rem; color: #1e293b; outline: none; transition: 0.2s;
        &:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
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

    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
    .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class TecnicoFormComponent implements OnInit {
  @Input() tecnico: Tecnico | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  fData: any = {
    nombre: '',
    telefono: '',
    correo: '',
    estatus: 'Activo'
  };

  ngOnInit() {
    if (this.tecnico) {
      this.fData = { ...this.tecnico };
    }
  }

  isValid() {
    return this.fData.nombre && 
           this.fData.telefono && 
           this.fData.correo;
  }

  onSave() {
    if (!this.isValid()) return;
    this.save.emit(this.fData);
  }

  onClose() {
    this.close.emit();
  }
}
