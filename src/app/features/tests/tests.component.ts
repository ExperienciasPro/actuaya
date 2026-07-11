import { Component, OnInit, HostListener, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TestsDataService, TestItem } from '../../shared/tests-data.service';
// jsPDF is loaded dynamically via import() in descargarPDF to reduce initial bundle size
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-tests',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule],
  template: `
<div class="test-layout-wrapper" style="padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
  
  <!-- Encabezado Estilo ActuaYa -->
  <header style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px;">
    <div>
       <h1 style="font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; letter-spacing: -0.02em;" [innerHTML]="mostrandoPapelera ? 'Papelera de Evaluaciones' : 'Gestión de Evaluaciones'"></h1>
       <p style="color: #64748b; margin: 0; font-size: 0.95rem;">
         <span *ngIf="!mostrandoPapelera">{{ testsActivos.length }} evaluación{{ testsActivos.length !== 1 ? 'es activas' : ' activa' }} · {{ testsEnPapelera.length }} en papelera</span>
         <span *ngIf="mostrandoPapelera">Las evaluaciones eliminadas se mantienen aquí por 30 días.</span>
       </p>
    </div>
    
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <!-- Filtros Avanzados -->
      <select *ngIf="!mostrandoPapelera" style="padding: 11px 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #475569; font-size: 14px; outline: none; cursor: pointer; font-weight: 500;">
        <option value="todos">Todos los usuarios</option>
      </select>

      <button *ngIf="!mostrandoPapelera" (click)="togglePapelera()" style="padding: 11px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Papelera
      </button>

      <button *ngIf="mostrandoPapelera" (click)="togglePapelera()" style="padding: 11px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
         Volver a evaluaciones
      </button>

      <button *ngIf="!mostrandoPapelera" routerLink="/admin-home/tests/wizard" style="padding: 11px 24px; background: var(--accent); color: white; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(108, 60, 233, 0.25); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(108, 60, 233, 0.35)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(108, 60, 233, 0.25)'">
        + Crear Evaluación
      </button>
    </div>
  </header>

  <!-- Contenedor Principal (Buscador y Tarjetas) -->
  <main style="display: flex; flex-direction: column; width: 100%;">
      
      <!-- Barra de Búsqueda y Toggles -->
      <div class="search-and-toggles">
      <div class="search-bar-container">
        <input type="text" class="search-input" placeholder="Búsqueda" [(ngModel)]="searchTerm">
        <button class="search-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      <div class="view-toggles">
        <button class="toggle-btn" [class.activo]="vistaActual === 'cuadricula'" (click)="cambiarVista('cuadricula')" title="Vista de Cuadrícula">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </button>
        <button class="toggle-btn" [class.activo]="vistaActual === 'lista'" (click)="cambiarVista('lista')" title="Vista de Lista">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </button>
      </div>
    </div> <!-- cierra search-and-toggles -->

    <!-- Grid de Tests -->
    <div class="tests-grid default-grid" cdkDropList (cdkDropListDropped)="drop($event)" [cdkDropListDisabled]="mostrandoPapelera" [class.modo-lista]="vistaActual === 'lista'">
      
      <div class="test-card" *ngFor="let test of (mostrandoPapelera ? testsEnPapelera : testsActivos); let i = index" cdkDrag [cdkDragDisabled]="mostrandoPapelera" [style.animation-delay]="(i * 60) + 'ms'">
        <div class="card-banner" [ngClass]="test.colorClass || 'bg-teal'" style="position: relative;">
          <!-- DRAG HANDLE -->
          <div class="drag-handle" cdkDragHandle title="Mover tarjeta" style="position: absolute; top: 10px; left: 10px; cursor: grab; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s ease; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
          </div>
          <svg class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          <div class="card-progress-bar" [ngClass]="(test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Publicado' ? 'progress-complete' : 'progress-draft'"></div>
        </div>
        <div class="card-body">
          <div class="info-test">
            <h4 class="instrument-card-title" style="margin-bottom: 8px;" title="{{ test.title }}">{{ test.title }}</h4>
            <span class="badge-estado" 
                  [ngClass]="{'badge-activo': (test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Publicado', 'badge-borrador': (test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Borrador', 'badge-desactivado': (test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Desactivado'}"
                  (click)="cycleEstado(test); $event.stopPropagation()"
                  title="Haz clic para cambiar de estado">
              <svg *ngIf="(test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Publicado'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <svg *ngIf="(test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Borrador'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <svg *ngIf="(test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Desactivado'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
              {{ (test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador')) === 'Publicado' ? 'ACTIVO' : ((test.estadoPublicacion || 'Borrador') === 'Borrador' ? 'BORRADOR' : 'DESACTIVADO') }}
            </span>

            <div class="autor-row" *ngIf="test.autor_nombre" style="margin-top: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="{{ test.autor_nombre }}">
                👤 <span style="font-size: 0.85rem; color: #777; font-weight: 500;">Creador: {{ test.autor_nombre }}</span>
            </div>
          </div>
          
          <p class="deleted-msg" *ngIf="mostrandoPapelera">Se eliminará definitivamente en {{ calculateDaysLeft(test.deletedAt) }} días</p>

          <div class="card-actions" style="display: flex; justify-content: flex-end; align-items: center; width: 100%; margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9;" *ngIf="!mostrandoPapelera">
            <!-- Botones de Acción -->
            <div style="display: flex; gap: 8px;">
                <!-- 1) Ir / Asignar -->
                <button style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: #475569; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#e2e8f0'" onmouseout="this.style.backgroundColor='#f8fafc'" title="Ir / Asignar" (click)="abrirPrevisualizacion(test.id, $event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                        <polyline points="13 17 18 12 13 7"></polyline>
                        <polyline points="6 17 11 12 6 7"></polyline>
                    </svg>
                </button>

                <!-- 2) Editar -->
                <button style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: var(--accent); border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#eee9ff'" onmouseout="this.style.backgroundColor='#f8fafc'" title="Editar" (click)="abrirModalEdicion(test); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>

                <!-- 3) Opciones Colaboradores -->
                <button *ngIf="esSuperAdmin || !test.creado_por_id || test.creado_por_id === currentUserId" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: var(--accent); border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#d1fae5'" onmouseout="this.style.backgroundColor='#f8fafc'" title="Asignar Colaborador" (click)="abrirModalColaborador(test); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                </button>

                <!-- 4) Compartir Link -->
                <button style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: var(--accent); border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#ede9fe'" onmouseout="this.style.backgroundColor='#f8fafc'" title="Compartir enlace" (click)="compartirInstrumento('test', test.id, test.title); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>

                <!-- 5) Eliminar -->
                <button *ngIf="esSuperAdmin || !test.creado_por_id || test.creado_por_id === currentUserId" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: #ef4444; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='#f8fafc'" title="Eliminar" (click)="softDelete(test); $event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
          </div>

          <div class="card-actions" *ngIf="mostrandoPapelera">
            <!-- Restore -->
            <button class="action-circle text-teal" (click)="restore(test)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.64A9 9 0 0 1 3.51 15"></path></svg></button>
            <div class="spacer"></div>
            <!-- Hard Delete -->
            <button class="action-circle text-red" (click)="hardDelete(test)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div>
        </div>
      </div> <!-- cierra test-card (ngFor) -->
    </div> <!-- cierra tests-grid -->

    <!-- EMPTY STATE PREMIUM: Tests -->
    <div *ngIf="(mostrandoPapelera ? testsEnPapelera : testsActivos).length === 0" style="
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 30px; text-align: center;
      background: linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(var(--accent-rgb, 20, 184, 166), 0.05) 100%);
      border: 2px dashed #cbd5e1; border-radius: 20px; margin-top: 8px;
      animation: emptyFadeIn 0.6s ease-out;">

      <!-- Ilustración SVG contextual -->
      <div style="width: 140px; height: 140px; margin-bottom: 24px; position: relative;">
        <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Círculo de fondo -->
          <circle cx="70" cy="70" r="65" fill="url(#emptyGrad1)" opacity="0.12"/>
          <circle cx="70" cy="70" r="45" fill="url(#emptyGrad1)" opacity="0.08"/>
          <!-- Clipboard/Test -->
          <rect x="42" y="28" width="56" height="72" rx="8" stroke="var(--accent)" stroke-width="2.5" fill="white" opacity="0.9"/>
          <rect x="55" y="20" width="30" height="16" rx="4" stroke="var(--accent)" stroke-width="2" fill="#eee9ff"/>
          <circle cx="70" cy="28" r="3" fill="var(--accent)"/>
          <!-- Líneas de texto -->
          <rect x="52" y="48" width="36" height="4" rx="2" fill="#93c5fd"/>
          <rect x="52" y="58" width="28" height="4" rx="2" fill="#bfdbfe"/>
          <rect x="52" y="68" width="32" height="4" rx="2" fill="#93c5fd"/>
          <rect x="52" y="78" width="20" height="4" rx="2" fill="#bfdbfe"/>
          <!-- Checkmark -->
          <circle cx="100" cy="82" r="16" fill="#00d592" opacity="0.15"/>
          <circle cx="100" cy="82" r="11" fill="#00d592"/>
          <path d="M95 82l3 3 7-7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="emptyGrad1" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
              <stop stop-color="var(--accent)"/>
              <stop offset="1" stop-color="#00d592"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #1e293b;" *ngIf="!mostrandoPapelera">
        Crea tu primera evaluación
      </h3>
      <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #1e293b;" *ngIf="mostrandoPapelera">
        Papelera vacía
      </h3>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #64748b; max-width: 400px; line-height: 1.6;" *ngIf="!mostrandoPapelera">
        Diseña instrumentos de evaluación profesionales con nuestro constructor visual inteligente.
      </p>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #64748b; max-width: 400px; line-height: 1.6;" *ngIf="mostrandoPapelera">
        No hay evaluaciones eliminadas. Las evaluaciones que muevas a la papelera aparecerán aquí.
      </p>

      <!-- Feature bullets -->
      <div *ngIf="!mostrandoPapelera" style="display: flex; gap: 24px; margin-bottom: 28px; flex-wrap: wrap; justify-content: center;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="var(--accent)" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Constructor drag & drop
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="#00d592" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Exporta a PDF y CSV
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500;">
          <svg viewBox="0 0 20 20" fill="var(--accent)" style="width: 18px; height: 18px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Vista previa en tiempo real
        </div>
      </div>

      <button *ngIf="!mostrandoPapelera" (click)="abrirModalCreacion()" style="
        padding: 14px 32px; background: linear-gradient(135deg, var(--accent), #00d592);
        color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
        cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(59,130,246,0.3);"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(59,130,246,0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(59,130,246,0.3)'">
        + Crear mi primera evaluación
      </button>
    </div>
</main>
</div> <!-- Cierra test-layout-wrapper -->

  <!-- Modal de Creación / Edición (Side Panel) -->
  <!-- Modal de Creación / Edición (Side Panel) (Desactivado ya que usamos Router) -->
  <div class="modal-overlay" *ngIf="mostrandoFormulario">
    <div class="modal-content side-panel" [class.slide-in]="mostrandoFormulario">
      <div class="modal-header">
        <h2 class="modal-title">{{ modoEdicion ? 'Editar Evaluación' : 'Configurar' }}</h2>
        <button type="button" class="close-btn" (click)="cerrarModal()">&times;</button>
      </div>
      <div class="modal-body">
        <!-- El form fue migrado a AdminPruebasAddComponent y el TestWizard -->
        <p>Utiliza la pestaña principal de navegación</p>
      </div>
    </div>
  </div>

  <!-- MODAL DE COMPARTIR CON COLABORADORES -->
  <div *ngIf="mostrandoModalColaborador" (click)="cerrarModalColaborador()"
    style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center;">
    <div (click)="$event.stopPropagation()"
      style="background: white; border-radius: 16px; width: 480px; max-width: 92vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: fadeInUp 0.25s ease-out;">

      <div style="padding: 24px 28px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px;">
            <span style="color: var(--accent);">🤝</span> Asignar Colaborador
          </h3>
          <button (click)="cerrarModalColaborador()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
        </div>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
          Selecciona un suscriptor para otorgarle acceso a <strong>{{testSeleccionadoParaCompartir?.title}}</strong>. Podrá editarlo y ver resultados, pero no eliminarlo.
        </p>
      </div>

      <div style="padding: 20px 28px;">
        <!-- Buscador -->
        <div style="position: relative; margin-bottom: 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="width: 18px; height: 18px; position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" [(ngModel)]="busquedaColaborador" placeholder="Buscar por nombre o correo..." style="width: 100%; padding: 11px 14px 11px 40px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; color: #334155; outline: none; transition: border 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#e2e8f0'" />
        </div>

        <!-- Lista filtrada -->
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px;">
          <div *ngIf="filteredGestores.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No se encontraron suscriptores.</div>
          <div *ngFor="let g of filteredGestores"
            (click)="nuevoColaborador = g._id || g.id"
            [style.background]="nuevoColaborador === (g._id || g.id) ? '#ecfdf5' : 'white'"
            [style.border-left]="nuevoColaborador === (g._id || g.id) ? '3px solid var(--accent)' : '3px solid transparent'"
            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; transition: all 0.15s; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
              <span style="font-size: 13px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ g.nombre }}</span>
              <span style="font-size: 11px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ g.email }} · {{ g.rol }}</span>
            </div>
            <svg *ngIf="nuevoColaborador === (g._id || g.id)" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3" style="width: 18px; height: 18px; flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>

        <!-- Colaboradores actuales -->
        <div *ngIf="testSeleccionadoParaCompartir && testSeleccionadoParaCompartir.colaboradores && testSeleccionadoParaCompartir.colaboradores.length > 0" style="margin-bottom: 16px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #475569; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.04em;">Colaboradores Actuales</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div *ngFor="let c of testSeleccionadoParaCompartir.colaboradores" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div>
                <span style="font-size: 13px; font-weight: 600; color: #1e293b;">{{ c.usuarioId?.nombre || 'Suscriptor' }}</span>
                <span style="font-size: 11px; color: #64748b; display: block;">Permiso: {{ c.permiso || 'editar' }}</span>
              </div>
              <button (click)="removerColaborador(c.usuarioId?._id || c.usuarioId)" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer;">Revocar</button>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 16px 28px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
        <button (click)="cerrarModalColaborador()" style="padding: 10px 20px; background: transparent; border: 1px solid #cbd5e1; border-radius: 8px; color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px;">Cancelar</button>
        <button (click)="asignarColaborador()" [disabled]="!nuevoColaborador" [style.opacity]="!nuevoColaborador ? '0.5' : '1'" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-size: 14px;">Asignar Acceso</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    /* Layout Principal */
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
      color: #2b3a4a; /* Dark Slate Navy */
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
      background-color: var(--accent); /* Azul Cerúleo */
      color: #ffffff;
      border-radius: 50px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
    }

    .btn-pill-blue:hover {
      background-color: #5024c4;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.35);
    }



    /* Columna Derecha (Buscador y Tarjetas) */
    .main-content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Contenedor Flex Superior Búsqueda +  Toggles */
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
      transition: transform 0.2s ease;
    }

    .search-btn:hover {
      transform: scale(1.05);
    }

    .search-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Toggles (Lista/Cuadricula) */
    .view-toggles {
      display: flex;
      gap: 8px;
      background-color: #ffffff;
      padding: 10px 15px;
      border-radius: 50px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.03);
    }

    .toggle-btn {
      background: transparent;
      border: none;
      color: #aeb9c3;
      padding: 8px 12px;
      border-radius: 50px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .toggle-btn:hover { color: #2b3a4a; background-color: #f8fafc; }

    .toggle-btn.activo {
      background-color: #eef2ff;
      color: var(--accent);
    }

    .toggle-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Grid de Tests */
    .tests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      padding-bottom: 40px;
      min-height: 200px;
    }

    /* 1. MATAR EL GRID: Forzar al contenedor a ser una columna vertical */
    .tests-grid.modo-lista {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      gap: 12px !important;
    }

    /* Estilos del Drag & Drop (Live Sorting UX) */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      opacity: 0.95;
      cursor: grabbing !important;
    }

    /* Respetar el borde de la vista padre en la previsualización */
    .cdk-drag-preview.modo-lista {
      border-radius: 16px;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 2px dashed #ccc;
      background: #f8fafc;
      border-radius: 24px;
      min-height: 200px; /* Conserve dimensions to push elements */
    }

    /* Adaptar placeholder a la altura de la fila cuando es modo lista */
    .tests-grid.modo-lista .cdk-drag-placeholder {
      min-height: 72px; /* Altura de la tarjeta en lista */
      border-radius: 16px;
      padding: 0;
    }

    /* Anima la caja cuando la sueltas para que caiga suave en su lugar */
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1) !important;
    }

    /* ¡CRÍTICO! Anima a todas las DEMÁS cajas para que se aparten mientras arrastras */
    .cdk-drop-list-dragging .test-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1) !important;
    }

    @keyframes cardSlideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .test-card {
      min-width: 200px;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03), 0 2px 4px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      animation: cardSlideIn 0.5s ease-out both;
    }

    .test-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.06), 0 5px 10px rgba(0, 0, 0, 0.03);
    }

    .test-card:hover .drag-handle {
      opacity: 0.5 !important;
    }

    .card-banner {
      height: 100px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      /* bordes se heredan por el overflow: hidden del padre */
    }

    .banner-icon {
      width: 44px;
      height: 44px;
      color: #ffffff;
      opacity: 0.9;
    }

    /* Paleta de colores para banners (degradados visibles) */
    .bg-blue { background: linear-gradient(135deg, #5024c4, var(--accent)); }
    .bg-navy { background: linear-gradient(135deg, #1e293b, #475569); }
    .bg-teal { background: linear-gradient(135deg, var(--accent), #00d592); }
    .bg-orange { background: linear-gradient(135deg, #dc2626, #f97316); }
    .bg-gray { background: linear-gradient(135deg, #64748b, #cbd5e1); }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .instrument-card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-secundario);
      margin: 0;
      line-height: 1.3;
    }

    .info-test {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      flex-grow: 1; /* Empuja los botones hacia abajo */
    }

    /* Estilos para el Badge de Estado */
    .badge-estado {
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .badge-estado:hover {
      opacity: 0.8;
      transform: scale(1.05);
    }
    .badge-activo { background-color: #e6f4ea; color: #1e8e3e; }
    .badge-borrador { background-color: #fef3c7; color: var(--accent); }
    .badge-desactivado { background-color: #f1f3f4; color: #5f6368; }
    .badge-inactivo { background-color: #f1f3f4; color: #5f6368; }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spacer {
      flex: 1; /* Separa los dos primeros iconos del tercero */
    }

    .action-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      background-color: #f0f4f8; /* Soft background */
      transition: all 0.2s ease;
    }

    .action-circle:hover {
      background-color: #e2e8f0;
      transform: scale(1.1);
    }

    .action-circle svg {
      width: 14px;
      height: 14px;
    }

    .text-blue { color: var(--accent); }
    .text-red { color: #f43f5e; }
    .text-gray { color: #798d9f; }
    .text-teal { color: var(--color-primario); }
    
    .action-circle.text-blue:hover { background-color: #eee9ff; }
    .action-circle.text-red:hover { background-color: #ffe4e6; }
    .action-circle.text-gray:hover { background-color: #cbd5e1; color: var(--color-texto-principal); }
    .action-circle.text-teal:hover { background-color: #ccfbf1; }

    .btn-sec-gray {
      margin-top: 15px;
      padding: 12px 18px;
      font-size: 15px;
      font-weight: 500;
      color: var(--color-texto-suave);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      width: 100%;
    }
    
    .btn-sec-gray:hover {
      background: #f1f5f9;
      color: var(--color-texto-principal);
    }
    
    .btn-sec-gray svg {
      width: 18px;
      height: 18px;
    }

    .deleted-msg {
      font-size: 13px;
      color: #f97316;
      margin-top: 8px;
      font-weight: 500;
      margin-bottom: 0px;
    }

    /* CSS ESTRICTO: Forzar contenedor horizontal y super compacto en Modo Lista */
    
    /* 2. LA TARJETA: Forzar renglón horizontal de ancho completo */
    .tests-grid.modo-lista .test-card {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      width: 100% !important; /* Ocupar todo el ancho disponible */
      height: 80px !important; /* Altura fija y delgada */
      min-height: 80px !important;
      max-height: 80px !important;
      padding: 0 20px !important;
      box-sizing: border-box !important;
      margin: 0 !important;
    }

    /* 3. BLOQUE DE COLOR (Icono izquierdo): Evitar que se estire */
    .tests-grid.modo-lista .card-banner {
      flex: 0 0 48px !important; /* No crecer, no encoger, fijo en 48px */
      width: 48px !important;
      height: 48px !important;
      margin-right: 20px !important;
      margin-bottom: 0 !important; /* Anular márgenes verticales */
      border-radius: 12px !important;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .tests-grid.modo-lista .card-banner .banner-icon {
      width: 24px;
      height: 24px;
    }

    /* 4. CONTENIDO (Título, badge y botones): Alinear horizontalmente */
    .tests-grid.modo-lista .card-body {
      display: flex !important;
      flex-direction: row !important;
      flex: 1 !important; /* Ocupar todo el espacio restante a la derecha */
      justify-content: space-between !important;
      align-items: center !important;
      height: 100% !important;
      padding: 0 !important;
    }

    .tests-grid.modo-lista .info-test {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-bottom: 0;
    }

    /* ========================================= */
    /* RESPONSIVE: Stack panel & cards on mobile */
    /* ========================================= */
    @media (max-width: 768px) {
      .test-layout-wrapper {
        flex-direction: column;
        padding: 20px;
        gap: 30px;
      }

      .control-panel {
        width: 100%;
      }
      
      .control-card {
        padding: 30px 20px;
        position: relative;
        top: 0;
      }

      .panel-title {
        font-size: 32px;
      }

      .search-and-toggles {
        flex-direction: column;
        align-items: stretch;
      }


      /* Forzar lista a verse como lista en responsive (desbordamiento overflow) */
      .tests-grid.modo-lista .test-card {
        padding-right: 10px;
      }
      .tests-grid.modo-lista .instrument-card-title {
        max-width: 150px;
      }
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
      transform: translateX(100%);
      animation: slideInRight 0.3s forwards ease-out;
    }

    @keyframes slideInRight {
      to { transform: translateX(0); }
    }

    @keyframes emptyFadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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
    }

    .form-group {
      margin-bottom: 24px;
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

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
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
    .btn-guardar:hover {
      background: #5024c4;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.35);
    }
    .btn-guardar svg { width: 18px; height: 18px; }
  `]
})
export class TestsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  tests: TestItem[] = [];
  mostrandoPapelera: boolean = false;
  vistaActual: 'cuadricula' | 'lista' = 'cuadricula';
  esSuperAdmin: boolean = false;
  currentUserId: string | null = null;

  // Modal / Edición Variables
  mostrandoFormulario = false;
  modoEdicion = false;
  testSeleccionadoId: string | null = null;
  nuevoTest: any = { title: '', description: '', type: '', formularioCaptura: '' };
  searchTerm: string = '';

  // Simulando servicio de formularios vinculados
  formulariosMock = [
    { id: 'form_basico', nombre: 'Formulario Básico' },
    { id: 'form_demograficos', nombre: 'Datos Demográficos Compuestos' },
    { id: 'form_clima', nombre: 'Test de Clima Organizacional' }
  ];

  private http = inject(HttpClient);
  private toastSvc = inject(ToastService);
  private confirmSvc = inject(ConfirmService);
  constructor(private testsService: TestsDataService, private router: Router) { }

  ngOnInit(): void {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      try {
        const user = JSON.parse(currentUserData);
        this.esSuperAdmin = (user.rol || '').toLowerCase().includes('super administrador');
        this.currentUserId = user.id || null;
      } catch (e) { }
    }

    this.testsService.fetchTests(); // Carga datos solo cuando el usuario navega aquí
    this.testsService.tests$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.tests = data;
    });
  }

  get testsActivos() {
    let result = this.tests.filter(t => !t.isDeleted);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.autor_nombre && t.autor_nombre.toLowerCase().includes(term))
      );
    }
    return result;
  }

  get testsEnPapelera() {
    let result = this.tests.filter(t => t.isDeleted);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.autor_nombre && t.autor_nombre.toLowerCase().includes(term))
      );
    }
    return result;
  }

  togglePapelera() {
    this.mostrandoPapelera = !this.mostrandoPapelera;
  }

  openDropdownId: string | null = null;

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event) {
    this.openDropdownId = null;
  }

  toggleDropdown(id: string, event: Event) {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  showToast(msg: string, type: string) {
    if (type === 'error') {
      this.toastSvc.error(msg);
    } else {
      this.toastSvc.success(msg);
    }
  }

  descargarCSV(id: string, event: Event) {
    event.stopPropagation();
    this.openDropdownId = null;
    this.showToast('Exportando CSV...', 'success');

    this.http.get(`/api/export/surveys/csv?surveyId=${id}`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultados_test_${id.substring(0, 8)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('CSV descargado exitosamente.', 'success');
      },
      error: (err: any) => {
        console.error('Error descargando CSV:', err);
        this.showToast('Error al exportar CSV. Verifica que existan respuestas.', 'error');
      }
    });
  }

  async descargarPDF(id: string, event: Event) {
    event.stopPropagation();
    this.openDropdownId = null;

    const test = this.tests.find(t => t.id === id);
    const titulo = test ? test.title : 'Evaluación';
    this.showToast('Generando PDF...', 'success');

    this.http.get(`/api/export/surveys/csv?surveyId=${id}`, { responseType: 'text' }).subscribe({
      next: async (csvText: string) => {
        try {
          const lines = csvText.split('\n').filter((l: string) => l.trim());
          if (lines.length <= 1) {
            this.showToast('No hay respuestas registradas para este test.', 'error');
            return;
          }

          const jsPDFMod = await import('jspdf') as any;
          const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default || jsPDFMod;
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(30, 41, 59);
          doc.text(`Resultados: ${titulo}`, 15, 20);

          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(0.8);
          doc.line(15, 25, 195, 25);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`Fecha: ${new Date().toLocaleDateString()}  |  Total respuestas: ${lines.length - 1}`, 15, 32);

          const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, '').trim());
          let yPos = 42;
          const pageHeight = 280;

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const cleanValues = values.map((v: string) => v.replace(/^"|"$/g, '').replace(/""/g, '"'));

            if (yPos > pageHeight - 20) { doc.addPage(); yPos = 20; }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text(`Respuesta #${i}`, 15, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);

            for (let j = 0; j < headers.length && j < cleanValues.length; j++) {
              if (yPos > pageHeight - 10) { doc.addPage(); yPos = 20; }
              const label = headers[j];
              let val = cleanValues[j] || '-';
              if (val.length > 80) val = val.substring(0, 77) + '...';

              doc.setFont('helvetica', 'bold');
              doc.text(`${label}:`, 18, yPos);
              doc.setFont('helvetica', 'normal');
              doc.text(val, 65, yPos);
              yPos += 5;
            }

            yPos += 4;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(15, yPos - 2, 195, yPos - 2);
          }

          const totalPages = (doc as any).internal.getNumberOfPages();
          for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Testea Engine | Pág ${p}/${totalPages}`, 105, 290, { align: 'center' });
          }

          doc.save(`Reporte_${titulo.replace(/\s+/g, '_')}_${id.substring(0, 8)}.pdf`);
          this.showToast('PDF generado exitosamente.', 'success');
        } catch (e) {
          console.error('Error generando PDF:', e);
          import('../../shared/utils/pdf.utils').then(m => {
            m.PdfUtils.descargarPDFSimulado(titulo, id);
          });
        }
      },
      error: (err: any) => {
        console.error('Error obteniendo datos para PDF:', err);
        import('../../shared/utils/pdf.utils').then(m => {
          m.PdfUtils.descargarPDFSimulado(titulo, id);
        });
      }
    });
  }

  cambiarVista(tipo: 'cuadricula' | 'lista') {
    this.vistaActual = tipo;
  }

  cycleEstado(test: TestItem) {
    if (this.mostrandoPapelera) return;

    const currentState = test.estadoPublicacion || (test.activo ? 'Publicado' : 'Borrador');
    const states = ['Publicado', 'Borrador', 'Desactivado'];
    const currentIdx = states.indexOf(currentState);
    const nuevoEstado = states[(currentIdx + 1) % states.length];

    const isMongoId = /^[a-fA-F0-9]{24}$/.test(test.id);

    const updatedTests = [...this.tests];
    const idx = updatedTests.findIndex(t => t.id === test.id);
    if (idx > -1) {
      updatedTests[idx] = { ...test, estadoPublicacion: nuevoEstado, activo: nuevoEstado === 'Publicado' } as any;
    }
    this.tests = updatedTests;
    this.testsService.updateTestsOrder(this.tests);

    if (isMongoId) {
      this.testsService.actualizarTest(test.id, { estadoPublicacion: nuevoEstado, activo: nuevoEstado === 'Publicado' }).subscribe();
    }
  }

  async softDelete(test: TestItem) {
    const ok = await this.confirmSvc.confirm({ title: '¿Mover a la papelera?', message: `El test "${test.title}" será movido a la papelera.`, confirmText: 'Mover a papelera', type: 'warning' });
    if (!ok) return;
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(test.id);
    const deletedAtDate = new Date();

    const updatedTests = [...this.tests];
    const idx = updatedTests.findIndex(t => t.id === test.id);
    if (idx > -1) {
      updatedTests[idx] = { ...test, isDeleted: true, deletedAt: deletedAtDate };
    }
    this.tests = updatedTests;
    this.testsService.updateTestsOrder(this.tests);
    this.toastSvc.success('Test movido a la papelera.');

    if (isMongoId) {
      this.testsService.actualizarTest(test.id, { isDeleted: true, deletedAt: deletedAtDate }).subscribe();
    }
  }

  restore(test: TestItem) {
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(test.id);
    const updatedTests = [...this.tests];
    const idx = updatedTests.findIndex(t => t.id === test.id);

    if (idx > -1) {
      updatedTests[idx] = { ...test, isDeleted: false, deletedAt: undefined };
    }
    this.tests = updatedTests;
    this.testsService.updateTestsOrder(this.tests);

    if (isMongoId) {
      this.testsService.actualizarTest(test.id, { isDeleted: false }).subscribe();
    }
  }

  async hardDelete(test: TestItem) {
    const ok = await this.confirmSvc.confirm({ title: 'Eliminación definitiva', message: `¿Estás seguro de eliminar "${test.title}" DEFINITIVAMENTE? Esta acción no se puede deshacer.`, confirmText: 'Eliminar para siempre', type: 'danger' });
    if (!ok) return;
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(test.id);

    const updatedTests = this.tests.filter(t => t.id !== test.id);
    this.tests = updatedTests;
    this.testsService.updateTestsOrder(this.tests);
    this.toastSvc.success('Test eliminado definitivamente.');

    this.testsService.eliminarTest(test.id).subscribe({
      next: () => {
        if (isMongoId) {
          this.testsService.fetchTests();
        }
      },
      error: (err) => {
        console.error('Error al eliminar test definitivamente', err);
        this.testsService.fetchTests();
      }
    });
  }

  calculateDaysLeft(deletedAt?: Date | string): number {
    if (!deletedAt) return 30;
    const dDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(dDate.getTime() + (30 * 24 * 60 * 60 * 1000) - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  drop(event: CdkDragDrop<TestItem[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const updatedTests = [...this.tests];
    moveItemInArray(updatedTests, event.previousIndex, event.currentIndex);

    // Actualizamos la referencia para Forzar el ciclo de detección de cambios de Angular
    this.tests = updatedTests;
    this.testsService.updateTestsOrder(updatedTests);
  }

  // --- MÉTODOS DE EDICIÓN Y CREACIÓN ---

  abrirModalEdicion(test: any) {
    this.router.navigate(['/admin-home/tests/wizard', { id: test.id }]);
  }

  abrirPrevisualizacion(id: string, ev?: Event) {
    if (ev) ev.stopPropagation();
    window.open(window.location.origin + '/test-access/' + id, '_blank');
  }

  compartirInstrumento(tipo: string, id: string, nombre?: string) {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/test-access/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      this.toastSvc.success(`Enlace copiado: ${nombre || 'Test'}`);
    }).catch(() => {
      prompt('Copia este enlace:', link);
    });
  }

  abrirModalCreacion() {
    this.modoEdicion = false;
    this.testSeleccionadoId = null;
    this.nuevoTest = { title: '', description: '', type: '', formularioCaptura: '' };
    this.mostrandoFormulario = true;
  }

  cerrarModal() {
    this.mostrandoFormulario = false;
    this.modoEdicion = false;
    this.testSeleccionadoId = null;
    this.nuevoTest = { title: '', description: '', type: '', formularioCaptura: '' };
  }

  guardarNuevoTest() {
    if (this.modoEdicion) {
      this.actualizarTest();
    } else {
      this.testsService.crearTest(this.nuevoTest).subscribe({
        next: (res) => {
          this.cerrarModal();
          this.testsService.fetchTests(); // Recarga la lista mágicamente sin refrescar la página
        },
        error: (err) => console.error('Error al crear test en el backend', err)
      });
    }
  }

  actualizarTest() {
    if (!this.testSeleccionadoId) return;
    this.testsService.actualizarTest(this.testSeleccionadoId, this.nuevoTest).subscribe({
      next: (res) => {
        this.cerrarModal();
        this.testsService.fetchTests(); // reload list
      },
      error: (err) => console.error('Error al actualizar test', err)
    });
  }

  async eliminarTest(test: any) {
    const ok = await this.confirmSvc.confirmDelete(test.title || 'este test');
    if (!ok) return;
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(test.id);

    const testsActualizados = this.tests.filter((t: any) => t.id !== test.id);
    this.tests = testsActualizados;
    this.testsService.updateTestsOrder(this.tests);
    this.toastSvc.success('Test eliminado correctamente.');

    this.testsService.eliminarTest(test.id).subscribe({
      next: () => {
        if (isMongoId) {
          this.testsService.fetchTests();
        }
      },
      error: (err) => {
        console.error('Error al eliminar test', err);
        this.testsService.fetchTests();
      }
    });
  }

  // --- GESTIÓN DE COLABORADORES ---
  mostrandoModalColaborador = false;
  testSeleccionadoParaCompartir: TestItem | null = null;
  gestoresCargados: any[] = [];
  nuevoColaborador: string = '';
  busquedaColaborador: string = '';

  get filteredGestores(): any[] {
    if (!this.busquedaColaborador || !this.busquedaColaborador.trim()) return this.gestoresCargados;
    const term = this.busquedaColaborador.toLowerCase();
    return this.gestoresCargados.filter((g: any) =>
      (g.nombre || '').toLowerCase().includes(term) ||
      (g.email || '').toLowerCase().includes(term)
    );
  }
  
  abrirModalColaborador(test: TestItem) {
    this.testSeleccionadoParaCompartir = test;
    this.mostrandoModalColaborador = true;
    this.nuevoColaborador = '';
    this.busquedaColaborador = '';
    
    // Cargar gestores para llenar el select (idealmente filtramos solo usuarios Finales u otros gestores)
    if (this.gestoresCargados.length === 0) {
        this.http.get('/api/gestores').subscribe({
            next: (res: any) => {
                if(res.status === 'ok') {
                    // Excluimos al usuario actual para evitar que se comparta consigo mismo
                    this.gestoresCargados = res.data.filter((g: any) => g.estado === 'Activo' && g._id !== this.currentUserId);
                }
            },
            error: (err) => {
                console.error('Error cargando gestores', err);
                this.toastSvc.error('No se pudo cargar la lista de suscriptores.');
            }
        });
    }
  }

  cerrarModalColaborador() {
      this.mostrandoModalColaborador = false;
      this.testSeleccionadoParaCompartir = null;
      this.nuevoColaborador = '';
  }

  asignarColaborador() {
      if (!this.testSeleccionadoParaCompartir || !this.nuevoColaborador) {
          this.toastSvc.error('Debe seleccionar un suscriptor para compartir.');
          return;
      }
      
      this.http.post(`/api/test/share/${this.testSeleccionadoParaCompartir.id}`, {
          usuarioId: this.nuevoColaborador,
          permiso: 'editar'
      }).subscribe({
          next: () => {
              this.toastSvc.success('Acceso concedido exitosamente.');
              this.testsService.fetchTests();
              this.cerrarModalColaborador();
          },
          error: (err) => {
              this.toastSvc.error('Hubo un error al conceder acceso.');
              console.error(err);
          }
      });
  }

  async removerColaborador(usuarioId: string) {
      if (!this.testSeleccionadoParaCompartir) return;
      
      const ok = await this.confirmSvc.confirmDelete('el acceso a este suscriptor');
      if (!ok) return;

      this.http.post(`/api/test/unshare/${this.testSeleccionadoParaCompartir.id}`, {
        usuarioId
      }).subscribe({
          next: () => {
              this.toastSvc.success('Acceso removido.');
              this.testsService.fetchTests();
              this.cerrarModalColaborador();
          },
          error: (err) => this.toastSvc.error('No se pudo quitar acceso.')
      });
  }
}
