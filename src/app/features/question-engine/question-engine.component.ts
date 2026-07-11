import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AssessmentStateService } from '../services/assessment-state.service';
import { LOGO_FULL } from '../../core/constants/logo.constants';

@Component({
  selector: 'app-question-engine',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
<div class="engine-wrapper" [ngClass]="{'wizard-mode': presentationMode === 'card'}" [style.--primary-survey-color]="themeColor">
  
  <!-- TOAST NOTIFICATION SUPERIOR -->
  <div *ngIf="toast.show" 
       style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; background: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; border-left: 4px solid;"
       [style.borderLeftColor]="toast.type === 'error' ? '#ef4444' : (toast.type === 'success' ? 'var(--accent)' : 'var(--accent)')"
       [style.animation]="toast.isFadingOut ? 'toastFadeOut 0.3s forwards' : 'toastFadeIn 0.3s forwards'">
      <style>
          @keyframes toastFadeIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
          @keyframes toastFadeOut { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -20px); } }
      </style>
      <div [style.color]="toast.type === 'error' ? '#ef4444' : (toast.type === 'success' ? 'var(--accent)' : 'var(--accent)')">
         <svg *ngIf="toast.type === 'error'"   viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
         <svg *ngIf="toast.type === 'success'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
         <svg *ngIf="toast.type === 'warning'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div style="color: #334155; font-weight: 500; font-size: 14px;">{{ toast.message }}</div>
  </div>

  <!-- BARRA BRANDING SUPERIOR -->
  <div class="test-branding-bar" *ngIf="!isLoading && presentationMode === 'scroll'">
    <a routerLink="/" style="cursor: pointer; display: inline-block;"><img [src]="actuayaLogoFull" alt="ActuaYa Logo" class="brand-logo"></a>
    <div class="brand-test-name">{{ testName }}</div>
  </div>

  <!-- LOGO DE EMPRESA (solo si el creador configuró uno) -->
  <div *ngIf="!isLoading && companyLogoUrl" style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      padding: 16px 20px; 
      background: rgba(255,255,255,0.85); 
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #f1f5f9;
    ">
    <img [src]="companyLogoUrl" alt="Logo de empresa"
      style="max-height: 48px; max-width: 200px; object-fit: contain;" />
  </div>

  <div *ngIf="isLoading" class="loading-state">
    <div class="spinner"></div>
    <div style="margin-top: 15px;">Cargando prueba... por favor espera.</div>
  </div>

  <div *ngIf="!isLoading && totalQuestions === 0" class="error-state">
    No se encontraron preguntas para este cuestionario.
  </div>



  <div *ngIf="!isLoading && totalQuestions > 0" class="question-container" [ngClass]="{'wizard-layout': presentationMode === 'card'}">
    
    <!-- MODO WIZARD (CARD) - SIN MAPEO CONTINUO -->
    
    <!-- MAPEADOR DE INPUTS INDEPENDIENTE -->
    <ng-template #questionInputs let-q="q">
<ng-container [ngSwitch]="q.typeId">
            <!-- TIPO 1: OPCIÓN MÚLTIPLE -->
            <ng-container *ngSwitchCase="'1'">
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_1_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id)">
                  <input type="radio" [id]="'opt_1_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id" (change)="selectOptionForQuestion(q, option.id)" [checked]="isOptionSelected(q, option.id)" style="display:none;">
                  <span class="radio-circle"></span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
              <!-- FALLBACK DE TEXTO ABIERTO -->
              <div *ngIf="q.type === 'text' || q.inputType === 'text' || !q.options || q.options.length === 0" style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50;">
                <input type="text" 
                  [formControl]="$any(textForm.get('openText_' + q.id))"
                  (input)="onInputChange(q, $event)"
                  placeholder="Escribe tu respuesta..." 
                  class="texto-abierto-input" 
                  style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;" />
              </div>
            </ng-container>

            <!-- TIPO MULTIPLE: SELECCIÓN MÚLTIPLE (checkboxes) -->
            <ng-container *ngSwitchCase="'multiple'">
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" 
                  [for]="'opt_m_' + q.id + '_' + i" 
                  [class.selected]="isCheckboxSelected(q, option.id)"
                  (click)="$event.preventDefault(); toggleCheckboxOption(q, option.id)">
                  <input type="checkbox" [id]="'opt_m_' + q.id + '_' + i" [checked]="isCheckboxSelected(q, option.id)" style="display:none;">
                  <span class="checkbox-square" style="
                    width: 22px; height: 22px; border-radius: 6px; border: 2px solid #cbd5e1; 
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s ease;
                  " [style.background]="isCheckboxSelected(q, option.id) ? themeColor : 'white'"
                     [style.borderColor]="isCheckboxSelected(q, option.id) ? themeColor : '#cbd5e1'">
                    <svg *ngIf="isCheckboxSelected(q, option.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-style: italic;">Puedes seleccionar varias opciones</p>
              <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Selecciona al menos una opción para continuar</span>
              </div>
            </ng-container>

            <!-- TIPO CASILLAS: SELECCIÓN MÚLTIPLE (checkboxes) -->
            <ng-container *ngSwitchCase="'casillas'">
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" 
                  [for]="'opt_c_' + q.id + '_' + i" 
                  [class.selected]="isCheckboxSelected(q, option.id)"
                  (click)="$event.preventDefault(); toggleCheckboxOption(q, option.id)">
                  <input type="checkbox" [id]="'opt_c_' + q.id + '_' + i" [checked]="isCheckboxSelected(q, option.id)" style="display:none;">
                  <span class="checkbox-square" [class.checked]="isCheckboxSelected(q, option.id)" style="
                    width: 22px; height: 22px; border-radius: 6px; border: 2px solid #cbd5e1; 
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s ease;
                  " [style.background]="isCheckboxSelected(q, option.id) ? themeColor : 'white'"
                     [style.borderColor]="isCheckboxSelected(q, option.id) ? themeColor : '#cbd5e1'">
                    <svg *ngIf="isCheckboxSelected(q, option.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-style: italic;">Puedes seleccionar varias opciones</p>
              <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Selecciona al menos una opción para continuar</span>
              </div>
            </ng-container>

            <!-- TIPO RADIO: SELECCION UNICA / ESCALA CONDITIONAL -->
            <ng-container *ngSwitchCase="'radio'">
              <div *ngIf="q.type !== 'escala' && q.tipo !== 'escala' && q.typeId !== 'escala' && q.type !== 'likert' && q.type !== 'scale'">
                <div class="radio-option-container" *ngFor="let opt of q.options; let i = index" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <input type="radio" 
                         [id]="'radio-' + q.id + '-' + i" 
                         [name]="'question-' + q.id" 
                         [value]="opt.value || opt.label || opt" 
                         [checked]="isOptionSelected(q, opt.value || opt.label || opt)"
                         (change)="selectOptionForQuestion(q, opt.value || opt.label || opt)" 
                         style="width: 18px; height: 18px; cursor: pointer;" />
                  <label [for]="'radio-' + q.id + '-' + i" style="font-size: 16px; cursor: pointer;">{{ opt.label || opt.texto || opt }}</label>
                </div>
              </div>

              <!-- INYECCION CUSTOM PARA LA ESCALA LIKERT -->
              <div *ngIf="q.type === 'escala' || q.tipo === 'escala' || q.typeId === 'escala' || q.type === 'likert' || q.type === 'scale'" class="custom-likert-override">
                <div style="position: relative; width: 100%; max-width: 500px; margin: 20px auto; padding: 20px 0;  user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
                </div>
              </div>
            </ng-container>

            <!-- TIPO 2: ESCALA 1 A 5 -->
            <ng-container *ngSwitchCase="'2'">
              <div class="likert-custom-wrapper" style="position: relative; width: 100%; max-width: 500px; margin: 20px auto; padding: 20px 0;  user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
              </div>
            </ng-container>
            <!-- TIPO ESCALA / LIKERT NUEVO MODELO -->
            <ng-container *ngSwitchCase="'escala'">
              <div class="likert-custom-wrapper" style="position: relative; width: 100%; max-width: 500px; margin: 20px auto; padding: 20px 0;  user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
              </div>
            </ng-container>


            <!-- TIPO 3: MATRIZ -->
            <div class="matrix-container" *ngSwitchCase="'3'">
               <div class="matrix-grid">
                   <p style="color: var(--color-texto-suave); font-size: 14px; text-align: center;">[Configuración de evaluación en matriz]</p>
               </div>
            </div>

            <!-- TIPO 4: SLIDER RANGO -->
            <div class="slider-container" *ngSwitchCase="'4'">
               <input type="range" class="custom-slider" min="0" max="100" />
            </div>

            <!-- TIPO 12: TEXTO ABIERTO / CORTA / DEMOGRÁFICOS -->
            <div class="text-container" *ngSwitchCase="'12'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>
            
            <div class="text-container" *ngSwitchCase="'parrafo'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>


            <div class="text-container" *ngSwitchCase="'text'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  Tu respuesta:
                </label>
                <input type="text" 
                  [placeholder]="q.placeholder || 'Escribe tu respuesta aquí...'" 
                  class="texto-abierto-input"
                  style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
                  (input)="onInputChange(q, $event)"
                  [formControl]="$any(textForm.get('openText_' + q.id))">
                  
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Este campo es requerido.</span>
                </div>
              </div>
            </div>

            <div class="text-container" *ngSwitchCase="'corta'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'email'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'id_number'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'age'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <!-- Otros Textos Demográficos que comparten lógica con 'corta' -->
            <ng-container *ngSwitchCase="'full_name'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'occupation'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'city'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'country'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>

            <!-- TIPO 13: MULTIMEDIA -->
            <div class="media-container" *ngSwitchCase="'13'">
              <div class="audio-wrapper">
                 <audio #audioPlayer [src]="q.mediaUrl" preload="auto" controls></audio>
              </div>
              <div class="options-container">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_13_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id)">
                  <input type="radio" [id]="'opt_13_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id" (change)="selectOptionForQuestion(q, option.id)" [checked]="isOptionSelected(q, option.id)" style="display:none;">
                  <span class="radio-circle"></span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
            </div>

            <!-- TIPO FILE -->
            <ng-container *ngSwitchCase="'file'">
              <div class="file-upload-container" style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  Adjuntar archivo (Máx 5MB):
                </label>
                
                <div *ngIf="!isFileUploaded(q.id) && !isUploading(q.id)" 
                     style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; background: rgba(59, 130, 246, 0.02); transition: all 0.3s ease; cursor: pointer; position: relative;">
                     
                     <input type="file" 
                            (change)="onFileSelected(q, $event)"
                            [accept]="getAcceptTypes(q)"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                            
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-survey-color, var(--accent))" stroke-width="2" style="width: 40px; height: 40px; margin: 0 auto 10px auto;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p style="margin: 0; color: #334155; font-weight: 500; font-size: 16px;">Toca para buscar tu archivo aquí</p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">
                        <span *ngIf="q.allowedFileTypes === 'image'">Solo Imágenes (JPEG/PNG)</span>
                        <span *ngIf="q.allowedFileTypes === 'pdf'">Solo Documentos PDF</span>
                        <span *ngIf="!q.allowedFileTypes || q.allowedFileTypes === 'both'">Imágenes (JPEG/PNG) y PDF</span>
                    </p>
                </div>
                
                <div *ngIf="isFileUploaded(q.id) || isUploading(q.id)" 
                     style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    
                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                        <div *ngIf="!isUploading(q.id)" style="width: 40px; height: 40px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        </div>
                        <div *ngIf="isUploading(q.id)" style="width: 40px; height: 40px; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                             <div style="width: 20px; height: 20px; border: 3px solid #e2e8f0; border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; overflow: hidden;">
                            <span style="font-size: 14px; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                               {{ isUploading(q.id) ? 'Subiendo archivo...' : getFileData(q.id).originalName }}
                            </span>
                        </div>
                    </div>
                    
                    <button *ngIf="!isUploading(q.id)" (click)="removeFile(q.id)" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>

                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Sube un archivo requerido.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO FECHA -->
            <ng-container *ngSwitchCase="'fecha'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  📅 Selecciona una fecha:
                </label>
                <input type="date"
                  class="texto-abierto-input"
                  style="width: 100%; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
                  (input)="onInputChange(q, $event)"
                  [formControl]="$any(textForm.get('openText_' + q.id))">
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Selecciona una fecha válida.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO MONEDA -->
            <ng-container *ngSwitchCase="'moneda'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  💰 Ingresa el monto:
                </label>
                <div style="display: flex; align-items: center; gap: 0;">
                  <span style="padding: 12px 16px; font-size: 18px; font-weight: 700; color: #475569; background: #f1f5f9; border: 2px solid #cbd5e1; border-right: none; border-radius: 8px 0 0 8px;">$</span>
                  <input type="number" min="0" step="any"
                    placeholder="0"
                    class="texto-abierto-input"
                    style="flex: 1; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 0 8px 8px 0; background-color: #ffffff; color: #1e293b; outline: none; box-sizing: border-box;"
                    (input)="onInputChange(q, $event)"
                    [formControl]="$any(textForm.get('openText_' + q.id))">
                </div>
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Ingresa un monto válido.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO FIRMA -->
            <ng-container *ngSwitchCase="'firma'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  ✍️ Firma aquí:
                </label>
                <div style="width: 100%; height: 160px; border: 2px solid #cbd5e1; border-radius: 8px; background: #fafbfc; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; position: relative;">
                  <canvas [id]="'canvas_firma_' + q.id" 
                    style="width: 100%; height: 100%; border-radius: 6px; cursor: crosshair; touch-action: none;"
                    (mousedown)="startSign($event, q.id)"
                    (mousemove)="drawSign($event, q.id)"
                    (mouseup)="endSign(q)"
                    (touchstart)="startSignTouch($event, q.id)"
                    (touchmove)="drawSignTouch($event, q.id)"
                    (touchend)="endSign(q)"></canvas>
                  <button (click)="clearSignature(q.id)" type="button"
                    style="position: absolute; top: 6px; right: 6px; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 600;">
                    Borrar
                  </button>
                </div>
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Es necesario firmar para continuar.</span>
                </div>
              </div>
            </ng-container>

            <!-- BLOQUES ESTRUCTURALES (no son preguntas, no requieren input) -->
            <div *ngSwitchCase="'section_title'"></div>
            <div *ngSwitchCase="'section_text'"></div>

            <!-- DEFAULT / INFORMATIVA -->
            <div class="default-container" *ngSwitchDefault>
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_d_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id)">
                  <input type="radio" [id]="'opt_d_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id" (change)="selectOptionForQuestion(q, option.id)" [checked]="isOptionSelected(q, option.id)" style="display:none;">
                  <span class="radio-circle"></span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
              <div class="text-container" *ngIf="!q.options || q.options.length === 0">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"
    (keydown.enter)="handleEnterKey($event)">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </div>
            
          </ng-container>
    </ng-template>

    <!-- MODO WIZARD (CARD) PARA TESTS -->
    <div *ngIf="presentationMode === 'card'" class="card-view-container">
    <ng-container *ngIf="currentQuestion && !isSurvey">
      <div class="question-card wizard-card" [ngClass]="animatingClass">
      
        <!-- ACCENT BAR TOP -->
        <div class="wz-accent-bar" [style.background]="'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'cc)'"></div>

        <!-- HEADER -->
        <div class="wz-header">


           <div class="wz-header-row">
             <div class="wz-step-badge" [style.background]="themeColor + '14'" [style.color]="themeColor">
               {{ currentIndex + 1 }} / {{ totalQuestions }}
             </div>
             <div class="save-status-badge" *ngIf="saveStatus !== 'idle'"
                  [class.saving]="saveStatus === 'saving'"
                  [class.saved]="saveStatus === 'saved'">
               <span *ngIf="saveStatus === 'saving'">⏳ Guardando...</span>
               <span *ngIf="saveStatus === 'saved'">✓ Guardado</span>
             </div>
             <div class="wz-timer" *ngIf="mostrarReloj && (limiteMinutos > 0 || tiempoTranscurrido > 0)">
               <span *ngIf="limiteMinutos === 0">⏱️ {{ formatear(tiempoTranscurrido) }}</span>
               <span *ngIf="limiteMinutos > 0" [class.text-danger]="tiempoRestante < 60">⏳ {{ formatear(tiempoRestante) }}</span>
             </div>
           </div>
        </div>
        
        <!-- CUERPO -->
        <div class="wz-body">
          <h2 class="wz-question-text">
            <span [innerHTML]="currentQuestion.text"></span>
          </h2>
          <p *ngIf="currentQuestion.descripcion" style="font-size: 13px; font-weight: 400; color: #64748b; margin: -4px 0 16px; line-height: 1.5; font-style: italic; text-align: center;">{{ currentQuestion.descripcion }}</p>

          <div class="wz-options-area">
            <ng-container *ngTemplateOutlet="questionInputs; context: { q: currentQuestion }"></ng-container>
          </div>

          <!-- NAVIGATION -->
          <div class="wz-nav-row" *ngIf="allowNavButtons">
            <button class="wz-btn wz-btn-back" [style.visibility]="currentIndex === 0 ? 'hidden' : 'visible'" (click)="goPrevious()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Anterior
            </button>
            <button class="wz-btn wz-btn-next" *ngIf="!isLastQuestion" [style.background]="themeColor"
              [style.opacity]="!hasAnsweredCurrent() ? '0.4' : '1'"
              (click)="goNext()">
              Siguiente
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <button class="wz-btn wz-btn-next" *ngIf="isLastQuestion" [style.background]="themeColor"
              [style.opacity]="!hasAnsweredCurrent() ? '0.4' : '1'"
              (click)="isLastQuestion ? submitSurvey() : goNext()">
              Enviar respuestas
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
          <div *ngIf="!allowNavButtons && isLastQuestion" class="wz-nav-row" style="justify-content: center;">
            <button class="wz-btn wz-btn-next" [style.background]="themeColor" (click)="submitSurvey()">
              Enviar respuestas
            </button>
          </div>
        </div>
        
        <!-- FOOTER PROGRESS -->
        <div class="wz-footer">
          <div class="wz-progress-track">
            <div class="wz-progress-fill" [style.width]="progressPercentage + '%'" [style.background]="'linear-gradient(90deg, ' + themeColor + ', ' + themeColor + 'aa)'"></div>
          </div>
          <div class="wz-progress-label">
            <span>{{ progressPercentage }}%</span>
            <span class="wz-motivational">{{ getMotivationalText }}</span>
          </div>
        </div>

      </div>
    </ng-container>

    <ng-container *ngIf="currentQuestion && isSurvey && !isSurveyCompleted">
      <div [ngClass]="backgroundTemplate.startsWith('#') ? '' : 'bg-' + (backgroundTemplate || 'default')"
           [style.backgroundColor]="backgroundTemplate.startsWith('#') ? backgroundTemplate : ''"
           style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; z-index: 1;">

        <div class="sv-card" [ngClass]="animatingClass">
          
          <!-- ACCENT BAR -->
          <div class="wz-accent-bar" [style.background]="'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'cc)'"></div>

          <!-- CABECERA -->
          <div class="sv-header">
             <div style="display: flex; align-items: center; gap: 12px;">
               <img *ngIf="testImageUrl" [src]="testImageUrl" alt="Logo" style="max-height: 36px; object-fit: contain;">
               <span class="sv-name" [style.color]="themeColor">{{ testName || '' }}</span>
             </div>
             <div class="wz-step-badge" [style.background]="themeColor + '14'" [style.color]="themeColor">
               {{ currentIndex + 1 }} / {{ totalQuestions }}
             </div>
          </div>

          <!-- PROGRESS -->
          <div class="wz-progress-track" style="border-radius: 0; flex-shrink: 0;">
            <div class="wz-progress-fill" [style.width]="progressPercentage + '%'" [style.background]="'linear-gradient(90deg, ' + themeColor + ', ' + themeColor + 'aa)'"></div>
          </div>

          <!-- CUERPO -->
          <div class="sv-body">
            
            <!-- Motivacional -->
            <div class="sv-motivational">
              <span [style.color]="themeColor">{{ progressPercentage }}%</span>
              <span style="color: #cbd5e1;">·</span>
              <span>{{ getMotivationalText }}</span>
            </div>

            <!-- BLOQUE TÍTULO DE SECCIÓN -->
            <ng-container *ngIf="currentQuestion.typeId === 'section_title'">
              <div style="border-left: 4px solid var(--primary-survey-color, var(--accent)); padding: 12px 0 12px 18px; text-align: left; width: 100%; margin-bottom: 30px;">
                <h3 style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.3;" [innerHTML]="currentQuestion.text"></h3>
              </div>
            </ng-container>

            <!-- BLOQUE TEXTO EXPLICATIVO -->
            <ng-container *ngIf="currentQuestion.typeId === 'section_text'">
              <p style="font-size: 14px; color: #64748b; line-height: 1.8; margin-bottom: 30px; text-align: left; width: 100%;" [innerHTML]="currentQuestion.text"></p>
            </ng-container>

            <!-- PREGUNTA NORMAL -->
            <ng-container *ngIf="currentQuestion.typeId !== 'section_title' && currentQuestion.typeId !== 'section_text'">
              <h2 class="wz-question-text" style="text-align: center;">
                <span [innerHTML]="currentQuestion.text"></span>
              </h2>
              <p *ngIf="currentQuestion.descripcion" style="font-size: 13px; font-weight: 400; color: #64748b; margin: -4px 0 16px; line-height: 1.5; font-style: italic; text-align: center;">{{ currentQuestion.descripcion }}</p>

              <div class="wz-options-area">
                <ng-container *ngTemplateOutlet="questionInputs; context: { q: currentQuestion }"></ng-container>
              </div>
            </ng-container>

            <!-- BOTONES NAVEGACIÓN -->
            <div class="wz-nav-row" style="width: 100%; margin-top: 20px;">
              <button class="wz-btn wz-btn-back" 
                *ngIf="currentIndex > 0" 
                (click)="goPrevious()">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Regresar
              </button>
              <div *ngIf="currentIndex === 0" style="flex: 1;"></div>
              <button class="wz-btn wz-btn-next"
                [style.background]="themeColor"
                [style.opacity]="(!hasAnsweredCurrent() || isLoadingSubmit) ? '0.4' : '1'"
                [disabled]="!hasAnsweredCurrent() || isLoadingSubmit"
                (click)="isLastQuestion ? submitSurvey() : goNext()">
                {{ isLoadingSubmit ? 'Enviando...' : (isLastQuestion ? 'Enviar Encuesta' : 'Siguiente') }}
                <svg *ngIf="!isLastQuestion" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
                <svg *ngIf="isLastQuestion" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>

          </div>
        </div>
      </div>
    </ng-container>
    </div>

    <!-- MODO SCROLL -->
    <div *ngIf="presentationMode !== 'card'" class="scroll-view-container">
      <ng-container *ngFor="let q of visibleQuestions; trackBy: trackById">
        <div class="question-card" [ngClass]="{'survey-card': isSurvey}">
        
        <!-- HEADER SCROLL MODE -->
        <div class="card-header" *ngIf="!isSurvey">
           <div class="header-title" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
             <div>
               <span *ngIf="q.typeId === '14'">Sección</span>
               <span *ngIf="q.typeId !== '14'">Pregunta</span>
               <span>{{ getQuestionGlobalIndex(q) + 1 }} de {{ totalQuestions }}</span>
             </div>
             
             <div class="timer-display" [class.text-danger]="limiteMinutos > 0 && tiempoRestante < 60" *ngIf="!isSurvey && mostrarReloj">
               <span *ngIf="limiteMinutos === 0">⏱️ {{ formatear(tiempoTranscurrido) }}</span>
               <span *ngIf="limiteMinutos > 0">⏳ {{ formatear(tiempoRestante) }}</span>
             </div>
          </div>
          <div class="header-progress" style="display: flex; align-items: center; gap: 12px;">
            <div class="header-progress" style="flex: 1;">
              <div class="header-progress-bar" [style.width]="progressPercentage + '%'"></div>
            </div>
            <div class="save-status-badge" *ngIf="saveStatus !== 'idle'"
                 [class.saving]="saveStatus === 'saving'"
                 [class.saved]="saveStatus === 'saved'"
                 style="flex-shrink: 0;">
              <span *ngIf="saveStatus === 'saving'">⏳</span>
              <span *ngIf="saveStatus === 'saved'">✓ Guardado</span>
            </div>
          </div>
        </div>
        
        <!-- CUERPO -->
        <div class="card-body">
          
          <!-- BLOQUE TÍTULO DE SECCIÓN (no es pregunta) -->
          <ng-container *ngIf="q.typeId === 'section_title' || q.tipo === 'section_title'">
            <div style="border-left: 3px solid var(--primary-survey-color, var(--accent)); padding: 10px 0 10px 14px; margin: 8px 0 4px;">
              <h3 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; letter-spacing: -0.3px; line-height: 1.3;" [innerHTML]="q.text"></h3>
            </div>
          </ng-container>

          <!-- BLOQUE TEXTO EXPLICATIVO (no es pregunta) -->
          <ng-container *ngIf="q.typeId === 'section_text' || q.tipo === 'section_text'">
            <p style="font-size: 13px; font-weight: 300; color: #64748b; line-height: 1.7; margin: 4px 0; padding: 0 2px;" [innerHTML]="q.text"></p>
          </ng-container>

          <!-- Título normal de pregunta (solo para preguntas reales) -->
          <h2 *ngIf="q.typeId !== 'section_title' && q.tipo !== 'section_title' && q.typeId !== 'section_text' && q.tipo !== 'section_text'" class="question-title" [ngClass]="{'survey-title': isSurvey}">
            <span *ngIf="isSurvey" class="survey-question-number" style="margin-right: 8px; color: var(--primary-survey-color, var(--accent));">{{ getQuestionGlobalIndex(q) + 1 }}.</span><span [innerHTML]="q.text"></span><span *ngIf="q.obligatoria === false" style="font-size: 13px; font-weight: 400; color: #94a3b8; margin-left: 8px; font-style: italic;">(Opcional)</span>
          </h2>
          <p *ngIf="q.descripcion && q.typeId !== 'section_title' && q.typeId !== 'section_text'" style="font-size: 13px; font-weight: 400; color: #64748b; margin: -4px 0 12px; line-height: 1.5; font-style: italic;">{{ q.descripcion }}</p>

          <ng-container [ngSwitch]="q.typeId">
            
            <!-- TIPO 1: OPCIÓN MÚLTIPLE / RADIO STANDARD VS LIKERT CUSTOM -->
            <ng-container *ngSwitchCase="'1'">
              <!-- BLOQUEO RADIO BUTTONS NORMALES -->
              <div *ngIf="q.type !== 'escala' && q.tipo !== 'escala' && q.typeId !== 'escala' && q.type !== 'likert' && q.type !== 'scale'">
                <div class="options-container" *ngIf="q.options && q.options.length > 0">
                  <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_1_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id || option.value || option)">
                    <input type="radio" [id]="'opt_1_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id || option.value || option" (change)="selectOptionForQuestion(q, option.id || option.value || option)" [checked]="isOptionSelected(q, option.id || option.value || option)" style="display:none;">
                    <span class="radio-circle"></span>
                    <span class="option-label">{{ option.label || option.texto || option.value || option }}</span>
                  </label>
                </div>
                <!-- FALLBACK DE TEXTO ABIERTO -->
                <div *ngIf="q.type === 'text' || q.inputType === 'text' || !q.options || q.options.length === 0" style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50;">
                  <input type="text" 
                    [formControl]="$any(textForm.get('openText_' + q.id))"
                    (input)="onInputChange(q, $event)"
                    placeholder="Escribe tu respuesta..." 
                    class="texto-abierto-input" 
                    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;" />
                </div>
              </div>

              <!-- INYECCIÓN LIKERT CUSTOM -->
              <div *ngIf="q.type === 'escala' || q.tipo === 'escala' || q.typeId === 'escala' || q.type === 'likert' || q.type === 'scale'" class="custom-likert-override">
                <div style="position: relative; width: 100%; max-width: 500px; margin: 20px auto; padding: 20px 0;  user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
                </div>
              </div>
            </ng-container>

            <!-- TIPO MULTIPLE: SELECCIÓN MÚLTIPLE (checkboxes) -->
            <ng-container *ngSwitchCase="'multiple'">
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" 
                  [for]="'opt_m2_' + q.id + '_' + i" 
                  [class.selected]="isCheckboxSelected(q, option.id || option.value || option)"
                  (click)="$event.preventDefault(); toggleCheckboxOption(q, option.id || option.value || option)">
                  <input type="checkbox" [id]="'opt_m2_' + q.id + '_' + i" [checked]="isCheckboxSelected(q, option.id || option.value || option)" style="display:none;">
                  <span class="checkbox-square" style="
                    width: 22px; height: 22px; border-radius: 6px; border: 2px solid #cbd5e1; 
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s ease;
                  " [style.background]="isCheckboxSelected(q, option.id || option.value || option) ? themeColor : 'white'"
                     [style.borderColor]="isCheckboxSelected(q, option.id || option.value || option) ? themeColor : '#cbd5e1'">
                    <svg *ngIf="isCheckboxSelected(q, option.id || option.value || option)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span class="option-label">{{ option.label || option.texto || option.value || option }}</span>
                </label>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-style: italic;">Puedes seleccionar varias opciones</p>
              <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Selecciona al menos una opción para continuar</span>
              </div>
            </ng-container>

            <!-- TIPO CASILLAS: SELECCIÓN MÚLTIPLE (checkboxes) -->
            <ng-container *ngSwitchCase="'casillas'">
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" 
                  [for]="'opt_c2_' + q.id + '_' + i" 
                  [class.selected]="isCheckboxSelected(q, option.id || option.value || option)"
                  (click)="$event.preventDefault(); toggleCheckboxOption(q, option.id || option.value || option)">
                  <input type="checkbox" [id]="'opt_c2_' + q.id + '_' + i" [checked]="isCheckboxSelected(q, option.id || option.value || option)" style="display:none;">
                  <span class="checkbox-square" style="
                    width: 22px; height: 22px; border-radius: 6px; border: 2px solid #cbd5e1; 
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s ease;
                  " [style.background]="isCheckboxSelected(q, option.id || option.value || option) ? themeColor : 'white'"
                     [style.borderColor]="isCheckboxSelected(q, option.id || option.value || option) ? themeColor : '#cbd5e1'">
                    <svg *ngIf="isCheckboxSelected(q, option.id || option.value || option)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span class="option-label">{{ option.label || option.texto || option.value || option }}</span>
                </label>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-style: italic;">Puedes seleccionar varias opciones</p>
              <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Selecciona al menos una opción para continuar</span>
              </div>
            </ng-container>

            <!-- TIPO 2: ESCALA 1 A 5 -->
            <ng-container *ngSwitchCase="'2'">
              <div class="likert-custom-wrapper" style="position: relative; width: 100%; max-width: 500px; margin: 20px auto; padding: 20px 0;  user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
              </div>
            </ng-container>
            <!-- TIPO ESCALA / LIKERT NUEVO MODELO -->
            <ng-container *ngSwitchCase="'escala'">
              <div class="likert-custom-wrapper" style="position: relative; width: 100%; max-width: 500px; margin: 2rem auto; user-select: none;">
                   <div style="display: flex; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 25px;">
                      <div (click)="selectOptionForQuestion(q, '1')" [ngStyle]="{'opacity': isOptionSelected(q, '1') ? '1' : '0.4', 'transform': isOptionSelected(q, '1') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '1') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F65E5E; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(246,94,94,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#5E1616" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10l2 1.5M17 10l-2 1.5" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '2')" [ngStyle]="{'opacity': isOptionSelected(q, '2') ? '1' : '0.4', 'transform': isOptionSelected(q, '2') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '2') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F99047; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(249,144,71,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#682c0b" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 16a4 4 0 0 1 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '3')" [ngStyle]="{'opacity': isOptionSelected(q, '3') ? '1' : '0.4', 'transform': isOptionSelected(q, '3') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '3') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #F2C94C; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(242,201,76,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#6B5919" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 10h.01M17 10h.01" stroke-width="3" />
                            <path d="M8 15h8" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '4')" [ngStyle]="{'opacity': isOptionSelected(q, '4') ? '1' : '0.4', 'transform': isOptionSelected(q, '4') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '4') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #A0D468; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(160,212,104,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#374F20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M8 10h.01M16 10h.01" stroke-width="3" />
                            <path d="M8 14a4 4 0 0 0 8 0" />
                         </svg>
                      </div>
                      <div (click)="selectOptionForQuestion(q, '5')" [ngStyle]="{'opacity': isOptionSelected(q, '5') ? '1' : '0.4', 'transform': isOptionSelected(q, '5') ? 'scale(1.2)' : 'scale(1)', 'filter': isOptionSelected(q, '5') ? 'none' : 'grayscale(100%)'}" style="width: 60px; height: 60px; border-radius: 50%; background-color: #63C76A; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 6px 15px rgba(99,199,106,0.3); border: 2px solid #fff;">
                         <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1D4A20" stroke-width="2" fill="none" stroke-linecap="round">
                            <path d="M7 11c.5-1 1.5-1 2 0M15 11c.5-1 1.5-1 2 0" />
                            <path d="M8 14h8a4 4 0 0 1-8 0z" fill="#1D4A20" />
                         </svg>
                      </div>
                   </div>
                   <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 8px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 0; left: 0; height: 100%; border-radius: 8px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); background: #334155;" [ngStyle]="{'width': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"></div>
                       <div *ngIf="isOptionSelected(q,'1')||isOptionSelected(q,'2')||isOptionSelected(q,'3')||isOptionSelected(q,'4')||isOptionSelected(q,'5')" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 22px; background-color: #f8fafc; border: 2px solid #334155; border-radius: 6px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.15);" [ngStyle]="{'left': isOptionSelected(q, '1') ? '0%' : isOptionSelected(q, '2') ? '25%' : isOptionSelected(q, '3') ? '50%' : isOptionSelected(q, '4') ? '75%' : '100%'}"><div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div></div>
                   </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                      <div style="color: #F65E5E; font-weight: 800; font-size: 16px; line-height: 1;">-</div>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 85%;">
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F65E5E;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F88151;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #F9A445;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #EDC649;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #BBE076;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #8CDB9C;"></span>
                         <span style="width: 4px; height: 4px; border-radius: 50%; background-color: #63C76A;"></span>
                      </div>
                      <div style="color: #63C76A; font-weight: 800; font-size: 16px; line-height: 1;">+</div>
                   </div>
              </div>
            </ng-container>


            <!-- TIPO 3: MATRIZ -->
            <div class="matrix-container" *ngSwitchCase="'3'">
               <div class="matrix-grid">
                   <p style="color: var(--color-texto-suave); font-size: 14px; text-align: center;">[Configuración de evaluación en matriz]</p>
               </div>
            </div>

            <!-- TIPO 4: SLIDER RANGO -->
            <div class="slider-container" *ngSwitchCase="'4'">
               <input type="range" class="custom-slider" min="0" max="100" />
            </div>

            <!-- TIPO 12: TEXTO ABIERTO / CORTA / DEMOGRÁFICOS -->
            <div class="text-container" *ngSwitchCase="'12'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'parrafo'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>


            <div class="text-container" *ngSwitchCase="'text'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  Tu respuesta:
                </label>
                <input type="text" 
                  [placeholder]="q.placeholder || 'Escribe tu respuesta aquí...'" 
                  class="texto-abierto-input"
                  style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
                  (input)="onInputChange(q, $event)"
                  [formControl]="$any(textForm.get('openText_' + q.id))">
                  
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Este campo es requerido.</span>
                </div>
              </div>
            </div>

            <div class="text-container" *ngSwitchCase="'corta'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'email'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'id_number'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <div class="text-container" *ngSwitchCase="'age'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
            </div>

            <!-- Otros Textos Demográficos que comparten lógica con 'corta' -->
            <ng-container *ngSwitchCase="'full_name'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'occupation'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'city'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>
            <ng-container *ngSwitchCase="'country'">
              <div class="text-container">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </ng-container>

            <!-- TIPO 13: MULTIMEDIA -->
            <div class="media-container" *ngSwitchCase="'13'">
              <div class="audio-wrapper">
                 <audio #audioPlayer [src]="q.mediaUrl" preload="auto" controls></audio>
              </div>
              <div class="options-container">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_13_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id)">
                  <input type="radio" [id]="'opt_13_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id" (change)="selectOptionForQuestion(q, option.id)" [checked]="isOptionSelected(q, option.id)" style="display:none;">
                  <span class="radio-circle"></span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
            </div>

            <!-- TIPO FILE -->
            <ng-container *ngSwitchCase="'file'">
              <div class="file-upload-container" style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  Adjuntar archivo (Máx 5MB):
                </label>
                
                <div *ngIf="!isFileUploaded(q.id) && !isUploading(q.id)" 
                     style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; background: rgba(59, 130, 246, 0.02); transition: all 0.3s ease; cursor: pointer; position: relative;">
                     
                     <input type="file" 
                            (change)="onFileSelected(q, $event)"
                            [accept]="getAcceptTypes(q)"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                            
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-survey-color, var(--accent))" stroke-width="2" style="width: 40px; height: 40px; margin: 0 auto 10px auto;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p style="margin: 0; color: #334155; font-weight: 500; font-size: 16px;">Toca para buscar tu archivo aquí</p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">
                        <span *ngIf="q.allowedFileTypes === 'image'">Solo Imágenes (JPEG/PNG)</span>
                        <span *ngIf="q.allowedFileTypes === 'pdf'">Solo Documentos PDF</span>
                        <span *ngIf="!q.allowedFileTypes || q.allowedFileTypes === 'both'">Imágenes (JPEG/PNG) y PDF</span>
                    </p>
                </div>
                
                <div *ngIf="isFileUploaded(q.id) || isUploading(q.id)" 
                     style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    
                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                        <div *ngIf="!isUploading(q.id)" style="width: 40px; height: 40px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        </div>
                        <div *ngIf="isUploading(q.id)" style="width: 40px; height: 40px; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                             <div style="width: 20px; height: 20px; border: 3px solid #e2e8f0; border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; overflow: hidden;">
                            <span style="font-size: 14px; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                               {{ isUploading(q.id) ? 'Subiendo archivo...' : getFileData(q.id).originalName }}
                            </span>
                        </div>
                    </div>
                    
                    <button *ngIf="!isUploading(q.id)" (click)="removeFile(q.id)" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>

                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Sube un archivo requerido.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO FECHA (scroll) -->
            <ng-container *ngSwitchCase="'fecha'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  📅 Selecciona una fecha:
                </label>
                <input type="date"
                  class="texto-abierto-input"
                  style="width: 100%; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
                  (input)="onInputChange(q, $event)"
                  [formControl]="$any(textForm.get('openText_' + q.id))">
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Selecciona una fecha válida.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO MONEDA (scroll) -->
            <ng-container *ngSwitchCase="'moneda'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  💰 Ingresa el monto:
                </label>
                <div style="display: flex; align-items: center; gap: 0;">
                  <span style="padding: 12px 16px; font-size: 18px; font-weight: 700; color: #475569; background: #f1f5f9; border: 2px solid #cbd5e1; border-right: none; border-radius: 8px 0 0 8px;">$</span>
                  <input type="number" min="0" step="any"
                    placeholder="0"
                    class="texto-abierto-input"
                    style="flex: 1; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 0 8px 8px 0; background-color: #ffffff; color: #1e293b; outline: none; box-sizing: border-box;"
                    (input)="onInputChange(q, $event)"
                    [formControl]="$any(textForm.get('openText_' + q.id))">
                </div>
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Ingresa un monto válido.</span>
                </div>
              </div>
            </ng-container>

            <!-- TIPO FIRMA (scroll) -->
            <ng-container *ngSwitchCase="'firma'">
              <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
                  ✍️ Firma aquí:
                </label>
                <div style="width: 100%; height: 160px; border: 2px solid #cbd5e1; border-radius: 8px; background: #fafbfc; position: relative;">
                  <canvas [id]="'canvas_firma_' + q.id" 
                    style="width: 100%; height: 100%; border-radius: 6px; cursor: crosshair; touch-action: none;"
                    (mousedown)="startSign($event, q.id)"
                    (mousemove)="drawSign($event, q.id)"
                    (mouseup)="endSign(q)"
                    (touchstart)="startSignTouch($event, q.id)"
                    (touchmove)="drawSignTouch($event, q.id)"
                    (touchend)="endSign(q)"></canvas>
                  <button (click)="clearSignature(q.id)" type="button"
                    style="position: absolute; top: 6px; right: 6px; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 600;">
                    Borrar
                  </button>
                </div>
                <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Es necesario firmar para continuar.</span>
                </div>
              </div>
            </ng-container>

            <!-- BLOQUES ESTRUCTURALES (no son preguntas, no requieren input) -->
            <div *ngSwitchCase="'section_title'"></div>
            <div *ngSwitchCase="'section_text'"></div>

            <!-- DEFAULT / INFORMATIVA -->
            <div class="default-container" *ngSwitchDefault>
              <div class="options-container" *ngIf="q.options && q.options.length > 0">
                <label class="custom-radio-option" *ngFor="let option of q.options; let i = index" [for]="'opt_d_' + q.id + '_' + i" [class.selected]="isOptionSelected(q, option.id)">
                  <input type="radio" [id]="'opt_d_' + q.id + '_' + i" [name]="'q_' + q.id" [value]="option.id" (change)="selectOptionForQuestion(q, option.id)" [checked]="isOptionSelected(q, option.id)" style="display:none;">
                  <span class="radio-circle"></span>
                  <span class="option-label">{{ option.label }}</span>
                </label>
              </div>
              <div class="text-container" *ngIf="!q.options || q.options.length === 0">
                <div style="margin-top: 20px; width: 100%; display: block; position: relative; z-index: 50; box-sizing: border-box;">
  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 14px;">
    Tu respuesta:
  </label>
  <input *ngIf="q.typeId !== 'parrafo' && q.typeId !== '12'"
    type="text" 
    [placeholder]="q.typeId === 'full_name' ? 'Ej: Juan Pérez' : 'Escribe tu respuesta...'" 
    class="texto-abierto-input"
    style="border: none; background: transparent; outline: none; width: 100%; height: 100%; padding: 4px 8px; font-size: 16px; display: block;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))">
  <textarea *ngIf="q.typeId === 'parrafo' || q.typeId === '12'"
    placeholder="Escribe tu respuesta aquí..." 
    class="survey-input-custom"
    style="width: 100%; min-height: 100px; padding: 12px 16px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b; display: block; pointer-events: auto; cursor: text; transition: all 0.2s ease; outline: none; box-sizing: border-box;"
    (input)="onInputChange(q, $event)"
    [formControl]="$any(textForm.get('openText_' + q.id))"></textarea>
    
  <div *ngIf="showInputError(q)" style="color: #ef4444; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span *ngIf="q.typeId === 'full_name'">Por favor, ingresa un nombre válido para continuar</span>
    <span *ngIf="q.typeId !== 'full_name'">Este campo es requerido.</span>
  </div>
</div>
              </div>
            </div>
            
          </ng-container>

        </div> <!-- Fin Card Body -->
        </div> <!-- Fin Tarjeta -->
      </ng-container>

      <!-- BOTÓN FINAL MODO SCROLL -->
      <div class="navigation-actions" style="margin-top: 20px;">
        <button class="nav-btn btn-finish" [disabled]="!hasAnsweredAllVisible()" (click)="submitSurvey()">
          Enviar Encuesta
        </button>
      </div>

    </div>

  </div> <!-- Fin Contenedor -->



    <!-- COMPLETION VIEW SOFT LANDING -->
    <ng-container *ngIf="isSurveyCompleted">
      <div [ngClass]="backgroundTemplate.startsWith('#') ? '' : 'bg-' + (backgroundTemplate || 'default')"
           [style.backgroundColor]="backgroundTemplate.startsWith('#') ? backgroundTemplate : ''"
           style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; z-index: 1;">
        
        <div class="tarjeta-blanca completion-card animate__animated animate__fadeInUp" style="background-color: #ffffff; border-radius: 16px; width: 100%; max-width: 650px; z-index: 10; padding: 60px 40px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center;">
           
           <div style="margin-bottom: 30px;">
             <!-- Animated Success Icon -->
             <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
             </svg>
             <style>
                .checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 4; stroke: white; stroke-miterlimit: 10; margin: 0 auto; box-shadow: inset 0px 0px 0px var(--accent); animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
                .checkmark__circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 4; stroke-miterlimit: 10; stroke: var(--accent); fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
                .checkmark__check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
                @keyframes stroke { 100% { stroke-dashoffset: 0; } }
                @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
                @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px var(--accent); } }
             </style>
           </div>
           
           <h2 class="completion-title" style="color: #334155; font-size: 32px; font-weight: 600; margin-bottom: 20px; line-height: 1.3;">
              {{ isSurvey ? '¡Encuesta Enviada!' : '¡Respuestas Enviadas!' }}
           </h2>
           
           <p class="completion-message" style="color: #64748b; font-size: 18px; line-height: 1.6; margin-bottom: 20px; max-width: 500px;">
              {{ completionMessage }}
           </p>

           <!-- Indicador de Redirección -->
           <p *ngIf="!isSurvey" style="color: #64748b; font-size: 15px; font-weight: 600; margin-top: 10px; animation: pulse 1.5s infinite;">
              Redirigiendo procesador de resultados...
           </p>
           <style>
               @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
           </style>

           <div *ngIf="testImageUrl" style="margin-top: 30px; opacity: 0.9;">
             <img [src]="testImageUrl" alt="Logo de la empresa" style="max-height: 60px; max-width: 200px; object-fit: contain; margin: 0 auto;">
           </div>
           
        </div>
      </div>
    </ng-container>

</div>
  `,
  styles: [`
    .engine-wrapper {
        background-color: #f4f7f9;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 20px 20px;
        
        box-sizing: border-box;
    }

    /* ENGINE WRAPPER WIZARD MODIFIER */
    .engine-wrapper.wizard-mode {
        justify-content: center;
        background-color: #f8fafc;
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        padding: 20px;
    }

    /* Branding superior */
    .test-branding-bar {
        width: 100%;
        max-width: 650px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(0,0,0,0.08);
    }

    /* CONTENEDOR DE ENCUESTAS MODERNAS */
    .survey-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        padding: 20px;
        margin: -20px; /* Offset the engine-wrapper padding */
        width: calc(100% + 40px);
        
        box-sizing: border-box;
    }

    /* Fondos de Encuesta */
    .bg-default {
      background-color: #f8fafc; /* Gris muy claro por defecto */
    }
    
    .bg-solid-dark {
      background-color: #0f172a; /* Azul marino/pizarra muy oscuro */
    }
    
    .bg-texture-dots {
      background-color: #f1f5f9;
      background-image: radial-gradient(#cbd5e1 2px, transparent 2px);
      background-size: 30px 30px;
    }
    
    .bg-texture-lines {
      background-color: #f8fafc;
      background-image: repeating-linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0), repeating-linear-gradient(45deg, #e2e8f0 25%, #f8fafc 25%, #f8fafc 75%, #e2e8f0 75%, #e2e8f0);
      background-position: 0 0, 10px 10px;
      background-size: 20px 20px;
    }

    .bg-gradient-soft {
      background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    }

    .bg-texture-grid {
      background-color: #f8fafc;
      background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
      background-size: 30px 30px;
    }

    .brand-logo {
        height: 65px;
        object-fit: contain;
    }

    .brand-test-name {
        color: var(--color-texto-suave);
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: right;
        max-width: 50%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .loading-state, .error-state {
        text-align: center;
        color: var(--color-texto-suave);
        font-size: 18px;
    }

    .timer-display {
        font-family: monospace;
        font-size: 15px;
        background: rgba(0,0,0,0.15);
        padding: 4px 10px;
        border-radius: 6px;
        transition: all 0.3s ease;
    }

    .text-danger {
        color: #fca5a5 !important;
        background: rgba(239, 68, 68, 0.4) !important;
        animation: pulseTimer 1s infinite alternate;
    }

    @keyframes pulseTimer {
        from { transform: scale(1); }
        to { transform: scale(1.03); }
    }
    
    .spinner {
        display: inline-block;
        width: 40px; height: 40px;
        border: 4px solid #cbd5e0;
        border-top-color: var(--primary-survey-color, #5D9FCD);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @keyframes focusFadeIn {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
    }

    .question-container {
        width: 100%;
        max-width: 650px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        position: relative;
        z-index: 10;
        margin: 0 auto;
    }

    .question-container.wizard-layout {
        max-width: 800px;
        gap: 0;
    }

    /* MODO SCROLL (ESPACIADO OPTIMIZADO PARA CARGA COGNITIVA) */
    .scroll-view-container {
        display: flex;
        flex-direction: column;
        gap: 2rem; /* Separación ampliada (32px) solicitada para tarjetas continuas */
        width: 100%;
        padding-bottom: 40px;
    }

    .scroll-view-container .survey-title {
        color: #111827 !important; /* Fuerza color negro para los titulos en este modo */
    }

    /* TARJETA PRINCIPAL */
    .question-card {
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08); /* Sombra suave */
        overflow: hidden;
        width: 100%;
        border: 1px solid rgba(0,0,0,0.05);
        animation: focusFadeIn 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    /* TARJETA PRINCIPAL (WIZARD MODIFIER) */
    .question-card.wizard-card {
        border-radius: 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03);
        border: none;
        overflow: hidden;
        max-width: 680px;
        width: 100%;
        margin: 0 auto;
        max-height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
    }

    /* TARJETA PRINCIPAL (SURVEY MODIFIER - SCROLL) */
    .question-card.survey-card {
        border-left: 4px solid var(--primary-survey-color, var(--accent));
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        border-radius: 12px;
    }

    .question-card.survey-card .card-body { padding: 30px; }

    .survey-title {
        color: #1e293b;
        font-size: 19px !important;
        margin-bottom: 25px !important;
        display: flex;
        font-weight: 500;
        align-items: flex-start;
    }

    /* HEADER (SCROLL MODE) */
    .card-header {
        background-color: #2b3a4a;
        padding: 24px 30px;
        color: #ffffff;
        position: relative;
    }

    .header-title { font-size: 18px; font-weight: 700; margin: 0 0 15px 0; }

    .header-progress {
        width: 100%; height: 10px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 10px; overflow: hidden;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
    }

    .header-progress-bar {
        height: 100%; border-radius: 10px;
        transition: width 0.4s ease;
        background-image: linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent), linear-gradient(90deg, #5D9FCD, var(--accent));
        background-size: 20px 20px, 100% 100%;
        animation: moveStripes 2s linear infinite;
    }

    @keyframes moveStripes {
        0% { background-position: 0 0, 0 0; }
        100% { background-position: 20px 0, 0 0; }
    }

    /* SAVE STATUS BADGE */
    .save-status-badge {
        font-size: 12px; font-weight: 600;
        padding: 4px 12px; border-radius: 50px;
        animation: badgeFadeIn 0.3s ease;
        white-space: nowrap; letter-spacing: 0.02em;
    }
    .save-status-badge.saving { background: #fef3c7; color: var(--accent); }
    .save-status-badge.saved { background: #dcfce7; color: #16a34a; }

    @keyframes badgeFadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }

    /* CUERPO (SCROLL MODE) */
    .card-body { padding: 40px 30px; }
    .card-body.wizard-body { padding: 0 40px 40px 40px; }

    .question-title {
        font-size: 22px; color: var(--color-secundario);
        margin: 0 0 30px 0; line-height: 1.5; font-weight: 500;
    }

    /* === REDESIGNED WIZARD CARD STYLES === */
    .wz-accent-bar {
        height: 5px;
        width: 100%;
    }

    .wz-header {
        position: relative;
        width: 100%;
    }

    .wz-cover {
        width: 100%;
        height: 180px;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    .wz-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 32px 0;
        gap: 12px;
    }

    .wz-step-badge {
        font-size: 13px;
        font-weight: 700;
        padding: 6px 16px;
        border-radius: 50px;
        letter-spacing: 0.03em;
    }

    .wz-timer {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        padding: 6px 14px;
        background: #f1f5f9;
        border-radius: 50px;
    }

    .wz-body {
        padding: 20px 36px 28px;
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }

    .wz-question-text {
        font-size: 22px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.4;
        margin: 4px 0 20px;
        text-align: center;
        letter-spacing: -0.02em;
    }

    .wz-options-area {
        width: 100%;
        margin-bottom: 20px;
    }

    /* Navigation Buttons */
    .wz-nav-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
    }

    .wz-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.25s ease;
        line-height: 1;
    }

    .wz-btn-back {
        background: #f1f5f9;
        color: #64748b;
    }

    .wz-btn-back:hover {
        background: #e2e8f0;
        color: #334155;
    }

    .wz-btn-next {
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.12);
    }

    .wz-btn-next:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    }

    .wz-btn-next:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none;
    }

    /* Footer Progress */
    .wz-footer {
        padding: 16px 32px 20px;
        background: #fafbfc;
        border-top: 1px solid #f1f5f9;
    }

    .wz-progress-track {
        width: 100%;
        height: 5px;
        background: #e2e8f0;
        border-radius: 99px;
        overflow: hidden;
    }

    .wz-progress-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .wz-progress-label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
    }

    .wz-motivational {
        font-weight: 500;
        color: #64748b;
    }

    /* WIZARD CARD OPTIONS (Pills Style) */
    .wizard-card .options-container {
        gap: 10px;
    }

    .wizard-card .custom-radio-option {
        border-radius: 14px;
        padding: 16px 22px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        background-color: #f8fafc;
        border: 2px solid #e2e8f0;
    }

    .wizard-card .custom-radio-option:hover {
        background-color: #f1f5f9;
        border-color: #cbd5e1;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }

    .wizard-card .custom-radio-option.selected {
        background-color: #ffffff;
        border-color: var(--primary-survey-color, #5D9FCD);
        box-shadow: 0 0 0 3px rgba(93, 159, 205, 0.12), 0 4px 12px rgba(0,0,0,0.04);
    }

    /* === SURVEY CARD (sv-) === */
    .sv-card {
        background-color: #ffffff;
        border-radius: 20px;
        width: 100%;
        max-width: 720px;
        z-index: 10;
        position: relative;
        box-shadow: 0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03);
        overflow: hidden;
        margin: auto;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 40px);
    }

    .sv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 28px;
        border-bottom: 1px solid #f1f5f9;
        flex-shrink: 0;
    }

    .sv-name {
        font-size: 16px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .sv-body {
        padding: 32px 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        overflow-y: auto;
    }

    .sv-motivational {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 28px;
        background: #f8fafc;
        padding: 6px 16px;
        border-radius: 50px;
        border: 1px solid #e2e8f0;
    }

    /* Survey card options */
    .sv-card .custom-radio-option {
        border-radius: 14px;
        border: 2px solid #e2e8f0;
        background: #f8fafc;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sv-card .custom-radio-option:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }

    .sv-card .custom-radio-option.selected {
        background: #ffffff;
        border-color: var(--primary-survey-color, #5D9FCD);
        box-shadow: 0 0 0 3px rgba(93, 159, 205, 0.12);
    }

    /* === PRE-TEST SCREEN & COUNTDOWN === */
    .pretest-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
        animation: fadeInOverlay 0.3s ease;
    }

    @keyframes fadeInOverlay {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .pretest-card {
        background: #ffffff;
        border-radius: 24px;
        padding: 48px 40px;
        max-width: 540px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.15);
        animation: slideUpCard 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideUpCard {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .pretest-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
    }

    .pretest-title {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 8px;
    }

    .pretest-subtitle {
        font-size: 15px;
        color: #64748b;
        margin: 0 0 32px;
        font-weight: 500;
    }

    .pretest-info-cards {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-bottom: 36px;
        text-align: left;
    }

    .pretest-info-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
    }

    .pretest-info-icon {
        font-size: 22px;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .pretest-info-item strong {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
    }

    .pretest-info-item span {
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
    }

    .pretest-start-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 16px 40px;
        border: none;
        border-radius: 14px;
        font-size: 17px;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .pretest-start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .pretest-start-btn svg {
        flex-shrink: 0;
    }

    .countdown-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.85);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .countdown-number {
        font-size: 120px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1;
        animation: countdownPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    }

    .countdown-number:not(.countdown-pop) {
        font-size: 48px;
        animation: countdownFinal 0.5s ease;
    }

    @keyframes countdownPop {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
    }

    @keyframes countdownFinal {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }

    .countdown-label {
        font-size: 18px;
        color: rgba(255,255,255,0.6);
        margin-top: 20px;
        font-weight: 500;
    }

    @media (max-width: 768px) {
        .pretest-card {
            padding: 32px 24px;
            border-radius: 20px;
        }

        .pretest-title {
            font-size: 20px;
        }

        .pretest-info-item {
            padding: 14px 16px;
        }

        .countdown-number {
            font-size: 80px;
        }
    }

    /* === LEGACY COMPAT (keep old wizard classes minimal) === */
    .wizard-header-container { position: relative; width: 100%; }
    .wizard-cover { width: 100%; height: 180px; background-size: cover; background-position: center; }
    .wizard-step-counter { text-align: center; color: #94a3b8; font-size: 14px; font-weight: 500; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; }

    .question-title.wizard-title {
        font-size: 24px;
        text-align: center;
        font-weight: 600;
        color: #1e293b;
        margin: 8px 0 32px;
    }

    /* TIPO 1: Radio Buttons Custom */
    .options-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .custom-radio-option {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border: 1px solid #cbd5e0;
        border-radius: 12px;
        cursor: pointer;
        background-color: #ffffff;
        transition: all 0.2s ease;
    }

    .custom-radio-option:hover {
        background-color: #f8fafc;
        border-color: #5D9FCD;
    }

    /* WIZARD CARD MODIFIER FOR RADIOS (Pills) */
    .wizard-card .custom-radio-option {
        border-radius: 9999px;
        padding: 16px 24px;
        transition: all 0.3s ease;
        background-color: #f8fafc;
        border: 2px solid transparent;
    }

    .wizard-card .custom-radio-option:hover {
        background-color: #f1f5f9;
        transform: translateY(-2px);
    }

    /* Estado seleccionado: circulo azul y borde azul */
    .custom-radio-option input[type="radio"]:checked + .radio-circle {
        border-color: var(--primary-survey-color, #5D9FCD);
        background-color: var(--primary-survey-color, #5D9FCD);
    }

    .custom-radio-option.selected {
        background-color: rgba(93, 159, 205, 0.05); /* keep light blue shadow generic or use rgba color blending later */
        border-color: var(--primary-survey-color, #5D9FCD);
    }

    .wizard-card .custom-radio-option.selected {
        background-color: #ffffff;
        border-color: var(--primary-survey-color, #5D9FCD);
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    
    .radio-circle {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #cbd5e0;
        margin-right: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .custom-radio-option.selected .radio-circle {
        border-color: #5D9FCD;
    }

    .custom-radio-option.selected .radio-circle::after {
        content: '';
        width: 12px;
        height: 12px;
        background-color: #5D9FCD;
        border-radius: 50%;
    }

    .option-label {
        font-size: 16px;
        color: var(--color-texto-principal);
        font-weight: 500;
    }

    .custom-radio-option.selected .option-label {
        color: #2b3a4a;
        font-weight: 600;
    }

    /* TIPO 2: Escala 1 a 5 */
    .scale-container {
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }

    .scale-option {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
    }

    .scale-circle {
        width: 55px;
        height: 55px;
        border-radius: 50%;
        border: 2px solid #cbd5e0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 600;
        color: var(--color-texto-suave);
        background-color: #ffffff;
        transition: all 0.2s;
    }

    /* Escala Hover y Focus */
    .scale-option:hover {
        background-color: rgba(0,0,0,0.02);
        border-color: var(--primary-survey-color, #5D9FCD);
        color: var(--primary-survey-color, #5D9FCD);
    }

    .scale-option.selected {
        background-color: var(--primary-survey-color, #5D9FCD);
        color: #ffffff;
        border-color: var(--primary-survey-color, #5D9FCD);
        box-shadow: 0 4px 10px rgba(0,0,0, 0.15);
    }

    /* TIPO 12: Texto Abierto */
    .custom-textarea {
        width: 100%;
        box-sizing: border-box;
        height: 150px;
        resize: vertical;
        padding: 16px;
        border: 1px solid #cbd5e0;
        border-radius: 12px;
        font-size: 16px;
        font-family: inherit;
        color: var(--color-texto-principal);
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .custom-textarea:focus {
        border-color: var(--primary-survey-color, #5D9FCD);
        box-shadow: 0 4px 15px rgba(0,0,0, 0.08);
        background-color: #ffffff;
    }
    
    /* CUSTOM LIKERT UI (Emojis estrictos) */
    .faces-flex-row div {
        width: 55px; 
        height: 55px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 35px; 
        cursor: pointer; 
        opacity: 0.3; 
        filter: grayscale(100%); 
        transition: all 0.2s ease; 
        background: #fff; 
        border: none; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
    }
    
    .faces-flex-row div.active {
        opacity: 1; 
        filter: grayscale(0%); 
        transform: scale(1.15); 
        box-shadow: 0 5px 10px rgba(0,0,0,0.2); 
        border: 2px solid #ccc; 
    }

    /* TIPO 3: MATRIZ (Escritorio Grid, Móvil Apilado) */
    .matrix-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
    }

    /* TIPO 4: SLIDER RANGO */
    .slider-container {
        padding: 20px 0;
    }
    .custom-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        outline: none;
    }
    .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary-survey-color, #5D9FCD);
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .custom-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary-survey-color, #5D9FCD);
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        border: none;
    }/* MULTIMEDIA */
    .audio-wrapper {
        text-align: center;
        margin-bottom: 25px;
    }
    .audio-wrapper audio {
        width: 100%;
        border-radius: 8px;
    }

    /* NAVEGACIÓN */
    .navigation-actions {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
    }

    .nav-btn {
        flex: 1;
        padding: 18px 24px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        
    }

    .btn-prev {
        background-color: #e2e8f0;
        color: var(--color-texto-suave);
    }

    /* Botones especificos de WIZARD */
    .wizard-nav-wrapper {
        margin-top: 50px;
        width: 100%;
    }

    .wizard-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }

    .btn-prev-ghost {
        background-color: transparent;
        color: #94a3b8;
        font-weight: 600;
        border: none;
        padding: 14px 28px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
        
    }

    .btn-prev-ghost:hover {
        background-color: #f1f5f9;
        color: #64748b;
    }

    .btn-next-ghost {
        background-color: var(--primary-survey-color, #5D9FCD);
        color: #ffffff;
        font-weight: 600;
        border: none;
        padding: 14px 40px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
        
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .btn-next-ghost:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .btn-next-ghost:disabled {
        background-color: #cbd5e0 !important;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
    }

    .wizard-progress-track {
        height: 6px;
        width: 100%;
        background-color: #f1f5f9;
    }

    .wizard-progress-fill {
        height: 100%;
        background-color: var(--primary-survey-color, #5D9FCD);
        transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .btn-prev:not(:disabled):hover {
        background-color: #cbd5e0;
    }

    .btn-next, .btn-finish {
        background-color: var(--primary-survey-color, #2b3a4a);
        color: white;
    }

    .btn-next:hover:not([disabled]), .btn-finish:hover:not([disabled]) {
        box-shadow: 0 6px 15px rgba(0,0,0, 0.15);
        transform: translateY(-2px);
    }

    .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
        background-color: #cbd5e0;
        color: #94a3b8;
    }

    /* --- MEDIA QUERIES RESPONSIVE (MÓVILES) --- */
    @media (max-width: 768px) {
        .engine-wrapper {
            padding: 12px 8px;
        }

        .engine-wrapper.wizard-mode {
            padding: 8px;
        }

        .question-container {
            gap: 16px;
        }

        .card-header {
            padding: 16px 20px;
        }

        .header-title {
            font-size: 16px;
        }

        .card-body {
            padding: 24px 20px;
        }

        /* Textos reducidos para mejorar lectura */
        .question-title {
            font-size: 18px;
            margin-bottom: 20px;
        }

        .custom-radio-option {
            padding: 14px 16px;
        }

        .option-label {
            font-size: 15px;
        }

        .scale-circle {
            width: 45px;
            height: 45px;
            font-size: 16px;
        }
        
        .scale-container {
            gap: 5px;
        }

        /* Matriz Rota en Móvil (1 columna) */
        .matrix-grid {
            grid-template-columns: 1fr;
        }

        /* Botones 100% width apilados verticalmente */
        .navigation-actions {
            flex-direction: column;
            gap: 12px;
        }

        .nav-btn {
            width: 100%;
            padding: 18px;
        }

        /* === RESPONSIVE: WIZARD CARD === */
        .question-card.wizard-card {
            border-radius: 16px;
            max-width: 100%;
        }

        .wz-header-row {
            padding: 16px 20px 0;
            flex-wrap: wrap;
        }

        .wz-body {
            padding: 20px 20px 28px;
        }

        .wz-question-text {
            font-size: 20px;
            margin: 4px 0 24px;
        }

        .wz-nav-row {
            flex-direction: column;
            gap: 10px;
        }

        .wz-btn {
            width: 100%;
            justify-content: center;
            padding: 16px 24px;
        }

        .wz-btn-back {
            order: 2;
        }

        .wz-btn-next {
            order: 1;
        }

        .wz-footer {
            padding: 14px 20px 16px;
        }

        .wz-cover {
            height: 140px;
        }

        /* === RESPONSIVE: SURVEY CARD === */
        .sv-card {
            border-radius: 16px;
            max-width: 100%;
        }

        .sv-header {
            padding: 14px 18px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .sv-name {
            font-size: 14px;
        }

        .sv-body {
            padding: 24px 20px;
        }
    }

    .survey-input-custom:focus {
      border-color: var(--accent) !important;
      background-color: #ffffff !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
    }

    /* ANIMATIONS FOR TRANSITIONS */
    .anim-fade-in-next { animation: fade-in-next 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-fade-out-next { animation: fade-out-next 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-fade-in-prev { animation: fade-in-prev 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-fade-out-prev { animation: fade-out-prev 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes fade-in-next { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out-next { from { opacity: 1; } to { opacity: 0; } }
    @keyframes fade-in-prev { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out-prev { from { opacity: 1; } to { opacity: 0; } }

    .anim-slide-up-in-next { animation: slide-up-in-next 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-up-out-next { animation: slide-up-out-next 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-up-in-prev { animation: slide-up-in-prev 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-up-out-prev { animation: slide-up-out-prev 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes slide-up-in-next { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slide-up-out-next { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-30px); } }
    @keyframes slide-up-in-prev { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slide-up-out-prev { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(30px); } }

    .anim-slide-right-in-next { animation: slide-right-in-next 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-right-out-next { animation: slide-right-out-next 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-right-in-prev { animation: slide-right-in-prev 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide-right-out-prev { animation: slide-right-out-prev 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes slide-right-in-next { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slide-right-out-next { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-30px); } }
    @keyframes slide-right-in-prev { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slide-right-out-prev { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30px); } }
    
    .anim-zoom-in-next { animation: zoom-in-next 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-zoom-out-next { animation: zoom-out-next 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-zoom-in-prev { animation: zoom-in-prev 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-zoom-out-prev { animation: zoom-out-prev 0.25s forwards cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes zoom-in-next { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes zoom-out-next { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.05); } }
    @keyframes zoom-in-prev { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
    @keyframes zoom-out-prev { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }

  `]

})
export class QuestionEngineComponent implements OnInit, OnDestroy {
  testId: string | null = null;
  testName: string = '';
  currentIndex: number = 0;
  questions: any[] = [];
  isLoading: boolean = true;
  themeColor: string = '#5D9FCD';
  presentationMode: 'scroll' | 'card' = 'card';
  backgroundTemplate: string = 'default';
  animationStyle: string = 'none';
  animatingClass: string = '';
  readonly actuayaLogoFull = LOGO_FULL;
  testImageUrl: string | null = null;
  isSurvey: boolean = false;
  isSurveyCompleted: boolean = false;
  isLoadingSubmit: boolean = false;
  completionMessage: string = 'Gracias por completar esta encuesta. Tus respuestas han sido registradas.';
  companyLogoUrl: string | null = null;
  allowNavButtons: boolean = true;

  // TOAST SYSTEM
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'warning' | 'error',
    isFadingOut: false
  };

  showToastMessage(msg: string, type: 'success' | 'warning' | 'error' = 'warning') {
    this.toast.message = msg;
    this.toast.type = type;
    this.toast.isFadingOut = false;
    this.toast.show = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.isFadingOut = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.toast.show = false;
        this.cdr.detectChanges();
      }, 300); // Wait for CSS fade out
    }, 3500); // Show for 3.5 seconds
  }

  // Variables Motor de Tiempo
  limiteMinutos: number = 0;
  mostrarReloj: boolean = true;
  tiempoTranscurrido: number = 0;
  tiempoRestante: number = 0;
  timerInterval: any;

  // Pre-test screen & countdown
  showPreTestScreen: boolean = false;
  showCountdown: boolean = false;
  countdownValue: number = 3;

  // AUTO-SAVE STATUS INDICATOR (Idea #5)
  saveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  private saveStatusTimer: any = null;
  private hasUnsavedProgress: boolean = false;

  /** Wraps stateService.saveAnswer with visual feedback */
  trackSave(questionId: string, value: any) {
    this.saveStatus = 'saving';
    this.hasUnsavedProgress = true;
    this.cdr.detectChanges();

    this.stateService.saveAnswer(questionId, value);

    // Simulate brief saving state for UX
    setTimeout(() => {
      this.saveStatus = 'saved';
      this.cdr.detectChanges();

      if (this.saveStatusTimer) clearTimeout(this.saveStatusTimer);
      this.saveStatusTimer = setTimeout(() => {
        this.saveStatus = 'idle';
        this.cdr.detectChanges();
      }, 2500);
    }, 300);
  }

  // beforeunload handler — warns user if they try to close tab with in-progress assessment
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedProgress && !this.isSurveyCompleted) {
      event.preventDefault();
      // Most browsers ignore custom messages and show their own
      event.returnValue = 'Tienes respuestas sin enviar. ¿Seguro que deseas salir?';
      return event.returnValue;
    }
    return undefined;
  }

  textForm!: FormGroup;

  get questionAsArray() {
    return this.visibleQuestions;
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  getQuestionGlobalIndex(question: any): number {
    return this.visibleQuestions.findIndex(q => q.id === question.id);
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private stateService = inject(AssessmentStateService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  get currentQuestion() {
    return this.visibleQuestions[this.currentIndex] || null;
  }

  get totalQuestions() {
    return this.visibleQuestions.length;
  }

  get visibleQuestions() {
    if (!this.questions) return [];
    return this.questions.filter(q => this.isQuestionVisible(q));
  }

  isQuestionVisible(question: any): boolean {
    // Buscar si alguna pregunta anterior tiene una regla apuntando a esta
    const isTargetOf = this.questions.filter(prevQ =>
      prevQ.conditionalLogic && prevQ.conditionalLogic.some((r: any) => r.targetQuestionId === question.id)
    );

    // Si no es destino de ninguna regla, se muestra por defecto
    if (isTargetOf.length === 0) return true;

    // Si es destino, se muestra SÓLO SI se cumple alguna de las reglas que la apuntan
    const stateAnswers = this.stateService.getCurrentState().answers;

    return isTargetOf.some(prevQ => {
      const attempt = stateAnswers.find(a => a.questionId === prevQ.id);
      if (!attempt) return false;

      let selectedLabel = attempt.value;

      // Si el value es un ID de opción (opción múltiple), buscaremos el label asociado
      const selectedOption = prevQ.options?.find((o: any) => o.id === attempt.value || String(o.id) === String(attempt.value));
      if (selectedOption) {
        selectedLabel = selectedOption.label;
      } else if (prevQ.typeId === '1' && prevQ.options?.length) {
        // Fallback just in case values were somehow mismatched types
        const fallbackOption = prevQ.options?.find((o: any) => o.label === attempt.value);
        if (fallbackOption) selectedLabel = fallbackOption.label;
      }

      return prevQ.conditionalLogic.some((r: any) =>
        String(r.targetQuestionId) === String(question.id) &&
        String(r.triggerValue).toLowerCase() === String(selectedLabel).toLowerCase()
      );
    });
  }

  get isLastQuestion() {
    return this.currentIndex === this.questions.length - 1;
  }

  get progressPercentage() {
    if (this.totalQuestions === 0) return 0;
    return Math.round(((this.currentIndex) / this.totalQuestions) * 100);
  }

  get getMotivationalText(): string {
    const p = this.progressPercentage;
    if (p === 0) return '¡Empecemos!';
    if (p > 0 && p < 25) return '¡Buen comienzo!';
    if (p >= 25 && p < 50) return 'Sigue así, vas muy bien.';
    if (p >= 50 && p < 75) return '¡Ya pasaste la mitad!';
    if (p >= 75 && p < 99) return '¡Último esfuerzo, ya casi!';
    if (p >= 99) return '¡Listo para enviar!';
    return '';
  }

  ngOnInit(): void {
    this.testId = this.route.snapshot.paramMap.get('id');
    if (!this.testId) {
      this.router.navigate(['/']);
      return;
    }

    // ── LIMPIEZA TOTAL: cada encuesta/test inicia de cero ──
    // Crítico para profesionales de campo que aplican múltiples encuestas seguidas
    this.stateService.clearState();

    // Reset component-level variables
    this.currentIndex = 0;
    this.isSurveyCompleted = false;
    this.isLoadingSubmit = false;
    this.forceShowErrors = false;
    this.tiempoTranscurrido = 0;
    this.tiempoRestante = 0;
    this.saveStatus = 'idle';
    this.animatingClass = '';
    this.isUploadingMap = {};
    this.fileDataMap = {};
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Inicializar estado limpio
    this.stateService.setTestId(this.testId);
    this.stateService.setDemographics('No definido', 0, Date.now());

    this.textForm = this.fb.group({ openText: [''] });

    this.loadEngineQuestions();

    this.textForm.valueChanges.subscribe(val => {
      if (this.currentQuestion && this.currentQuestion.typeId === '12') {
        this.trackSave(this.currentQuestion.id, val.openText);
      }
    });
  }

  private loadEngineQuestions() {
    this.isLoading = true;
    this.http.get<any>(`/api/test/${this.testId}`).subscribe({
      next: (res) => {
        if (res.datos) {
          this.testName = (res.datos.info && res.datos.info.titulo) ? res.datos.info.titulo : 'Evaluación en curso';
          const infoData = res.datos.info || {};
          this.limiteMinutos = (infoData.tiempoLimiteActivo && infoData.tiempoLimiteMinutos > 0)
            ? parseFloat(infoData.tiempoLimiteMinutos)
            : ((infoData.limite) ? parseFloat(infoData.limite) : 0);
          let loadedColor = (res.datos.info && (res.datos.info.themeColor || res.datos.info.color)) ? (res.datos.info.themeColor || res.datos.info.color) : 'var(--accent)';
          if (typeof loadedColor === 'string' && loadedColor.includes('||')) {
            loadedColor = loadedColor.split('||')[0] || 'var(--accent)';
          }
          let loadedMode = (res.datos.info && res.datos.info.presentationMode) ? res.datos.info.presentationMode : 'card';
          let loadedBg = (res.datos.info && res.datos.info.backgroundTemplate) ? res.datos.info.backgroundTemplate : 'default';

          // Bypass agresivo 2: Descripcion metadata
          if (res.datos.info && res.datos.info.descripcion && res.datos.info.descripcion.includes('|||CONFIG:')) {
            try {
              const parts = res.datos.info.descripcion.split('|||CONFIG:');
              const jsonString = parts[1].split('|||')[0];
              const config = JSON.parse(jsonString);
              loadedColor = config.color || loadedColor;
              loadedMode = config.mode || loadedMode;
              loadedBg = config.bg || loadedBg;
              if (config.animationStyle) this.animationStyle = config.animationStyle;
              if (config.completionMessage) {
                this.completionMessage = decodeURIComponent(atob(config.completionMessage));
              }
            } catch (e) { console.error("Error parseando config secreta public", e); }
          }

          if (res.datos.info && res.datos.info.animationStyle) {
            this.animationStyle = res.datos.info.animationStyle;
          }

          this.themeColor = loadedColor;
          this.presentationMode = 'card'; // Forzado a card mode por defecto para evitar listas largas
          this.backgroundTemplate = loadedBg;
          this.testImageUrl = (res.datos.info && (res.datos.info.imagenCabecera || res.datos.info.imageUrl)) ? (res.datos.info.imagenCabecera || res.datos.info.imageUrl) : null;
          this.companyLogoUrl = (res.datos.info && res.datos.info.companyLogoUrl) ? res.datos.info.companyLogoUrl : null;
          this.allowNavButtons = (res.datos.info && res.datos.info.allowNavButtons === false) ? false : true;
          this.mostrarReloj = (res.datos.info && res.datos.info.mostrarReloj === false) ? false : true;
          const pTipo = (res.datos.info && res.datos.info.tipo) ? res.datos.info.tipo.toLowerCase() : '';
          const pNombre = (this.testName || '').toLowerCase();
          const isSurveyRoute = this.router.url.includes('/survey');
          this.isSurvey = isSurveyRoute || (pTipo === 'encuesta' || pNombre.includes('encuesta') || pNombre.includes('programa') || pNombre.includes('formulario'));

          if (res.datos.preguntas) {
            let incomingQuestions = res.datos.preguntas;

            // Extraer y ocultar El Caballo de Troya (SYSTEM_SETTINGS)
            const settingsIndex = incomingQuestions.findIndex((q: any) => String(q.text) === 'SYSTEM_SETTINGS' || String(q.textoPregunta) === 'SYSTEM_SETTINGS' || String(q.id) === 'SYSTEM_SETTINGS');
            if (settingsIndex !== -1) {
              const settingsQuestion = incomingQuestions[settingsIndex];
              if (settingsQuestion.color) this.themeColor = settingsQuestion.color;
              if (settingsQuestion.presentationMode) this.presentationMode = settingsQuestion.presentationMode;
              if (settingsQuestion.backgroundTemplate) this.backgroundTemplate = settingsQuestion.backgroundTemplate;
              if (settingsQuestion.completionMessage) this.completionMessage = settingsQuestion.completionMessage;
              if (settingsQuestion.completionMessage) this.completionMessage = settingsQuestion.completionMessage;
              if (settingsQuestion.completionMessage) this.completionMessage = settingsQuestion.completionMessage;

              if (settingsQuestion.options && settingsQuestion.options.length > 0) {
                try {
                  const fallbackStr = typeof settingsQuestion.options[0] === 'string' ? settingsQuestion.options[0] : settingsQuestion.options[0].label || settingsQuestion.options[0].value;
                  const parseData = JSON.parse(fallbackStr);
                  if (parseData.color) this.themeColor = parseData.color;
                  this.presentationMode = 'card'; // Fuerza el modo tarjeta
                  this.backgroundTemplate = parseData.bg; // Corrected line
                  if (parseData.completionMessage) this.completionMessage = parseData.completionMessage;
                  if (parseData.completionMessage) this.completionMessage = parseData.completionMessage;
                  if (parseData.completionMessage) this.completionMessage = parseData.completionMessage;
                } catch (e) {
                  const forcedMode = String(settingsQuestion.options[0].label || settingsQuestion.options[0].value || settingsQuestion.options[0]);
                  if (forcedMode === 'scroll' || forcedMode === 'card') {
                    this.presentationMode = forcedMode;
                  }
                }
              }
              // Remover la pregunta espía para que el usuario no la vea
              incomingQuestions.splice(settingsIndex, 1);
            }

            // Forzar MODO CARD de manera definitiva en el frontend para evitar listas de preguntas infintas debido a config vieja en base de datos.
            this.presentationMode = 'card';

            this.questions = incomingQuestions.map((q: any) => {
              // Ensure typeId is available for the ngSwitch, using tipo as fallback if missing. 
              // Without this, ngSwitch defaults to 1 or default, ruining 'escala' logic.
              q.typeId = q.typeId || q.tipo;

              if (q.typeId === 'text' || q.tipo === 'text') {
                const originalIntent = String(q.id || '').split('-')[0];
                if (['corta', 'parrafo', 'full_name', 'age', 'occupation', 'education', 'city', 'country', 'email', 'id_number'].includes(originalIntent)) {
                  q.typeId = originalIntent;
                } else {
                  q.typeId = 'corta';
                }
              }

              // Normalización estricta para asegurar que Likert cae en la plantilla correcta
              if (q.type === 'escala' || q.tipo === 'escala' || q.typeId === 'escala' || q.type === 'likert' || q.typeId === '2') {
                q.typeId = 'escala';
              } else if (q.options && q.options.length === 5) {
                // Fallback para encuestas heredadas importadas sin tipo 'escala' exacto pero con valores Likert idénticos
                const opts = q.options.map((o: any) => String(o.id || o.value || o.texto || o.label || o).trim());
                const lowercaseText = String(q.text || q.texto || q.textoPregunta || '').toLowerCase();
                if (opts.join(',') === '1,2,3,4,5' && lowercaseText.includes('escala')) {
                  q.typeId = 'escala';
                }
              }

              return q;
            });


            // Re-initialize dynamic text forms for all text questions if mode is scroll
            let formControls: any = {};
            const textTypes = ['12', 'corta', 'parrafo', 'email', 'id_number', 'age', 'full_name', 'occupation', 'city', 'country', 'text', 'fecha', 'moneda', 'firma'];
            this.questions.forEach(q => {
              if (textTypes.includes(q.typeId) || !q.options || q.options.length === 0) {
                formControls[`openText_${q.id}`] = [''];
              }
            });
            this.textForm = this.fb.group(formControls);

            this.syncFormWithState();
          }
          this.iniciarReloj();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching questions from express JSON api', err);
        this.questions = [];
        this.isLoading = false;
      }
    });
  }

  private syncFormWithState() {
    if (!this.currentQuestion) return;

    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === this.currentQuestion.id);
    const textTypes = ['12', 'corta', 'parrafo', 'email', 'id_number', 'age', 'full_name', 'occupation', 'city', 'country', 'text'];

    if (textTypes.includes(this.currentQuestion.typeId) || !this.currentQuestion.options || this.currentQuestion.options.length === 0) {
      const openTextKey = `openText_${this.currentQuestion.id}`;
      this.textForm.patchValue({ [openTextKey]: attempt ? attempt.value : '' }, { emitEvent: false });
    }
  }

  forceShowErrors: boolean = false;

  public onInputChange(q: any, event: any): void {
    let value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;

    // Strict sanitization for full_name
    if (q.typeId === 'full_name') {
      value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
      event.target.value = value;
    }

    this.saveTextAnswerSafe(q.id, value);
    this.forceShowErrors = false; // Hide error while typing
    this.cdr.detectChanges();
  }

  handleEnterKey(event: Event) {
    event.preventDefault(); // Prevent standard form submission behavior

    // Solo permitir auto-avance por enter en modo wizard/tarjeta, no en scroll continuo
    if (this.presentationMode === 'card') {
      if (this.hasAnsweredCurrent()) {
        if (this.isLastQuestion) {
          if (this.isSurvey) {
            this.goNext();
          } else {
            this.onFinishTest();
          }
        } else {
          this.goNext();
        }
      } else {
        this.forceShowErrors = true;
        this.cdr.detectChanges();
      }
    }
  }


  getAnswerValue(questionId: string): string {
    const attempt = this.stateService.getCurrentState().answers.find(a => a.questionId === questionId);
    return attempt && attempt.value ? attempt.value : '';
  }

  saveTextAnswerSafe(questionId: string, value: string) {
    this.trackSave(questionId, value);
    const openTextKey = 'openText_' + questionId;
    if (this.textForm.controls[openTextKey]) {
      this.textForm.controls[openTextKey].setValue(value, { emitEvent: false });
    }
  }

  showInputError(q: any): boolean {
    if (!this.forceShowErrors) return false;
    // Optional questions never show errors
    if (q.obligatoria === false) return false;
    // Use the same validation as the navigation guard
    return !this.hasQuestionAnswer(q);
  }

  getErrorMessage(q: any): string {
    const textTypes = ['12', 'corta', 'email', 'id_number', 'parrafo', 'full_name', 'age', 'occupation', 'city', 'country', 'text'];
    if (textTypes.includes(q.typeId)) {
      if (q.typeId === 'full_name') return 'Ingresa un nombre válido (solo letras)';
      return 'Este campo es obligatorio';
    }
    return 'Selecciona una respuesta para continuar';
  }

  selectOptionForQuestion(question: any, optionId: string) {
    this.trackSave(question.id, optionId);

    if (this.presentationMode === 'card') {
      if (!this.requiereBotonAvance()) {
        setTimeout(() => {
          if (this.isLastQuestion) {
            // Note: In Survey scenarios, they might need to hit a final submit
            // we will let the goNext handle this state, or standard finish
            if (this.isSurvey) {
              this.goNext();
            } else {
              this.onFinishTest();
            }
          } else {
            this.goNext();
          }
        }, 450);
      }
    }
  }

  requiereBotonAvance(): boolean {
    // Always require the "Siguiente" button — no auto-advance
    return true;
  }

  isOptionSelected(question: any, optionId: string): boolean {
    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === question.id);
    return attempt ? attempt.value === optionId : false;
  }

  // ── Multi-select (casillas de verificación) ──
  toggleCheckboxOption(question: any, optionId: string) {
    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === question.id);
    let currentSelections: string[] = [];
    if (attempt && attempt.value) {
      currentSelections = String(attempt.value).split(',').filter(v => v.length > 0);
    }
    const idx = currentSelections.indexOf(optionId);
    if (idx > -1) {
      currentSelections.splice(idx, 1);
    } else {
      currentSelections.push(optionId);
    }
    const newValue = currentSelections.join(',');
    this.trackSave(question.id, newValue);
  }

  isCheckboxSelected(question: any, optionId: string): boolean {
    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === question.id);
    if (!attempt || !attempt.value) return false;
    const selections = String(attempt.value).split(',');
    return selections.includes(optionId);
  }

  hasAnsweredCurrent(): boolean {
    if (!this.currentQuestion) return false;
    return this.hasQuestionAnswer(this.currentQuestion);
  }

  hasAnsweredAllVisible(): boolean {
    return this.visibleQuestions.every(q => this.hasQuestionAnswer(q));
  }

  private hasQuestionAnswer(question: any): boolean {
    // Optional questions (obligatoria === false) can always be skipped
    if (question.obligatoria === false) return true;

    const textTypes = ['12', 'corta', 'email', 'id_number', 'parrafo', 'full_name', 'age', 'occupation', 'city', 'country', 'text', 'fecha', 'moneda'];

    // Informative-only blocks (no response needed)
    const purelyInformative = question.typeId === 'section_title' || question.typeId === 'section_text' || question.typeId === '14';
    if (purelyInformative) return true;

    // Non-text, non-option questions with no options AND not marked as obligatory — treat as informative
    if (!textTypes.includes(question.typeId) && (!question.options || question.options.length === 0)) {
      return true;
    }

    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === question.id);

    if (textTypes.includes(question.typeId)) {
      if (!attempt || attempt.value === undefined || attempt.value === null) return false;
      const val = String(attempt.value).trim();
      if (val.length === 0) return false;

      if (question.typeId === 'full_name') {
        return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,}$/.test(val);
      }
      return true;
    }

    if (question.typeId === 'file' || question.typeId === 'firma') {
      if (!attempt || attempt.value === undefined || attempt.value === null) return false;
      const v = String(attempt.value);
      return v.startsWith('/api/uploads/') || v.startsWith('/uploads/') || v.startsWith('data:image');
    }

    // Selection-based questions (radio, multiple, escala, casillas, etc.)
    // Must have a saved answer
    if (!attempt) return false;
    if (attempt.value === undefined || attempt.value === null || attempt.value === '') return false;
    return true;
  }

  goNext() {
    if (!this.hasAnsweredCurrent()) {
      this.forceShowErrors = true;
      return;
    }

    this.forceShowErrors = false;
    if (this.currentIndex < this.visibleQuestions.length - 1) {
      this.triggerAnimation('next', () => {
        this.currentIndex++;
        this.syncFormWithState();
      });
    }
  }

  goPrevious() {
    if (this.currentIndex > 0) {
      this.triggerAnimation('prev', () => {
        this.currentIndex--;
        this.syncFormWithState();
      });
    }
  }

  triggerAnimation(direction: 'next' | 'prev', callback: () => void) {
    if (this.animationStyle === 'none' || !this.animationStyle) {
      callback();
      this.cdr.detectChanges();
      return;
    }

    // Assign class to animate out
    this.animatingClass = `anim-${this.animationStyle}-out-${direction}`;
    this.cdr.detectChanges();

    setTimeout(() => {
      callback();
      // Assign class to animate in
      this.animatingClass = `anim-${this.animationStyle}-in-${direction}`;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.animatingClass = ''; // reset
        this.cdr.detectChanges();
      }, 300); // 300ms in CSS animation
    }, 250); // wait for out animation slightly less than total
  }

  iniciarReloj() {
    // If no time limit and it's a survey, skip timer entirely
    if (this.isSurvey && this.limiteMinutos <= 0) {
      return;
    }

    // Start timer directly — the warning was already shown in test-access
    this.startTimerInternal();
  }

  /** Called when user clicks "Estoy listo" on pre-test screen */
  onStartTestConfirmed() {
    this.showPreTestScreen = false;
    this.showCountdown = true;
    this.countdownValue = 3;
    this.cdr.detectChanges();

    const countdownInterval = setInterval(() => {
      this.countdownValue--;
      this.cdr.detectChanges();

      if (this.countdownValue <= 0) {
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.showCountdown = false;
          this.startTimerInternal();
          this.cdr.detectChanges();
        }, 800);
      }
    }, 1000);
  }

  private startTimerInternal() {
    if (this.limiteMinutos > 0) {
      this.tiempoRestante = this.limiteMinutos * 60;
    }

    this.timerInterval = setInterval(() => {
      this.tiempoTranscurrido++;

      if (this.limiteMinutos > 0) {
        this.tiempoRestante--;
        if (this.tiempoRestante <= 0) {
          clearInterval(this.timerInterval);
          this.finalizarTestAutomatico();
        }
      }
    }, 1000);
  }

  formatear(segundosTotales: number): string {
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  finalizarTestAutomatico() {
    this.showToastMessage('El tiempo límite se agotó. Guardando resultados...', 'warning');
    // Dar un micro tiempo extra para que el usuario lea el toast si fue repentino
    setTimeout(() => {
      this.onFinishTest();
    }, 1500);
  }


  // Lógicas de Archivos
  isFileUploaded(questionId: string): boolean {
    const stateAnswers = this.stateService.getCurrentState().answers;
    const attempt = stateAnswers.find(a => a.questionId === questionId);
    return attempt && attempt.value && (attempt.value.startsWith('/api/') || attempt.value.startsWith('/uploads/'));
  }

  isUploadingMap: { [key: string]: boolean } = {};
  fileDataMap: { [key: string]: any } = {};

  isUploading(questionId: string): boolean {
    return !!this.isUploadingMap[questionId];
  }

  getFileData(questionId: string): any {
    return this.fileDataMap[questionId] || { originalName: 'Archivo adjunto' };
  }

  getAcceptTypes(q: any): string {
    if (q.allowedFileTypes === 'image') return 'image/jpeg,image/png,image/webp';
    if (q.allowedFileTypes === 'pdf') return 'application/pdf';
    return 'image/jpeg,image/png,image/webp,application/pdf';
  }

  onFileSelected(q: any, event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showToastMessage('El archivo excede el límite de 5MB.', 'error');
      return;
    }

    this.isUploadingMap[q.id] = true;
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = '/api/uploads/surveys';

    this.http.post(uploadUrl, formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stateService.saveAnswer(q.id, res.filePath);
          this.fileDataMap[q.id] = { originalName: res.originalName, size: res.size };
        } else {
          this.showToastMessage(res.error || 'Error al subir', 'error');
        }
        this.isUploadingMap[q.id] = false;
      },
      error: (err) => {
        this.showToastMessage('Error subiendo archivo. Intente de nuevo.', 'error');
        this.isUploadingMap[q.id] = false;
      }
    });
  }

  removeFile(questionId: string) {
    this.trackSave(questionId, '');
    delete this.fileDataMap[questionId];
  }

  submitSurvey() {
    // Validate the current (last) question before submitting
    if (!this.hasAnsweredCurrent()) {
      this.forceShowErrors = true;
      this.cdr.detectChanges();
      return;
    }

    if (this.isSurvey) {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.isLoadingSubmit = true;
      this.stateService.finishAssessment(this.tiempoTranscurrido);
      const stateDetails = this.stateService.getCurrentState();

      const finalPayload = {
        metadata: {
          timestamp: Date.now(),
          evalId: stateDetails.testId || this.testId,
          timeSpentSeconds: stateDetails.tiempoTranscurrido || 0
        },
        demographics: {
          gender: stateDetails.gender || 'NR',
          birthYear: stateDetails.birthYear || 'NR'
        },
        assessmentState: stateDetails.answers // Added this line back
      };

      const surveySubmitUrl = '/api/encuestas/submit';

      this.http.post(surveySubmitUrl, finalPayload).subscribe({
        next: (res: any) => {
          this.isLoadingSubmit = false;
          if (res.success) {
            this.isSurveyCompleted = true;
            this.hasUnsavedProgress = false;
            this.stateService.clearState();
          } else {
            this.showToastMessage('Error de Red: ' + (res.message || 'Intenta de nuevo'), 'error');
          }
        },
        error: (err) => {
          this.isLoadingSubmit = false;
          console.error("SURVEY SUBMIT ERROR", err);
          this.showToastMessage('No logramos conectar con el servidor. Intenta de nuevo.', 'error');
        }
      });
    } else {
      this.onFinishTest();
    }
  }

  onFinishTest() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.stateService.finishAssessment(this.tiempoTranscurrido);

    // Idea 7: Retener al usuario 2 a 3 segundos en una pantalla de Éxito
    // y dar sensación psicológica de cierre cognitivo.
    this.isSurveyCompleted = true;
    this.hasUnsavedProgress = false;

    setTimeout(() => {
      this.router.navigate(['/analyzing', this.testId]);
    }, 2800); // Demora la redirección en Tests
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // --- FIRMA (Signature Pad) ---
  private signing = false;
  private signCtx: CanvasRenderingContext2D | null = null;

  startSign(e: MouseEvent, qId: string) {
    const canvas = document.getElementById('canvas_firma_' + qId) as HTMLCanvasElement;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.signCtx = canvas.getContext('2d');
    if (!this.signCtx) return;
    this.signing = true;
    this.signCtx.lineWidth = 2;
    this.signCtx.lineCap = 'round';
    this.signCtx.strokeStyle = '#1e293b';
    const rect = canvas.getBoundingClientRect();
    this.signCtx.beginPath();
    this.signCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  drawSign(e: MouseEvent, qId: string) {
    if (!this.signing || !this.signCtx) return;
    const canvas = document.getElementById('canvas_firma_' + qId) as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.signCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.signCtx.stroke();
  }

  startSignTouch(e: TouchEvent, qId: string) {
    e.preventDefault();
    const canvas = document.getElementById('canvas_firma_' + qId) as HTMLCanvasElement;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.signCtx = canvas.getContext('2d');
    if (!this.signCtx) return;
    this.signing = true;
    this.signCtx.lineWidth = 2;
    this.signCtx.lineCap = 'round';
    this.signCtx.strokeStyle = '#1e293b';
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    this.signCtx.beginPath();
    this.signCtx.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawSignTouch(e: TouchEvent, qId: string) {
    e.preventDefault();
    if (!this.signing || !this.signCtx) return;
    const canvas = document.getElementById('canvas_firma_' + qId) as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    this.signCtx.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.signCtx.stroke();
  }

  endSign(q: any) {
    this.signing = false;
    const canvas = document.getElementById('canvas_firma_' + q.id) as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      this.saveTextAnswerSafe(q.id, dataUrl);
    }
  }

  clearSignature(qId: string) {
    const canvas = document.getElementById('canvas_firma_' + qId) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.saveTextAnswerSafe(qId, '');
    }
  }
}
