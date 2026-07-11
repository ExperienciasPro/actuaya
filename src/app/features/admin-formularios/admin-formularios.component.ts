import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TestsDataService, TestItem } from '../../shared/tests-data.service';

@Component({
  selector: 'app-admin-formularios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-layout-wrapper" style="padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Encabezado Estilo ActuaYa -->
      <header *ngIf="vistaActual !== 'constructor'" style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px;">
        <div>
           <h1 style="font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; letter-spacing: -0.02em;" [innerHTML]="vistaActual === 'papelera' ? 'Papelera de Formularios' : 'Gestión de Formularios'"></h1>
           <p style="color: #64748b; margin: 0; font-size: 0.95rem;">
             <span *ngIf="vistaActual !== 'papelera'">Administra y diseña las variables demográficas para tus pruebas.</span>
             <span *ngIf="vistaActual === 'papelera'">Formularios eliminados recientemente. Se conservan por 30 días.</span>
           </p>
        </div>
        
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">

          <button *ngIf="vistaActual !== 'papelera'" (click)="vistaActual = 'papelera'" style="padding: 11px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Papelera
          </button>

          <button *ngIf="vistaActual === 'papelera'" (click)="vistaActual = 'galeria'" style="padding: 11px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
             Volver a Formularios
          </button>

          <button *ngIf="vistaActual !== 'papelera'" (click)="vistaActual = 'constructor'" style="padding: 11px 24px; background: var(--accent); color: white; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(108, 60, 233, 0.25); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(108, 60, 233, 0.35)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(108, 60, 233, 0.25)'">
            + Crear Personalizado
          </button>
        </div>
      </header>

      <main style="display: flex; flex-direction: column; width: 100%; flex: 1;">
        
        <!-- VISTA DE GALERÍA DE FORMULARIOS -->
        <div *ngIf="vistaActual === 'galeria' || vistaActual === 'papelera'" class="vista-container">
          
          <!-- Barra de Búsqueda y Toggles -->
          <div class="search-and-toggles">
            <div class="search-bar-container">
              <input type="text" class="search-input" placeholder="Búsqueda">
              <button class="search-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </div>

            <div class="view-toggles">
              <button class="toggle-btn activo" title="Vista de Cuadrícula">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button class="toggle-btn" title="Vista de Lista">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <!-- Mis Formularios (Galería) -->
          <div class="tests-grid">
            
            <div class="test-card" *ngFor="let form of adminFormulariosVisual()">
              <div class="card-banner bg-teal">
                <svg viewBox="0 0 24 24" fill="none" class="banner-icon" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div class="card-body">
                <div class="info-test">
                  <h3 class="card-title">{{ form.nombre }}</h3>
                  <p class="form-desc">{{ form.descripcion }}</p>
                  <div class="tags-container" style="margin-top: 10px;">
                    <span class="tag" *ngFor="let campo of form.campos">{{ campo }}</span>
                  </div>
                </div>
                
                <p class="deleted-msg" *ngIf="vistaActual === 'papelera'">Expira en {{ getDaysLeft(form.deletedAt) }} días</p>

                <div class="card-actions flex justify-between items-center w-full mt-auto pt-4 border-t border-gray-100" *ngIf="vistaActual !== 'papelera'">
                  <button class="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border-none transition-all focus:outline-none" (click)="vincularTest(form)" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8fafc; color: #475569; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    Vincular a Test
                  </button>
                  <div class="flex gap-2" style="display: flex; gap: 8px;">
                    <button class="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full border-none transition-all focus:outline-none" title="Editar" (click)="editarFormulario(form)" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 50%; cursor: pointer; color: #475569;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full border-none transition-all focus:outline-none" title="Eliminar a papelera" (click)="eliminarFormulario(form)" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #ef4444; border-radius: 50%; cursor: pointer;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                  </div>
                </div>

                <div class="card-actions" *ngIf="vistaActual === 'papelera'">
                  <button class="action-circle text-teal" title="Restaurar Formulario" (click)="restaurarFormulario(form)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.64A9 9 0 0 1 3.51 15"></path></svg></button>
                  <div class="spacer" style="flex:1"></div>
                  <button class="action-circle text-red" title="Eliminar Definitivamente" (click)="eliminarDefinitivo(form)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- VISTA DE CONSTRUCTOR (FORM BUILDER) -->
        <div *ngIf="vistaActual === 'constructor'" class="vista-container builder-view">
          
          <div class="builder-header" *ngIf="!wizardMode">
            <div>
              <h1 class="page-title">Diseñador de Formulario</h1>
              <p class="page-desc">Arrastra los campos necesarios para solicitar información al candidato.</p>
            </div>
            <div class="builder-actions">
              <button class="btn-cancelar" (click)="vistaActual = 'galeria'">Cancelar</button>
              <button class="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar Formulario
              </button>
            </div>
          </div>

          <div class="builder-layout">
            
            <!-- Columna Izquierda: Toolbox -->
            <aside class="toolbox">
              <h3 class="toolbox-title">Bloques Disponibles</h3>
              <p class="toolbox-desc">Haz clic o arrastra para añadir</p>
              
              <div class="tools-list">
                <button class="tool-btn" (click)="agregarCampo('Nombre completo')">
                  <span class="tool-icon">A</span>
                  Nombre completo
                </button>
                <button class="tool-btn" (click)="agregarCampo('Correo electrónico')">
                  <span class="tool-icon">📧</span>
                  Correo electrónico
                </button>
                <button class="tool-btn" (click)="agregarCampo('Número celular')">
                  <span class="tool-icon">📱</span>
                  Número celular
                </button>
                <button class="tool-btn" (click)="agregarCampo('Edad')">
                  <span class="tool-icon">🎂</span>
                  Edad
                </button>
                <button class="tool-btn" (click)="agregarCampo('Ocupación')">
                  <span class="tool-icon">💼</span>
                  Ocupación
                </button>
                <button class="tool-btn" (click)="agregarCampo('Nivel de estudios')">
                  <span class="tool-icon">📚</span>
                  Nivel de estudios
                </button>
                <button class="tool-btn" (click)="agregarCampo('Estado civil')">
                  <span class="tool-icon">💍</span>
                  Estado civil
                </button>
                <button class="tool-btn" (click)="agregarCampo('Género')">
                  <span class="tool-icon">🚻</span>
                  Género
                </button>
                <button class="tool-btn" (click)="agregarCampo('Ciudad de vivienda')">
                  <span class="tool-icon">🏙️</span>
                  Ciudad de vivienda
                </button>
                <button class="tool-btn" (click)="agregarCampo('País')">
                  <span class="tool-icon">🌍</span>
                  País
                </button>
                <button class="tool-btn" (click)="agregarCampo('Respuesta sí o no')">
                  <span class="tool-icon">✓</span>
                  Respuesta sí o no
                </button>
                <button class="tool-btn dashed-tool" (click)="agregarCampoPersonalizado()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Agregar otro dato
                </button>
              </div>
            </aside>

            <!-- Columna Derecha: Canvas / Vista Previa -->
            <section class="canvas-area">
              <div class="canvas-placeholder" *ngIf="camposLienzo.length === 0">
                <div class="placeholder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                </div>
                <h3>Lienzo Vacío</h3>
                <p>Arrastra o selecciona campos desde el panel izquierdo<br>para empezar a armar tu formulario.</p>
              </div>

              <!-- CONTENIDO DINÁMICO DEL LIENZO -->
              <div class="canvas-content" *ngIf="camposLienzo.length > 0" style="width: 100%;">
                <div class="canvas-header" style="margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">
                  <h2 style="font-size: 22px; color: #1e293b; margin: 0;">Vista Previa del Formulario</h2>
                  <p style="font-size: 14px; color: #64748b; margin: 5px 0 0 0;">Así lo verán los candidatos al ser evaluados.</p>
                </div>
                
                <div class="canvas-fields-list" style="display: flex; flex-direction: column; gap: 15px;">
                  <div class="canvas-field-box" *ngFor="let campo of camposLienzo; let i = index" style="background: white; border: 1px solid #cbd5e1; padding: 18px 24px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px rgba(0,0,0,0.02); transition: all 0.2s;">
                    <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1;">
                      <ng-container *ngIf="campo.etiqueta !== 'Respuesta sí o no' && !campo.editable">
                        <label style="font-size: 15px; font-weight: 600; color: #334155;">{{ campo.etiqueta }}</label>
                        <input type="text" [placeholder]="'Escribe tu ' + campo.etiqueta.toLowerCase()" disabled style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 18px; border-radius: 8px; font-size: 14px; color: #94a3b8; outline: none; width: 100%; max-width: 400px; cursor: not-allowed;">
                      </ng-container>
                      <ng-container *ngIf="campo.editable">
                        <input type="text" [(ngModel)]="campo.etiqueta" placeholder="Nombre del campo" 
                          style="font-size: 15px; font-weight: 600; color: #334155; border: 1px dashed var(--accent); background: #eff6ff; padding: 8px 14px; border-radius: 8px; outline: none; width: 100%; max-width: 300px;"
                          (blur)="campo.editable = campo.etiqueta.trim() === '' ? true : false"
                          (keydown.enter)="campo.editable = false">
                        <input type="text" [placeholder]="'Escribe tu ' + (campo.etiqueta || 'dato').toLowerCase()" disabled style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 18px; border-radius: 8px; font-size: 14px; color: #94a3b8; outline: none; width: 100%; max-width: 400px; cursor: not-allowed; margin-top: 4px;">
                      </ng-container>
                      <ng-container *ngIf="campo.etiqueta === 'Respuesta sí o no'">
                        <label style="font-size: 15px; font-weight: 600; color: #334155;">Respuesta Sí / No</label>
                        <div style="display: flex; gap: 15px; margin-top: 5px;">
                          <label style="display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 14px; cursor: not-allowed;"><input type="radio" disabled> Sí</label>
                          <label style="display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 14px; cursor: not-allowed;"><input type="radio" disabled> No</label>
                        </div>
                      </ng-container>
                    </div>
                    <button class="btn-eliminar-campo" (click)="eliminarCampo(i)" style="background: #fee2e2; border: none; color: #ef4444; margin-left: 20px; cursor: pointer; padding: 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Eliminar campo">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

      </main>

      <!-- Modal Vincular a Test -->
      <div class="modal-overlay" *ngIf="mostrandoModalVincular">
        <div class="modal-content side-panel">
          <div class="modal-header">
            <h2 class="modal-title">Vincular a Test</h2>
            <button type="button" class="close-btn" (click)="cerrarModalVincular()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-texto-suave); margin-top: 0;">Selecciona el test al que deseas vincular el formulario <strong>{{ formularioSeleccionado?.nombre }}</strong>.</p>
            
            <div class="form-group" style="margin-top: 30px;">
              <label>Seleccionar Test Destino:</label>
              <select class="form-input" [(ngModel)]="testParaVincular">
                <option [value]="null">Elige un Test...</option>
                <option *ngFor="let t of testsLocales" [value]="t.id">{{ t.title }}</option>
              </select>
            </div>

            <div class="modal-actions" style="margin-top: auto; padding-top: 40px; display: flex; gap: 15px; justify-content: flex-end;">
              <button class="btn-cancelar" (click)="cerrarModalVincular()">Cancelar</button>
              <button class="btn-guardar" [disabled]="!testParaVincular" (click)="guardarVinculacion()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Asignar Formulario
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    
    .test-layout-wrapper {
      display: flex;
      flex-direction: row;
      min-height: calc(100vh - 70px);
      width: 100%;
      background-color: transparent;
      padding-top: 20px;
      gap: 40px;
      
    }

    /* Columna Izquierda (Panel de Control) */
    .control-panel {
      width: 320px;
      flex-shrink: 0;
    }

    .control-card {
      background-color: #ffffff;
      border-radius: 24px;
      padding: 40px 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
      text-align: left;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 40px;
    }

    .panel-title {
      
      font-size: 42px;
      color: #2b3a4a;
      font-weight: 800;
      line-height: 1.1;
      margin: 0 0 15px 0;
    }

    .panel-desc {
      font-size: 15px;
      color: #798d9f;
      line-height: 1.5;
      margin: 0 0 40px 0;
    }

    .btn-pill-blue {
      width: 100%;
      padding: 18px 20px;
      background-color: var(--accent);
      color: #ffffff;
      border-radius: 50px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
      margin-bottom: 12px;
    }

    .btn-pill-blue:hover {
      background-color: #5024c4;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.35);
    }

    .btn-sec-gray {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 16px 20px;
      background-color: transparent;
      color: var(--color-texto-suave);
      border: 1px solid #e2e8f0;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-sec-gray:hover {
      background-color: #f8fafc;
      color: var(--color-secundario);
      border-color: #cbd5e1;
    }

    .btn-sec-gray svg {
      width: 18px;
      height: 18px;
    }

    /* Columna Derecha */
    .main-content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .vista-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Buscador y Toggles Arriba */
    .search-and-toggles {
      position: relative;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .search-bar-container {
      flex: 1;
      display: flex;
      align-items: center;
      position: relative;
    }

    .search-input {
      width: 100%;
      background-color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 18px 60px 18px 30px;
      font-size: 16px;
      
      color: #2b3a4a;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.03);
      outline: none;
      transition: box-shadow 0.3s ease;
    }

    .search-input:focus {
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    }

    .search-input::placeholder {
      color: #aeb9c3;
    }

    .search-btn {
      position: absolute;
      right: 15px;
      background: #2b3a4a;
      border: none;
      color: #ffffff;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .search-btn:hover {
      background: var(--accent);
      transform: scale(1.05);
    }

    .search-btn svg {
      width: 18px;
      height: 18px;
    }

    .view-toggles {
      display: flex;
      background-color: #ffffff;
      border-radius: 50px;
      padding: 8px;
      gap: 4px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.03);
    }

    .toggle-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      color: var(--accent);
      background-color: #f1f5f9;
    }

    .toggle-btn.activo {
      background-color: var(--accent);
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
    }

    .toggle-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Galería Cards (Tests Grid Style) */
    .tests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      padding-bottom: 40px;
    }

    .test-card {
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), 0 2px 5px rgba(0, 0, 0, 0.02);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .test-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.06);
    }

    .card-banner {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .bg-teal { background: linear-gradient(135deg, var(--accent), #00d592); }
    .bg-blue { background: linear-gradient(135deg, #5024c4, var(--accent)); }
    .bg-navy { background: linear-gradient(135deg, #1e293b, #475569); }
    .bg-orange { background: linear-gradient(135deg, #f97316, #fb923c); }
    
    .banner-icon {
      width: 44px;
      height: 44px;
      color: rgba(255, 255, 255, 0.9);
      z-index: 1;
    }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .card-title {
      font-size: 1rem;
      color: var(--color-secundario);
      margin: 0 0 10px 0;
      font-weight: 700;
      line-height: 1.3;
    }

    .form-desc {
      font-size: 14px;
      color: var(--color-texto-suave);
      margin: 0 0 15px 0;
      line-height: 1.4;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 25px;
    }
    .tag {
      font-size: 11px;
      background: #f1f5f9;
      color: var(--color-texto-suave);
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
    }

    .card-actions {
      margin-top: auto;
      display: flex;
      align-items: center;
      padding-top: 15px;
      border-top: 1px solid #f1f5f9;
      gap: 10px;
    }

    .action-circle {
      background: #f8fafc;
      border: none;
      width: 38px; height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--color-texto-suave);
      transition: all 0.2s;
    }
    .action-circle:hover { background: #e2e8f0; }
    .action-circle svg { width: 16px; height: 16px; }

    .text-blue:hover { color: var(--accent); background: #e0f2fe; }
    .text-red:hover { color: #ef4444; background: #fee2e2; }
    .text-teal:hover { color: var(--color-primario); background: #ccfbf1; }

    .deleted-msg {
      font-size: 12px;
      color: #f97316;
      background: #fff7ed;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: 10px;
      font-weight: 600;
      text-align: center;
    }

    /* Builder View Adjustments to work with new layout */
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    
    .builder-actions {
      display: flex;
      gap: 15px;
    }
    
    .page-title {
      
      font-size: 34px;
      color: var(--color-secundario);
      margin: 0 0 8px 0;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .page-desc {
      color: var(--color-texto-suave);
      font-size: 15px;
      margin: 0;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: var(--accent);
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.25);
      transition: all 0.2s ease;
    }
    
    .btn-cancelar {
      background: transparent;
      color: var(--color-texto-suave);
      border: 1px solid #cbd5e1;
      padding: 14px 24px;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    /* Builder View */
    .builder-layout {
      display: flex;
      gap: 30px;
      flex: 1;
      height: 100%;
    }

    .toolbox {
      width: 320px;
      background: #fff;
      border-radius: 24px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
      flex-shrink: 0;
    }

    .toolbox-title {
      font-size: 18px;
      margin: 0 0 5px 0;
      color: var(--color-secundario);
    }
    .toolbox-desc {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 25px 0;
    }

    .tools-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 55vh;
      overflow-y: auto;
      padding-right: 5px;
    }

    /* Custom Scrollbar for Toolbox */
    .tools-list::-webkit-scrollbar {
      width: 4px;
    }
    .tools-list::-webkit-scrollbar-track {
      background: #f1f5f9; 
    }
    .tools-list::-webkit-scrollbar-thumb {
      background: #cbd5e1; 
      border-radius: 4px;
    }
    .tools-list::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; 
    }

    .tool-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--color-texto-principal);
      text-align: left;
      cursor: grab;
      transition: all 0.2s;
    }
    .tool-btn:hover {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      transform: translateY(-2px);
    }
    .tool-btn:active { cursor: grabbing; }

    .tool-icon {
      background: #e2e8f0;
      color: var(--color-texto-suave);
      width: 28px; height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
    }

    .dashed-tool {
      background: transparent;
      border: 2px dashed #cbd5e1;
      color: var(--color-texto-suave);
      justify-content: center;
      font-weight: 600;
    }
    .dashed-tool:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: var(--color-texto-principal);
    }
    .dashed-tool svg { width: 18px; height: 18px; }

    /* Canvas / Lienzo */
    .canvas-area {
      flex: 1;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 40px;
      overflow-y: auto;
    }

    .canvas-placeholder {
      margin-top: auto;
      margin-bottom: auto;
      text-align: center;
      color: #94a3b8;
    }
    .placeholder-icon {
      width: 80px; height: 80px;
      background: #fff;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.04);
      color: #cbd5e1;
    }
    .placeholder-icon svg { width: 40px; height: 40px; }
    .canvas-placeholder h3 {
      color: var(--color-texto-suave);
      font-size: 20px;
      margin: 0 0 10px 0;
    }
    .canvas-placeholder p {
      font-size: 15px;
      line-height: 1.5;
      margin: 0;
    }

    /* Modal / Side Panel Styles */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.4);
      display: flex;
      justify-content: flex-end;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .side-panel {
      width: 450px;
      max-width: 100%;
      background: #ffffff;
      height: 100vh;
      box-shadow: -10px 0 40px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.3s forwards ease-out;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .modal-header {
      padding: 30px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title {
      margin: 0;
      font-size: 24px;
      
      color: var(--color-secundario);
    }
    .close-btn {
      background: none; border: none; font-size: 28px; line-height: 1; color: #94a3b8; cursor: pointer; transition: color 0.2s;
    }
    .close-btn:hover { color: #f43f5e; }
    .modal-body {
      padding: 30px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-texto-suave);
      margin-bottom: 8px;
    }
    .form-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      font-size: 15px;
      font-family: inherit;
      color: var(--color-secundario);
      transition: all 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .btn-cancelar {
      padding: 12px 20px;
      background: #f1f5f9;
      color: var(--color-texto-suave);
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancelar:hover { background: #e2e8f0; color: var(--color-secundario); }
    .btn-guardar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
      transition: all 0.2s;
    }
    .btn-guardar:hover { background: #5024c4; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.35); }
    .btn-guardar:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; transform: none; }
  `]
})
export class AdminFormulariosComponent implements OnInit {

  @Input() wizardMode: boolean = false;
  vistaActual: 'galeria' | 'constructor' | 'papelera' = 'galeria';

  // Formularios simulados para la galería
  formulariosMock = [
    {
      id: 1,
      nombre: 'Formulario Básico',
      descripcion: 'Recopila los datos mínimos y esenciales para contactar e identificar rápidamente al candidato.',
      campos: ['Nombre', 'Correo', 'Teléfono'],
      isDeleted: false,
      deletedAt: null as Date | null
    },
    {
      id: 2,
      nombre: 'Datos Demográficos Compuestos',
      descripcion: 'Permite un perfilamiento mucho más profundo incluyendo residencia, estudios y trayectoria profesional.',
      campos: ['Nombre', 'Correo', 'Edad', 'Ciudad', 'Ocupación'],
      isDeleted: false,
      deletedAt: null
    },
    {
      id: 3,
      nombre: 'Test de Clima Organizacional',
      descripcion: 'Encuesta anónima para conocer la percepción actual del ambiente laboral interno.',
      campos: ['Departamento', 'Años antigüedad', 'Satisfacción'],
      isDeleted: false,
      deletedAt: null
    }
  ];

  testsLocales: TestItem[] = [];
  mostrandoModalVincular: boolean = false;
  formularioSeleccionado: any = null;
  testParaVincular: string | null = null;
  camposLienzo: { etiqueta: string; editable?: boolean }[] = [];

  constructor(private testsService: TestsDataService) { }

  ngOnInit(): void {
    if (this.wizardMode) {
      this.vistaActual = 'constructor';
      // Pre-cargar campos básicos en wizard mode
      if (this.camposLienzo.length === 0) {
        this.camposLienzo = [
          { etiqueta: 'Nombre completo' },
          { etiqueta: 'Correo electrónico' },
          { etiqueta: 'Número celular' }
        ];
      }
    }

    this.testsService.fetchTests();
    this.testsService.tests$.subscribe(data => {
      this.testsLocales = data;
    });
  }

  adminFormulariosVisual() {
    if (this.vistaActual === 'papelera') {
      return this.formulariosMock.filter(f => f.isDeleted);
    } else {
      return this.formulariosMock.filter(f => !f.isDeleted);
    }
  }

  editarFormulario(form: any) {
    this.vistaActual = 'constructor';
    // Se puede precargar la informacion del formulario aqui mas adelante
  }

  vincularTest(form: any) {
    this.formularioSeleccionado = form;
    this.testParaVincular = null;
    this.mostrandoModalVincular = true;
  }

  cerrarModalVincular() {
    this.mostrandoModalVincular = false;
    this.formularioSeleccionado = null;
    this.testParaVincular = null;
  }

  guardarVinculacion() {
    if (!this.testParaVincular || !this.formularioSeleccionado) return;

    // Obtenemos el prefijo que usamos internamente, o el ID mock.
    // Ej: form_basico o test_. Depende de cómo quieras guardarlo.
    let formId = 'form_basico';
    if (this.formularioSeleccionado.id === 2) formId = 'form_demograficos';
    if (this.formularioSeleccionado.id === 3) formId = 'form_clima';

    const testTarget = this.testsLocales.find(t => t.id === this.testParaVincular);

    this.testsService.actualizarTest(this.testParaVincular, { formularioCaptura: formId }).subscribe({
      next: (res) => {
        alert(`¡Éxito! El formulario se vinculó correctamente al test "${testTarget?.title || 'Seleccionado'}".`);
        this.testsService.fetchTests(); // Recargar pruebas si es necesario para reflejar cambios.
        this.cerrarModalVincular();
      },
      error: (err: any) => {
        // Fallback optimista si no hay backend activo
        alert(`Vinculado en modo offline al test: ${testTarget?.title || 'Seleccionado'}.`);
        this.cerrarModalVincular();
      }
    });
  }

  eliminarFormulario(form: any) {
    if (confirm(`¿Estás seguro de que deseas enviar la plantilla "${form.nombre}" a la papelera?`)) {
      form.isDeleted = true;
      form.deletedAt = new Date();
      alert('Formulario movido a la papelera.');
    }
  }

  restaurarFormulario(form: any) {
    form.isDeleted = false;
    form.deletedAt = null;
    alert('Formulario restaurado con éxito.');
  }

  eliminarDefinitivo(form: any) {
    if (confirm('Atención: Esta acción es irreversible. ¿Deseas eliminar permanentemente este formulario?')) {
      const idx = this.formulariosMock.findIndex(f => f.id === form.id);
      if (idx > -1) {
        this.formulariosMock.splice(idx, 1);
        alert('Formulario eliminado de la base de datos.');
      }
    }
  }

  getDaysLeft(deletedAt: Date | null): number {
    if (!deletedAt) return 30;
    const diffTime = Math.abs(new Date().getTime() - deletedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  }

  // --- LOGICA DE CONSTRUCTOR DE FORMULARIO (WIZARD O DIRECTO) ---

  agregarCampo(etiqueta: string) {
    this.camposLienzo.push({ etiqueta });
  }

  agregarCampoPersonalizado() {
    this.camposLienzo.push({ etiqueta: '', editable: true });
    // Focus goes to the input automatically via Angular rendering
  }

  eliminarCampo(index: number) {
    this.camposLienzo.splice(index, 1);
  }

}
