import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChartExportService, ExportDataSet } from '../../shared/services/chart-export.service';

interface SprintData {
  semana: number;
  habilidad: string;
  estado: string;
  diaInspiracion: { contenido?: string; tipo?: string; completado: boolean };
  diaMicroAccion: { instruccion?: string; completado: boolean };
  diaCheckIn: { respuesta?: string };
}

interface PlanPublico {
  _id: string;
  candidatoNombre: string;
  puntajeBase: number;
  dimensionesDetectadas: { nombre: string; puntaje: number; nivel: string }[];
  sprints: SprintData[];
  registrosEmocionales: { fecha: string; nivel: number; emocion: string }[];
  victorias: { fecha: string; descripcion: string }[];
  estado: string;
  progreso: number;
  createdAt: string;
}

@Component({
  selector: 'app-entrenamiento-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Loading -->
<div class="hub-loading" *ngIf="loading">
  <div class="loader-ring"></div>
  <p>Cargando tu plan...</p>
</div>

<!-- Error -->
<div class="hub-error" *ngIf="!loading && error">
  <div class="error-icon">🔒</div>
  <h2>Plan no encontrado</h2>
  <p>El enlace puede haber expirado o ser incorrecto. Contacta a tu administrador.</p>
</div>

<!-- Main Hub -->
<div class="hub" *ngIf="!loading && !error && plan">

  <!-- ══ PWA INSTALL BANNER ══ -->
  <div class="pwa-banner" *ngIf="showInstallBanner" (click)="installPWA()">
    <div class="pwa-banner-icon">📲</div>
    <div class="pwa-banner-text">
      <strong>Agregar a Inicio</strong>
      <span>Accede más rápido desde tu celular</span>
    </div>
    <button class="pwa-banner-close" (click)="$event.stopPropagation(); showInstallBanner = false">✕</button>
  </div>

  <!-- ══ NOTIFICATION PERMISSION BANNER ══ -->
  <div class="notif-banner" *ngIf="showNotifBanner" (click)="requestNotifications()">
    <div class="notif-banner-icon">🔔</div>
    <div class="notif-banner-text">
      <strong>Activar recordatorios</strong>
      <span>Te avisaremos cada día qué tarea tienes pendiente</span>
    </div>
    <button class="notif-banner-close" (click)="$event.stopPropagation(); showNotifBanner = false">✕</button>
  </div>

  <!-- Header -->
  <header class="hub-header">
    <div class="hub-header-inner">
      <div class="hub-greeting">
        <span class="greeting-emoji">{{ getGreetingEmoji() }}</span>
        <div>
          <p class="greeting-time">{{ getGreetingText() }}</p>
          <h1 class="greeting-name">{{ plan.candidatoNombre }}</h1>
        </div>
      </div>
      <div class="hub-progress-ring">
        <svg viewBox="0 0 36 36" class="circular-chart">
          <path class="circle-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
          <path class="circle" [attr.stroke-dasharray]="plan.progreso + ', 100'" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
        <span class="progress-pct">{{ plan.progreso }}%</span>
      </div>
      <button class="export-fab" (click)="exportarProgreso()" title="Exportar mi progreso">
        📄
      </button>
    </div>
  </header>

  <!-- ══════════════════════════════════════════════ -->
  <!-- ══ TAREA DE HOY — Focus Card ══ -->
  <!-- ══════════════════════════════════════════════ -->
  <section class="hub-section" *ngIf="sprintActual && tareaDeHoy">
    <div class="today-card" [ngClass]="'today-' + tareaDeHoy.tipo">
      <div class="today-top-row">
        <span class="today-badge">📌 Tarea de Hoy</span>
        <span class="today-day-label">{{ tareaDeHoy.diaLabel }}</span>
      </div>
      <div class="today-emoji">{{ tareaDeHoy.emoji }}</div>
      <h2 class="today-title">{{ tareaDeHoy.titulo }}</h2>
      <p class="today-desc">{{ tareaDeHoy.descripcion }}</p>

      <!-- Content preview (if inspiracion) -->
      <div class="today-preview" *ngIf="tareaDeHoy.tipo === 'inspiracion' && sprintActual.diaInspiracion?.contenido">
        <p>{{ (sprintActual.diaInspiracion?.contenido || '').slice(0, 150) }}{{ (sprintActual.diaInspiracion?.contenido || '').length > 150 ? '...' : '' }}</p>
      </div>
      <div class="today-preview" *ngIf="tareaDeHoy.tipo === 'accion' && sprintActual.diaMicroAccion?.instruccion">
        <p>{{ (sprintActual.diaMicroAccion?.instruccion || '').slice(0, 150) }}{{ (sprintActual.diaMicroAccion?.instruccion || '').length > 150 ? '...' : '' }}</p>
      </div>

      <button class="today-action-btn" *ngIf="!tareaDeHoy.completada" (click)="abrirTareaDeHoy()">
        {{ tareaDeHoy.accionLabel }}
      </button>
      <div class="today-done" *ngIf="tareaDeHoy.completada">
        ✅ ¡Completada! Vuelve mañana para tu próxima tarea.
      </div>

      <!-- Subtle sprint context -->
      <div class="today-sprint-ctx">
        <span>Semana {{ sprintActual.semana }}</span>
        <span>·</span>
        <span>{{ sprintActual.habilidad }}</span>
      </div>
    </div>
  </section>

  <!-- All done for today -->
  <section class="hub-section" *ngIf="sprintActual && !tareaDeHoy">
    <div class="today-card today-rest">
      <div class="today-emoji">🎉</div>
      <h2 class="today-title">¡Todo al día!</h2>
      <p class="today-desc">Ya completaste todas las tareas de esta semana. Descansa, reflexiona o explora las herramientas abajo.</p>
    </div>
  </section>

  <!-- Plan completed -->
  <section class="hub-section" *ngIf="!sprintActual && plan.progreso >= 100">
    <div class="today-card today-complete">
      <div class="today-emoji">🏆</div>
      <h2 class="today-title">¡Plan Completado!</h2>
      <p class="today-desc">Has terminado todos los sprints. ¡Felicidades por tu dedicación!</p>
    </div>
  </section>

  <!-- Sprint Actual Card -->
  <section class="hub-section" *ngIf="sprintActual">
    <div class="sprint-hero-card">
      <div class="sprint-hero-top">
        <span class="sprint-week-badge">Semana {{ sprintActual.semana }}</span>
        <span class="sprint-status-dot"></span>
      </div>
      <h2 class="sprint-hero-title">{{ sprintActual.habilidad }}</h2>
      <p class="sprint-hero-desc">Tu misión de esta semana</p>

      <!-- 3-Day Progress -->
      <div class="day-progress">
        <div class="day-step" [class.done]="sprintActual.diaInspiracion?.completado" (click)="vistaActual = 'inspiracion'">
          <div class="day-icon">🌟</div>
          <span class="day-label">Inspiración</span>
          <span class="day-status">{{ sprintActual.diaInspiracion?.completado ? '✓' : 'Día 1' }}</span>
        </div>
        <div class="day-connector" [class.filled]="sprintActual.diaInspiracion?.completado"></div>
        <div class="day-step" [class.done]="sprintActual.diaMicroAccion?.completado" (click)="vistaActual = 'accion'">
          <div class="day-icon">⚡</div>
          <span class="day-label">Micro-Acción</span>
          <span class="day-status">{{ sprintActual.diaMicroAccion?.completado ? '✓' : 'Día 3' }}</span>
        </div>
        <div class="day-connector" [class.filled]="sprintActual.diaMicroAccion?.completado"></div>
        <div class="day-step" [class.done]="sprintActual.diaCheckIn?.respuesta" (click)="vistaActual = 'checkin'">
          <div class="day-icon">💬</div>
          <span class="day-label">Check-In</span>
          <span class="day-status">{{ sprintActual.diaCheckIn?.respuesta ? '✓' : 'Día 5' }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Quick Actions Carousel -->
  <section class="hub-section">
    <h3 class="section-title">Acciones rápidas</h3>
    <div class="quick-actions">
      <div class="qa-card" (click)="vistaActual = 'desahogo'">
        <div class="qa-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">💭</div>
        <span class="qa-label">Desahogo</span>
        <span class="qa-desc">Atrapa un pensamiento</span>
      </div>
      <div class="qa-card" (click)="vistaActual = 'termometro'">
        <div class="qa-icon" style="background: linear-gradient(135deg, #10b981, #059669);">🌡️</div>
        <span class="qa-label">Termómetro</span>
        <span class="qa-desc">¿Cómo te sientes?</span>
      </div>
      <div class="qa-card" (click)="vistaActual = 'victoria'; winTab = 'new'; victoriaPrompt = getVictoriaPrompt()">
        <div class="qa-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">🏆</div>
        <span class="qa-label">Victoria</span>
        <span class="qa-desc">Registra un logro</span>
      </div>
      <div class="qa-card" (click)="vistaActual = 'timeline'">
        <div class="qa-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">📊</div>
        <span class="qa-label">Mi Progreso</span>
        <span class="qa-desc">Ver timeline</span>
      </div>
      <div class="qa-card" (click)="iniciarSimulador()">
        <div class="qa-icon" style="background: linear-gradient(135deg, #f43f5e, #e11d48);">🎯</div>
        <span class="qa-label">Simulador</span>
        <span class="qa-desc">Decisión rápida</span>
      </div>
      <div class="qa-card" (click)="vistaActual = 'experimento'; expStep = 1">
        <div class="qa-icon" style="background: linear-gradient(135deg, #a855f7, #9333ea);">🧪</div>
        <span class="qa-label">Experimento</span>
        <span class="qa-desc">Predice y compara</span>
      </div>
    </div>
  </section>

  <!-- Racha Widget -->
  <section class="hub-section" *ngIf="plan.sprints?.length">
    <div class="streak-widget">
      <div class="streak-info">
        <h4 class="streak-title">🔥 Tu racha</h4>
        <p class="streak-count">{{ getSprintsCompletados() }} de {{ plan.sprints.length }} sprints completados</p>
      </div>
      <div class="streak-dots">
        <div class="sdot" *ngFor="let s of plan.sprints"
             [ngClass]="{'sdot-done': s.estado === 'completado', 'sdot-active': s.estado === 'activo', 'sdot-pending': s.estado === 'pendiente'}">
        </div>
      </div>
    </div>
  </section>

  <!-- ══ ALERTAS INTELIGENTES (6.2) ══ -->
  <section class="hub-section" *ngIf="alertas.length > 0">
    <div class="alert-card" *ngFor="let alerta of alertas" [ngClass]="'alert-' + alerta.tipo">
      <div class="alert-icon">{{ alerta.emoji }}</div>
      <div class="alert-content">
        <h4 class="alert-title">{{ alerta.titulo }}</h4>
        <p class="alert-msg">{{ alerta.mensaje }}</p>
      </div>
      <button class="alert-action" *ngIf="alerta.accion" (click)="ejecutarAlerta(alerta)">{{ alerta.accion }}</button>
      <button class="alert-dismiss" (click)="descartarAlerta(alerta)">✕</button>
    </div>
  </section>

  <!-- ══ AUDIO-PILLS (6.3) ══ -->
  <section class="hub-section">
    <h3 class="section-title">🎧 Micro-Audios</h3>
    <div class="audio-carousel">
      <div class="audio-pill" *ngFor="let audio of audioPills; let i = index"
           [class.audio-playing]="audioPlayingIdx === i">
        <div class="audio-pill-art" [style.background]="audio.gradient">
          <span class="audio-pill-emoji">{{ audio.emoji }}</span>
        </div>
        <div class="audio-pill-info">
          <span class="audio-pill-title">{{ audio.titulo }}</span>
          <span class="audio-pill-dur">{{ audio.duracion }}</span>
        </div>
        <button class="audio-play-btn" (click)="toggleAudio(i)">
          {{ audioPlayingIdx === i ? '⏸' : '▶' }}
        </button>
      </div>
    </div>
    <!-- Hidden audio element -->
    <audio #audioPlayer (ended)="audioPlayingIdx = -1"></audio>
  </section>

  <!-- ══ OVERLAY VIEWS ══ -->

  <!-- Día Inspiración -->
  <div class="overlay-view" *ngIf="vistaActual === 'inspiracion'" (click)="vistaActual = ''">
    <div class="overlay-card" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">🌟</div>
      <h3 class="ov-title">Día de Inspiración</h3>
      <p class="ov-subtitle">{{ sprintActual?.habilidad }}</p>
      <div class="ov-content" *ngIf="sprintActual">
        <div class="inspiration-card">
          <span class="insp-type">{{ sprintActual.diaInspiracion?.tipo || 'texto' | titlecase }}</span>
          <p class="insp-text">{{ sprintActual.diaInspiracion?.contenido || 'Contenido de inspiración pendiente.' }}</p>
        </div>
        <button class="ov-action-btn" *ngIf="!sprintActual.diaInspiracion?.completado" (click)="completarDia('inspiracion')">
          Marcar como leído ✓
        </button>
        <div class="ov-done-msg" *ngIf="sprintActual.diaInspiracion?.completado">
          ✅ ¡Completado!
        </div>
      </div>
    </div>
  </div>

  <!-- Día Micro-Acción -->
  <div class="overlay-view" *ngIf="vistaActual === 'accion'" (click)="vistaActual = ''">
    <div class="overlay-card" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">⚡</div>
      <h3 class="ov-title">Micro-Acción</h3>
      <p class="ov-subtitle">{{ sprintActual?.habilidad }}</p>
      <div class="ov-content" *ngIf="sprintActual">
        <div class="action-card">
          <p class="action-instruction">{{ sprintActual.diaMicroAccion?.instruccion || 'Instrucción pendiente.' }}</p>
        </div>
        <button class="ov-action-btn" *ngIf="!sprintActual.diaMicroAccion?.completado" (click)="completarDia('accion')">
          ¡Lo hice! ✓
        </button>
        <div class="ov-done-msg" *ngIf="sprintActual.diaMicroAccion?.completado">
          ✅ ¡Micro-acción completada!
        </div>
      </div>
    </div>
  </div>

  <!-- Día Check-In -->
  <div class="overlay-view" *ngIf="vistaActual === 'checkin'" (click)="vistaActual = ''">
    <div class="overlay-card" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">💬</div>
      <h3 class="ov-title">Check-In Semanal</h3>
      <p class="ov-subtitle">¿Cómo fue tu semana con {{ sprintActual?.habilidad }}?</p>
      <div class="ov-content" *ngIf="sprintActual && !sprintActual.diaCheckIn?.respuesta">
        <div class="checkin-options">
          <button class="checkin-btn green" (click)="responderCheckIn('Sí, lo logré')">👍 Sí, lo logré</button>
          <button class="checkin-btn yellow" (click)="responderCheckIn('Lo intenté')">🤔 Lo intenté</button>
          <button class="checkin-btn red" (click)="responderCheckIn('No pude esta vez')">😔 No pude</button>
        </div>
      </div>
      <div class="ov-done-msg" *ngIf="sprintActual?.diaCheckIn?.respuesta">
        ✅ Respuesta: {{ sprintActual?.diaCheckIn?.respuesta }}
      </div>
    </div>
  </div>

  <!-- Termómetro Emocional -->
  <div class="overlay-view" *ngIf="vistaActual === 'termometro'" (click)="vistaActual = ''">
    <div class="overlay-card" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">🌡️</div>
      <h3 class="ov-title">¿Cómo te sientes ahora?</h3>

      <!-- Emoji selector -->
      <div class="emo-selector">
        <button class="emo-option" *ngFor="let em of emociones" (click)="emocionSelect = em.nombre"
                [class.emo-active]="emocionSelect === em.nombre">
          <span class="emo-face">{{ em.emoji }}</span>
          <span class="emo-name">{{ em.nombre }}</span>
        </button>
      </div>

      <!-- Nivel slider -->
      <div class="nivel-slider">
        <label class="nivel-label">Intensidad: <strong>{{ nivelEmocional }}/10</strong></label>
        <input type="range" min="1" max="10" [(ngModel)]="nivelEmocional" class="slider-input">
        <div class="slider-scale">
          <span>Suave</span>
          <span>Intenso</span>
        </div>
      </div>

      <button class="ov-action-btn" [disabled]="!emocionSelect" (click)="registrarEmocion()">
        Registrar 🌡️
      </button>
    </div>
  </div>

  <!-- Registrar Victoria + Win Log -->
  <div class="overlay-view" *ngIf="vistaActual === 'victoria'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">🏆</div>
      <h3 class="ov-title">Victorias</h3>

      <!-- Toggle between register & history -->
      <div class="win-tabs">
        <button class="win-tab" [class.win-tab-active]="winTab === 'new'" (click)="winTab = 'new'">+ Registrar</button>
        <button class="win-tab" [class.win-tab-active]="winTab === 'log'" (click)="winTab = 'log'">📜 Historial</button>
      </div>

      <!-- New victory form -->
      <div *ngIf="winTab === 'new'" class="desahogo-step">
        <p class="ov-subtitle" style="margin-top: 12px;">{{ victoriaPrompt }}</p>
        <div class="input-with-mic">
          <textarea class="victoria-input" [(ngModel)]="victoriaTexto" rows="3"
                    placeholder="Describe tu logro..."></textarea>
          <button class="mic-btn" [class.mic-active]="dictandoCampo === 'victoria'" (click)="toggleDictado('victoria')">
            {{ dictandoCampo === 'victoria' ? '⏹' : '🎙' }}
          </button>
        </div>
        <button class="ov-action-btn" [disabled]="!victoriaTexto.trim()" (click)="registrarVictoria()">
          Celebrar 🎉
        </button>
      </div>

      <!-- Win Log Timeline -->
      <div *ngIf="winTab === 'log'" class="win-log">
        <div class="win-empty" *ngIf="!(plan?.victorias || []).length">
          <p>¡Aún no tienes victorias registradas!</p>
          <button class="ov-action-btn" style="margin-top: 12px;" (click)="winTab = 'new'">Registrar primera 🏆</button>
        </div>
        <div class="win-item" *ngFor="let v of (plan?.victorias || []).slice().reverse(); let i = index">
          <div class="win-dot-container">
            <div class="win-dot">{{ winEmojis[i % winEmojis.length] }}</div>
            <div class="win-line" *ngIf="i < (plan?.victorias || []).length - 1"></div>
          </div>
          <div class="win-content">
            <span class="win-date">{{ v.fecha | date:'d MMM yyyy' }}</span>
            <p class="win-desc">{{ v.descripcion }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Timeline Progreso -->
  <div class="overlay-view" *ngIf="vistaActual === 'timeline'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">📊</div>
      <h3 class="ov-title">Tu Progreso</h3>
      <div class="timeline-list">
        <div class="tl-item" *ngFor="let s of plan.sprints" [ngClass]="'tl-' + s.estado">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <span class="tl-week">Semana {{ s.semana }}</span>
            <span class="tl-skill">{{ s.habilidad }}</span>
            <span class="tl-tag">{{ s.estado | titlecase }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ DESAHOGO (Thought Catching) ══ -->
  <div class="overlay-view" *ngIf="vistaActual === 'desahogo'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">💭</div>
      <h3 class="ov-title">Desahogo</h3>
      <p class="ov-subtitle">Atrapa ese pensamiento antes de que se escape</p>

      <!-- Step 1: What do you feel? -->
      <div class="desahogo-step" *ngIf="desahogoStep === 1">
        <label class="ds-label">¿Qué sientes ahora?</label>
        <div class="emo-selector">
          <button class="emo-option" *ngFor="let em of emociones" (click)="desahogoEmocion = em.nombre"
                  [class.emo-active]="desahogoEmocion === em.nombre">
            <span class="emo-face">{{ em.emoji }}</span>
            <span class="emo-name">{{ em.nombre }}</span>
          </button>
        </div>
        <button class="ov-action-btn" [disabled]="!desahogoEmocion" (click)="desahogoStep = 2">
          Siguiente →
        </button>
      </div>

      <!-- Step 2: What happened? -->
      <div class="desahogo-step" *ngIf="desahogoStep === 2">
        <label class="ds-label">¿Qué pasó?</label>
        <div class="input-with-mic">
          <textarea class="victoria-input" [(ngModel)]="desahogoSituacion" rows="3"
                    placeholder="Describe brevemente la situación..."></textarea>
          <button class="mic-btn" [class.mic-active]="dictandoCampo === 'situacion'" (click)="toggleDictado('situacion')">
            {{ dictandoCampo === 'situacion' ? '⏹' : '🎙' }}
          </button>
        </div>
        <button class="ov-action-btn" [disabled]="!desahogoSituacion.trim()" (click)="desahogoStep = 3">
          Siguiente →
        </button>
      </div>

      <!-- Step 3: What did you think? -->
      <div class="desahogo-step" *ngIf="desahogoStep === 3">
        <label class="ds-label">¿Qué pensaste?</label>
        <div class="input-with-mic">
          <textarea class="victoria-input" [(ngModel)]="desahogoPensamiento" rows="3"
                    placeholder="El pensamiento automático que tuviste..."></textarea>
          <button class="mic-btn" [class.mic-active]="dictandoCampo === 'pensamiento'" (click)="toggleDictado('pensamiento')">
            {{ dictandoCampo === 'pensamiento' ? '⏹' : '🎙' }}
          </button>
        </div>
        <button class="ov-action-btn" [disabled]="!desahogoPensamiento.trim()" (click)="guardarDesahogo()">
          {{ guardandoDesahogo ? 'Guardando...' : 'Guardar y reflexionar 🧠' }}
        </button>
      </div>

      <!-- Progress dots -->
      <div class="ds-progress">
        <div class="ds-dot" [class.ds-dot-active]="desahogoStep >= 1"></div>
        <div class="ds-dot" [class.ds-dot-active]="desahogoStep >= 2"></div>
        <div class="ds-dot" [class.ds-dot-active]="desahogoStep >= 3"></div>
      </div>
    </div>
  </div>

  <!-- ══ FILTRO SOCRÁTICO (Reflective Flashcards) ══ -->
  <div class="overlay-view" *ngIf="vistaActual === 'socratico'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>

      <!-- Card counter -->
      <div class="socr-counter">{{ socraticIdx + 1 }} / {{ preguntasSocraticas.length }}</div>

      <!-- Flashcard -->
      <div class="socr-card" [class.socr-flip]="socraticFlipped">
        <div class="socr-front">
          <div class="socr-icon">🤔</div>
          <p class="socr-question">{{ preguntasSocraticas[socraticIdx] }}</p>
          <p class="socr-hint">Reflexiona antes de responder</p>
        </div>
      </div>

      <!-- Response buttons -->
      <div class="socr-actions">
        <button class="socr-btn socr-no" (click)="responderSocratico('No')">
          <span class="socr-btn-icon">✗</span>
          No
        </button>
        <button class="socr-btn socr-maybe" (click)="responderSocratico('Quizás')">
          <span class="socr-btn-icon">~</span>
          Quizás
        </button>
        <button class="socr-btn socr-yes" (click)="responderSocratico('Sí')">
          <span class="socr-btn-icon">✓</span>
          Sí
        </button>
      </div>

      <!-- Progress bar -->
      <div class="socr-progress-bar">
        <div class="socr-progress-fill" [style.width.%]="((socraticIdx) / preguntasSocraticas.length) * 100"></div>
      </div>
    </div>
  </div>

  <!-- Socratic Complete -->
  <div class="overlay-view" *ngIf="vistaActual === 'socratico-fin'" (click)="vistaActual = ''">
    <div class="overlay-card" (click)="$event.stopPropagation()">
      <div class="socr-complete">
        <div class="socr-complete-icon">🧠</div>
        <h3 class="ov-title">¡Reflexión completa!</h3>
        <p class="ov-subtitle">Has pasado tu pensamiento por el filtro socrático</p>
        <div class="socr-summary">
          <div class="socr-sum-item" *ngFor="let r of socraticRespuestas; let i = index">
            <span class="socr-sum-q">{{ preguntasSocraticas[i]?.substring(0, 50) }}...</span>
            <span class="socr-sum-a" [ngClass]="{'a-si': r === 'Sí', 'a-no': r === 'No', 'a-maybe': r === 'Quizás'}">{{ r }}</span>
          </div>
        </div>
        <button class="ov-action-btn" (click)="vistaActual = ''">Volver al hub</button>
      </div>
    </div>
  </div>

  <!-- ══ SIMULADOR DE DECISIÓN DE BOLSILLO ══ -->
  <div class="overlay-view" *ngIf="vistaActual === 'simulador'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>

      <!-- In-progress -->
      <div *ngIf="!simCompleto">
        <div class="sim-header">
          <div class="sim-badge">Escenario {{ simEscenarioIdx + 1 }}/{{ simEscenarios.length }}</div>
          <div class="sim-progress-bar">
            <div class="sim-progress-fill" [style.width.%]="(simEscenarioIdx / simEscenarios.length) * 100"></div>
          </div>
        </div>

        <!-- Chat Bubbles -->
        <div class="sim-chat">
          <!-- Scenario bubble -->
          <div class="sim-bubble sim-scenario" *ngIf="!simMostrandoFeedback">
            <div class="sim-bubble-icon">🎭</div>
            <p class="sim-bubble-text">{{ simEscenarioActual?.escenario }}</p>
          </div>

          <!-- Options -->
          <div class="sim-options" *ngIf="!simMostrandoFeedback">
            <button class="sim-option" *ngFor="let op of simEscenarioActual?.opciones; let i = index"
                    (click)="elegirOpcion(i)">
              <span class="sim-option-letter">{{ ['A','B','C'][i] }}</span>
              <span class="sim-option-text">{{ op.texto }}</span>
            </button>
          </div>

          <!-- Feedback bubble -->
          <div class="sim-bubble sim-feedback" *ngIf="simMostrandoFeedback">
            <div class="sim-bubble-icon">{{ simFeedbackActual?.buena ? '✅' : '💡' }}</div>
            <p class="sim-bubble-text">{{ simFeedbackActual?.feedback }}</p>
            <span class="sim-feedback-tag" [class.sim-good]="simFeedbackActual?.buena">
              {{ simFeedbackActual?.buena ? 'Buena elección' : 'Hay una mejor opción' }}
            </span>
          </div>

          <button class="ov-action-btn" *ngIf="simMostrandoFeedback" (click)="siguienteEscenario()">
            {{ simEscenarioIdx + 1 < simEscenarios.length ? 'Siguiente escenario →' : 'Ver resultados 📊' }}
          </button>
        </div>
      </div>

      <!-- Results -->
      <div *ngIf="simCompleto" class="sim-results">
        <div class="socr-complete-icon">🎯</div>
        <h3 class="ov-title">Simulación completa</h3>
        <p class="ov-subtitle">{{ getSimScore() }} de {{ simEscenarios.length }} respuestas óptimas</p>

        <div class="sim-results-list">
          <div class="sim-result-item" *ngFor="let r of simResultados; let i = index">
            <div class="sim-result-header">
              <span class="sim-result-num">E{{ i + 1 }}</span>
              <span class="sim-result-badge" [class.sim-good]="r.buena">{{ r.buena ? '✓' : '✗' }}</span>
            </div>
            <p class="sim-result-text">{{ r.feedback }}</p>
          </div>
        </div>

        <button class="ov-action-btn" (click)="vistaActual = ''">Volver al hub</button>
      </div>
    </div>
  </div>

  <!-- ══ EXPERIMENTO CONDUCTUAL (5.3) ══ -->
  <div class="overlay-view" *ngIf="vistaActual === 'experimento'" (click)="vistaActual = ''">
    <div class="overlay-card overlay-tall" (click)="$event.stopPropagation()">
      <button class="ov-close" (click)="vistaActual = ''">✕</button>
      <div class="ov-emoji">🧪</div>
      <h3 class="ov-title">Experimento Conductual</h3>

      <!-- Step 1: Prediction -->
      <div *ngIf="expStep === 1" class="desahogo-step">
        <p class="ov-subtitle">Antes de enfrentar una situación difícil, registra tu predicción</p>
        <label class="ds-label">¿Qué situación vas a enfrentar?</label>
        <textarea class="victoria-input" [(ngModel)]="expSituacion" rows="2"
                  placeholder="Ej: Una presentación ante el equipo directivo..."></textarea>
        <label class="ds-label" style="margin-top: 12px;">¿Qué crees que va a pasar? (tu predicción)</label>
        <textarea class="victoria-input" [(ngModel)]="expPrediccion" rows="2"
                  placeholder="Ej: Voy a ponerme nervioso y olvidar puntos clave..."></textarea>
        <label class="ds-label" style="margin-top: 12px;">¿Qué tan probable crees que pase lo peor? (1-10)</label>
        <input type="range" min="1" max="10" [(ngModel)]="expProbabilidad" class="slider-input">
        <div class="slider-scale">
          <span>Poco probable</span>
          <span>{{ expProbabilidad }}/10</span>
          <span>Muy probable</span>
        </div>
        <button class="ov-action-btn" [disabled]="!expSituacion.trim() || !expPrediccion.trim()" (click)="guardarPrediccion()">
          Guardar predicción 🔮
        </button>
      </div>

      <!-- Step 2: Reality check -->
      <div *ngIf="expStep === 2" class="desahogo-step">
        <p class="ov-subtitle">¡Ya pasó! Ahora compara con tu predicción</p>
        <div class="exp-prediction-card">
          <span class="exp-label">Tu predicción fue:</span>
          <p class="exp-pred-text">«{{ expPrediccion }}»</p>
          <span class="exp-pred-prob">Probabilidad estimada: {{ expProbabilidad }}/10</span>
        </div>
        <label class="ds-label" style="margin-top: 16px;">¿Qué pasó realmente?</label>
        <textarea class="victoria-input" [(ngModel)]="expRealidad" rows="2"
                  placeholder="Ej: Me fue mejor de lo esperado, el equipo hizo preguntas positivas..."></textarea>
        <label class="ds-label" style="margin-top: 12px;">¿Qué tan malo fue realmente? (1-10)</label>
        <input type="range" min="1" max="10" [(ngModel)]="expRealidadNivel" class="slider-input">
        <div class="slider-scale">
          <span>Nada malo</span>
          <span>{{ expRealidadNivel }}/10</span>
          <span>Muy malo</span>
        </div>
        <button class="ov-action-btn" [disabled]="!expRealidad.trim()" (click)="guardarExperimento()">
          Comparar 🧠
        </button>
      </div>

      <!-- Step 3: Insight -->
      <div *ngIf="expStep === 3" class="desahogo-step">
        <div class="exp-insight">
          <div class="exp-vs">
            <div class="exp-vs-col">
              <div class="exp-vs-label">Predicción</div>
              <div class="exp-vs-value" style="color: #f43f5e;">{{ expProbabilidad }}/10</div>
            </div>
            <div class="exp-vs-arrow">→</div>
            <div class="exp-vs-col">
              <div class="exp-vs-label">Realidad</div>
              <div class="exp-vs-value" style="color: #10b981;">{{ expRealidadNivel }}/10</div>
            </div>
          </div>
          <div class="exp-diff" *ngIf="expProbabilidad > expRealidadNivel">
            <p>🌟 <strong>¡La realidad fue {{ expProbabilidad - expRealidadNivel }} puntos mejor</strong> de lo que predijiste!</p>
            <p class="exp-lesson">Esto sugiere un <strong>sesgo de catastrofización</strong>. Tu mente tendía a predecir un resultado peor del que ocurrió realmente.</p>
          </div>
          <div class="exp-diff" *ngIf="expProbabilidad <= expRealidadNivel">
            <p>💡 La situación fue similar o más difícil de lo esperado.</p>
            <p class="exp-lesson">Reconocer esto es valioso. ¿Qué aprendiste de la experiencia que puedas aplicar la próxima vez?</p>
          </div>
        </div>
        <button class="ov-action-btn" (click)="vistaActual = ''; resetExperimento()">
          Entendido ✓
        </button>
      </div>

      <div class="ds-progress">
        <div class="ds-dot" [class.ds-dot-active]="expStep >= 1"></div>
        <div class="ds-dot" [class.ds-dot-active]="expStep >= 2"></div>
        <div class="ds-dot" [class.ds-dot-active]="expStep >= 3"></div>
      </div>
    </div>
  </div>

</div>

<!-- ══ BOTTOM NAVIGATION BAR ══ -->
<nav class="bottom-nav" *ngIf="!loading && !error && plan">
  <button class="bnav-item" [class.bnav-active]="vistaActual === ''" (click)="vistaActual = ''">
    <span class="bnav-icon">🏠</span>
    <span class="bnav-label">Inicio</span>
  </button>
  <button class="bnav-item" (click)="vistaActual = 'timeline'">
    <span class="bnav-icon">📊</span>
    <span class="bnav-label">Progreso</span>
  </button>
  <button class="bnav-item bnav-center" *ngIf="sprintActual && tareaDeHoy && !tareaDeHoy.completada" (click)="abrirTareaDeHoy()">
    <span class="bnav-center-icon">{{ tareaDeHoy.emoji }}</span>
  </button>
  <button class="bnav-item" (click)="vistaActual = 'termometro'">
    <span class="bnav-icon">🌡️</span>
    <span class="bnav-label">Emoción</span>
  </button>
  <button class="bnav-item" (click)="vistaActual = 'victoria'; winTab = 'log'">
    <span class="bnav-icon">🏆</span>
    <span class="bnav-label">Victorias</span>
  </button>
</nav>

<!-- Toast -->
<div class="hub-toast" *ngIf="toastMsg">{{ toastMsg }}</div>
  `,
  styles: [`
    /* Inter font is loaded globally via index.html */

    :host {
      display: block; font-family: 'Inter', sans-serif;
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh; color: #f8fafc;
    }

    /* Loading */
    .hub-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; gap: 16px; color: #94a3b8;
    }
    .loader-ring {
      width: 40px; height: 40px; border: 3px solid #334155;
      border-top-color: #0ea5e9; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Error */
    .hub-error {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; text-align: center; padding: 40px;
    }
    .error-icon { font-size: 48px; margin-bottom: 16px; }
    .hub-error h2 { font-size: 22px; font-weight: 800; margin: 0 0 8px 0; color: #f1f5f9; }
    .hub-error p { font-size: 14px; color: #94a3b8; max-width: 300px; }

    /* PWA Install Banner */
    .pwa-banner, .notif-banner {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      margin: 0 20px 12px; border-radius: 16px; cursor: pointer;
      animation: slideDown 0.4s ease;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    .pwa-banner {
      background: linear-gradient(135deg, rgba(14,165,233,0.12), rgba(2,132,199,0.08));
      border: 1px solid rgba(14,165,233,0.2);
    }
    .notif-banner {
      background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08));
      border: 1px solid rgba(245,158,11,0.2);
    }
    .pwa-banner-icon, .notif-banner-icon { font-size: 24px; flex-shrink: 0; }
    .pwa-banner-text, .notif-banner-text { flex: 1; display: flex; flex-direction: column; }
    .pwa-banner-text strong, .notif-banner-text strong { font-size: 13px; color: #f1f5f9; }
    .pwa-banner-text span, .notif-banner-text span { font-size: 11px; color: #94a3b8; }
    .pwa-banner-close, .notif-banner-close {
      background: none; border: none; color: #475569; font-size: 14px;
      cursor: pointer; padding: 4px; flex-shrink: 0;
    }

    /* ══ TODAY CARD ══ */
    .today-card {
      background: linear-gradient(160deg, #1e293b, #0f172a);
      border: 1px solid #334155; border-radius: 24px; padding: 28px 24px;
      text-align: center; position: relative; overflow: hidden;
      animation: todayCardIn 0.5s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes todayCardIn { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .today-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #0ea5e9, #38bdf8, #0ea5e9);
      background-size: 200% auto; animation: shimmer 3s linear infinite;
    }
    @keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
    .today-inspiracion::before { background: linear-gradient(90deg, #0ea5e9, #38bdf8, #0ea5e9); background-size: 200% auto; animation: shimmer 3s linear infinite; }
    .today-accion::before { background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b); background-size: 200% auto; animation: shimmer 3s linear infinite; }
    .today-checkin::before { background: linear-gradient(90deg, #10b981, #34d399, #10b981); background-size: 200% auto; animation: shimmer 3s linear infinite; }
    .today-rest::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6); background-size: 200% auto; animation: shimmer 3s linear infinite; }
    .today-complete::before { background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b); background-size: 200% auto; animation: shimmer 3s linear infinite; }

    .today-top-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .today-badge {
      font-size: 11px; font-weight: 700; color: #0ea5e9; text-transform: uppercase;
      letter-spacing: 0.5px; background: rgba(14,165,233,0.1); padding: 4px 12px;
      border-radius: 50px;
    }
    .today-day-label {
      font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;
      letter-spacing: 1px;
    }
    .today-emoji {
      font-size: 48px; margin-bottom: 12px;
      animation: todayBounce 2s ease infinite;
    }
    @keyframes todayBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .today-title {
      font-size: 22px; font-weight: 900; color: #f1f5f9; margin: 0 0 8px 0;
      line-height: 1.2;
    }
    .today-desc {
      font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0;
      max-width: 320px; margin-left: auto; margin-right: auto;
    }
    .today-preview {
      background: rgba(14,165,233,0.06); border: 1px solid rgba(14,165,233,0.12);
      border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; text-align: left;
    }
    .today-preview p {
      font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0;
      font-style: italic;
    }
    .today-action-btn {
      width: 100%; padding: 18px; border: none; border-radius: 16px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff; font-size: 17px; font-weight: 800; cursor: pointer;
      transition: all 0.3s ease; box-shadow: 0 8px 24px rgba(14,165,233,0.25);
      letter-spacing: 0.3px;
    }
    .today-action-btn:hover {
      transform: translateY(-2px); box-shadow: 0 12px 32px rgba(14,165,233,0.35);
    }
    .today-action-btn:active { transform: translateY(0); }
    .today-accion .today-action-btn {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      box-shadow: 0 8px 24px rgba(245,158,11,0.25);
    }
    .today-checkin .today-action-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 8px 24px rgba(16,185,129,0.25);
    }
    .today-done {
      font-size: 16px; font-weight: 700; color: #10b981;
      padding: 16px; background: rgba(16,185,129,0.08);
      border-radius: 14px; margin-top: 4px;
    }
    .today-sprint-ctx {
      display: flex; justify-content: center; gap: 6px;
      margin-top: 16px; font-size: 11px; color: #475569; font-weight: 500;
    }

    /* ══ BOTTOM NAV ══ */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: rgba(15,23,42,0.95); backdrop-filter: blur(16px);
      border-top: 1px solid #1e293b; display: flex;
      justify-content: space-around; align-items: center;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 0px));
      z-index: 50;
    }
    .bnav-item {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      background: none; border: none; color: #64748b; cursor: pointer;
      padding: 6px 12px; border-radius: 10px; transition: all 0.2s;
      min-width: 56px;
    }
    .bnav-item:hover { color: #94a3b8; }
    .bnav-active { color: #0ea5e9 !important; }
    .bnav-icon { font-size: 20px; }
    .bnav-label { font-size: 10px; font-weight: 600; }

    .bnav-center {
      position: relative; top: -14px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(14,165,233,0.35);
      border: 3px solid #0f172a;
    }
    .bnav-center-icon { font-size: 22px; filter: none; }

    /* Hub */
    .hub { max-width: 480px; margin: 0 auto; padding: 0 0 90px 0; }

    /* Header */
    .hub-header {
      padding: 24px 20px 20px 20px;
      background: linear-gradient(135deg, rgba(14,165,233,0.15), rgba(2,132,199,0.08));
      border-radius: 0 0 32px 32px; margin-bottom: 20px;
    }
    .hub-header-inner { display: flex; justify-content: space-between; align-items: center; }
    .hub-greeting { display: flex; align-items: center; gap: 12px; }
    .greeting-emoji { font-size: 32px; }
    .greeting-time { font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500; }
    .greeting-name { font-size: 20px; font-weight: 800; margin: 2px 0 0 0; color: #f1f5f9; }

    .hub-progress-ring { position: relative; width: 52px; height: 52px; }
    .circular-chart { width: 52px; height: 52px; transform: rotate(-90deg); }
    .circle-bg { fill: none; stroke: #334155; stroke-width: 3; }
    .circle { fill: none; stroke: #0ea5e9; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.6s; }
    .progress-pct {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 12px; font-weight: 800; color: #0ea5e9;
    }

    /* Sections */
    .hub-section { padding: 0 20px; margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #94a3b8; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Sprint Hero Card */
    .sprint-hero-card {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid #334155; border-radius: 24px; padding: 24px;
    }
    .sprint-hero-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sprint-week-badge {
      background: rgba(14,165,233,0.15); color: #0ea5e9; padding: 4px 12px;
      border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .sprint-status-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #0ea5e9;
      box-shadow: 0 0 0 4px rgba(14,165,233,0.2); animation: pulse 2s ease infinite;
    }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(14,165,233,0.2); } 50% { box-shadow: 0 0 0 8px rgba(14,165,233,0.05); } }
    .sprint-hero-title { font-size: 22px; font-weight: 800; color: #f1f5f9; margin: 0 0 4px 0; }
    .sprint-hero-desc { font-size: 13px; color: #64748b; margin: 0 0 20px 0; }

    /* Day Progress */
    .day-progress { display: flex; align-items: center; justify-content: center; gap: 0; }
    .day-step {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      cursor: pointer; padding: 8px; border-radius: 12px; transition: all 0.2s;
      min-width: 80px;
    }
    .day-step:hover { background: rgba(14,165,233,0.08); }
    .day-step.done .day-icon { background: rgba(16,185,129,0.15); }
    .day-step.done .day-status { color: #10b981; }
    .day-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(100,116,139,0.15); display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .day-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
    .day-status { font-size: 11px; font-weight: 700; color: #64748b; }
    .day-connector { width: 24px; height: 2px; background: #334155; flex-shrink: 0; margin-top: -20px; }
    .day-connector.filled { background: #10b981; }

    /* Quick Actions */
    .quick-actions { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
    .qa-card {
      flex: 1; min-width: 110px; background: #1e293b; border: 1px solid #334155;
      border-radius: 16px; padding: 16px 12px; display: flex; flex-direction: column;
      align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;
    }
    .qa-card:hover { border-color: #475569; transform: translateY(-2px); }
    .qa-icon {
      width: 40px; height: 40px; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; font-size: 18px;
    }
    .qa-label { font-size: 13px; font-weight: 700; color: #f1f5f9; }
    .qa-desc { font-size: 10px; color: #64748b; text-align: center; }

    /* Streak Widget */
    .streak-widget {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 18px;
    }
    .streak-info { margin-bottom: 12px; }
    .streak-title { font-size: 14px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px 0; }
    .streak-count { font-size: 12px; color: #64748b; margin: 0; }
    .streak-dots { display: flex; gap: 6px; flex-wrap: wrap; }
    .sdot { width: 20px; height: 20px; border-radius: 6px; }
    .sdot-done { background: #10b981; }
    .sdot-active { background: #0ea5e9; animation: pulse 2s ease infinite; }
    .sdot-pending { background: #334155; }

    /* Overlay Views */
    .overlay-view {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15,23,42,0.8); backdrop-filter: blur(8px);
      z-index: 100; display: flex; align-items: flex-end; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .overlay-card {
      background: #1e293b; border-radius: 28px 28px 0 0; padding: 28px 24px 40px;
      width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto;
      animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1);
      border: 1px solid #334155; border-bottom: none;
    }
    .overlay-tall { max-height: 90vh; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .ov-close {
      position: absolute; top: 16px; right: 20px; background: #334155;
      border: none; border-radius: 50%; width: 32px; height: 32px;
      color: #94a3b8; font-size: 16px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
    }
    .ov-emoji { font-size: 36px; text-align: center; margin-bottom: 8px; }
    .ov-title { font-size: 20px; font-weight: 800; text-align: center; margin: 0 0 4px 0; color: #f1f5f9; }
    .ov-subtitle { font-size: 13px; color: #94a3b8; text-align: center; margin: 0 0 20px 0; }
    .ov-content { margin-top: 16px; }

    .ov-action-btn {
      width: 100%; padding: 16px; border: none; border-radius: 14px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff; font-size: 16px; font-weight: 700; cursor: pointer;
      margin-top: 20px; transition: all 0.2s;
    }
    .ov-action-btn:hover { box-shadow: 0 4px 20px rgba(14,165,233,0.3); transform: translateY(-1px); }
    .ov-action-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .ov-done-msg {
      text-align: center; font-size: 16px; font-weight: 700; color: #10b981;
      padding: 20px; margin-top: 16px;
    }

    /* Inspiration */
    .inspiration-card {
      background: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155;
    }
    .insp-type {
      font-size: 10px; font-weight: 700; color: #06b6d4; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 8px; display: block;
    }
    .insp-text { font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0; }

    /* Action */
    .action-card {
      background: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155;
    }
    .action-instruction { font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0; }

    /* Check-In */
    .checkin-options { display: flex; flex-direction: column; gap: 10px; }
    .checkin-btn {
      padding: 16px; border: none; border-radius: 14px;
      font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .checkin-btn.green { background: rgba(16,185,129,0.15); color: #10b981; }
    .checkin-btn.green:hover { background: rgba(16,185,129,0.25); }
    .checkin-btn.yellow { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .checkin-btn.yellow:hover { background: rgba(245,158,11,0.25); }
    .checkin-btn.red { background: rgba(239,68,68,0.15); color: #ef4444; }
    .checkin-btn.red:hover { background: rgba(239,68,68,0.25); }

    /* Emotional Thermometer */
    .emo-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
    .emo-option {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 4px; border-radius: 14px; border: 2px solid #334155;
      background: transparent; cursor: pointer; transition: all 0.2s;
    }
    .emo-option:hover { border-color: #475569; }
    .emo-active { border-color: #06b6d4 !important; background: rgba(6,182,212,0.1); }
    .emo-face { font-size: 24px; }
    .emo-name { font-size: 10px; font-weight: 600; color: #94a3b8; }

    .nivel-slider { margin: 20px 0; }
    .nivel-label { font-size: 13px; color: #94a3b8; display: block; margin-bottom: 8px; }
    .nivel-label strong { color: #06b6d4; }
    .slider-input {
      width: 100%; -webkit-appearance: none; height: 8px; border-radius: 4px;
      background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
      outline: none;
    }
    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%;
      background: #fff; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .slider-scale { display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 4px; }

    /* Victoria */
    .victoria-input {
      width: 100%; padding: 16px; border: 1px solid #334155; border-radius: 14px;
      background: #0f172a; color: #f1f5f9; font-size: 14px; font-family: inherit;
      resize: none; outline: none; margin-top: 16px;
    }
    .victoria-input:focus { border-color: #06b6d4; }

    /* Timeline */
    .timeline-list { display: flex; flex-direction: column; margin-top: 16px; }
    .tl-item { display: flex; align-items: center; gap: 14px; padding: 12px 0; }
    .tl-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 3px solid #334155; }
    .tl-completado .tl-dot { border-color: #10b981; background: #10b981; }
    .tl-activo .tl-dot { border-color: #06b6d4; background: #06b6d4; box-shadow: 0 0 0 4px rgba(6,182,212,0.2); }
    .tl-pendiente .tl-dot { border-color: #475569; }
    .tl-content { flex: 1; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
    .tl-week { font-size: 13px; font-weight: 700; color: #f1f5f9; }
    .tl-skill { font-size: 12px; color: #64748b; flex: 1; }
    .tl-tag {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 50px;
      text-transform: uppercase;
    }
    .tl-completado .tl-tag { background: rgba(16,185,129,0.15); color: #10b981; }
    .tl-activo .tl-tag { background: rgba(6,182,212,0.15); color: #06b6d4; }
    .tl-pendiente .tl-tag { background: rgba(100,116,139,0.15); color: #64748b; }

    /* Toast */
    .hub-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #10b981; color: #fff; padding: 12px 24px; border-radius: 14px;
      font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(16,185,129,0.3);
      z-index: 200; animation: toastIn 0.3s ease;
    }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    /* Desahogo */
    .desahogo-step { animation: fadeIn 0.3s ease; }
    .ds-label {
      font-size: 15px; font-weight: 700; color: #f1f5f9;
      margin: 0 0 12px 0; display: block;
    }
    .ds-progress { display: flex; justify-content: center; gap: 8px; margin-top: 20px; }
    .ds-dot { width: 8px; height: 8px; border-radius: 50%; background: #334155; transition: all 0.3s; }
    .ds-dot-active { background: #06b6d4; width: 24px; border-radius: 4px; }

    /* Filtro Socrático */
    .socr-counter {
      text-align: center; font-size: 12px; font-weight: 700; color: #64748b;
      margin-bottom: 16px; letter-spacing: 1px;
    }
    .socr-card {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      border: 1px solid #334155; border-radius: 20px; padding: 32px 24px;
      text-align: center; min-height: 200px; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      animation: cardIn 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes cardIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .socr-icon { font-size: 36px; margin-bottom: 16px; }
    .socr-question { font-size: 17px; font-weight: 600; color: #f1f5f9; line-height: 1.5; margin: 0 0 12px 0; }
    .socr-hint { font-size: 12px; color: #64748b; margin: 0; }

    .socr-actions { display: flex; gap: 10px; margin-top: 20px; }
    .socr-btn {
      flex: 1; padding: 14px 8px; border: none; border-radius: 14px;
      font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .socr-btn-icon { font-size: 20px; }
    .socr-no { background: rgba(239,68,68,0.15); color: #ef4444; }
    .socr-no:hover { background: rgba(239,68,68,0.25); }
    .socr-maybe { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .socr-maybe:hover { background: rgba(245,158,11,0.25); }
    .socr-yes { background: rgba(16,185,129,0.15); color: #10b981; }
    .socr-yes:hover { background: rgba(16,185,129,0.25); }

    .socr-progress-bar { height: 4px; background: #334155; border-radius: 2px; margin-top: 16px; overflow: hidden; }
    .socr-progress-fill { height: 100%; background: #06b6d4; border-radius: 2px; transition: width 0.3s ease; }

    .socr-complete { text-align: center; }
    .socr-complete-icon { font-size: 48px; margin-bottom: 12px; animation: cardIn 0.5s ease; }
    .socr-summary { margin: 20px 0; text-align: left; }
    .socr-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e293b; gap: 10px; }
    .socr-sum-q { font-size: 12px; color: #94a3b8; flex: 1; }
    .socr-sum-a { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 50px; flex-shrink: 0; }
    .a-si { background: rgba(16,185,129,0.15); color: #10b981; }
    .a-no { background: rgba(239,68,68,0.15); color: #ef4444; }
    .a-maybe { background: rgba(245,158,11,0.15); color: #f59e0b; }

    /* Simulador de Decisión */
    .sim-header { margin-bottom: 20px; }
    .sim-badge {
      font-size: 11px; font-weight: 700; color: #f43f5e; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .sim-progress-bar { height: 4px; background: #334155; border-radius: 2px; overflow: hidden; }
    .sim-progress-fill { height: 100%; background: #f43f5e; border-radius: 2px; transition: width 0.4s; }

    .sim-chat { display: flex; flex-direction: column; gap: 16px; }
    .sim-bubble {
      border-radius: 20px; padding: 20px; animation: cardIn 0.4s ease;
    }
    .sim-scenario { background: linear-gradient(135deg, #0f172a, #1e293b); border: 1px solid #334155; }
    .sim-feedback { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; }
    .sim-bubble-icon { font-size: 28px; margin-bottom: 10px; }
    .sim-bubble-text { font-size: 15px; color: #e2e8f0; line-height: 1.6; margin: 0; }

    .sim-options { display: flex; flex-direction: column; gap: 8px; animation: cardIn 0.4s ease; }
    .sim-option {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: #1e293b; border: 1px solid #334155; border-radius: 14px;
      color: #f1f5f9; cursor: pointer; transition: all 0.2s; text-align: left;
    }
    .sim-option:hover { border-color: #f43f5e; background: rgba(244,63,94,0.08); }
    .sim-option-letter {
      width: 28px; height: 28px; border-radius: 8px; background: rgba(244,63,94,0.15);
      color: #f43f5e; font-weight: 800; font-size: 13px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sim-option-text { font-size: 14px; font-weight: 500; }

    .sim-feedback-tag {
      display: inline-block; margin-top: 10px; font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 50px; background: rgba(239,68,68,0.15); color: #ef4444;
    }
    .sim-feedback-tag.sim-good { background: rgba(16,185,129,0.15); color: #10b981; }

    .sim-results { text-align: center; }
    .sim-results-list { margin: 20px 0; text-align: left; }
    .sim-result-item {
      padding: 12px; background: #0f172a; border-radius: 12px; margin-bottom: 8px;
      border: 1px solid #334155;
    }
    .sim-result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .sim-result-num { font-size: 12px; font-weight: 700; color: #64748b; }
    .sim-result-badge {
      font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 50px;
      background: rgba(239,68,68,0.15); color: #ef4444;
    }
    .sim-result-badge.sim-good { background: rgba(16,185,129,0.15); color: #10b981; }
    .sim-result-text { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.4; }

    /* Win Log */
    .win-tabs { display: flex; gap: 0; margin: 16px 0; border-radius: 10px; overflow: hidden; border: 1px solid #334155; }
    .win-tab {
      flex: 1; padding: 10px; background: transparent; border: none; color: #94a3b8;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .win-tab-active { background: rgba(6,182,212,0.15); color: #06b6d4; }

    .win-log { margin-top: 16px; max-height: 400px; overflow-y: auto; }
    .win-empty { text-align: center; padding: 24px; color: #64748b; font-size: 14px; }
    .win-item { display: flex; gap: 14px; animation: fadeIn 0.3s ease; }
    .win-dot-container { display: flex; flex-direction: column; align-items: center; }
    .win-dot {
      width: 36px; height: 36px; border-radius: 10px; background: rgba(245,158,11,0.12);
      display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
    }
    .win-line { width: 2px; flex: 1; background: #334155; min-height: 16px; }
    .win-content { flex: 1; padding-bottom: 16px; }
    .win-date { font-size: 11px; font-weight: 600; color: #64748b; }
    .win-desc { font-size: 14px; color: #e2e8f0; margin: 4px 0 0 0; line-height: 1.4; }

    /* Experiment */
    .exp-prediction-card {
      background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 16px;
      margin-bottom: 8px;
    }
    .exp-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .exp-pred-text { font-size: 14px; color: #f1f5f9; margin: 6px 0 4px 0; font-style: italic; }
    .exp-pred-prob { font-size: 12px; color: #f43f5e; font-weight: 600; }

    .exp-insight { margin: 16px 0; }
    .exp-vs {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      margin-bottom: 20px;
    }
    .exp-vs-col { text-align: center; }
    .exp-vs-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .exp-vs-value { font-size: 28px; font-weight: 900; }
    .exp-vs-arrow { font-size: 24px; color: #475569; }
    .exp-diff {
      background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 16px;
      text-align: center;
    }
    .exp-diff p { font-size: 14px; color: #e2e8f0; margin: 0 0 8px 0; line-height: 1.5; }
    .exp-lesson { font-size: 13px; color: #94a3b8 !important; font-style: italic; }

    /* Alerts */
    .alert-card {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border-radius: 14px; border: 1px solid; margin-bottom: 8px;
      animation: cardIn 0.4s ease;
    }
    .alert-warning { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.2); }
    .alert-danger { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); }
    .alert-info { background: rgba(6,182,212,0.08); border-color: rgba(6,182,212,0.2); }
    .alert-icon { font-size: 24px; flex-shrink: 0; }
    .alert-content { flex: 1; min-width: 0; }
    .alert-title { font-size: 13px; font-weight: 700; color: #f1f5f9; margin: 0 0 2px 0; }
    .alert-msg { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.4; }
    .alert-action {
      padding: 6px 14px; border-radius: 8px; border: none;
      background: rgba(6,182,212,0.15); color: #06b6d4; font-size: 11px;
      font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0;
    }
    .alert-dismiss {
      background: none; border: none; color: #475569; font-size: 14px;
      cursor: pointer; padding: 4px; flex-shrink: 0;
    }

    /* Audio Pills */
    .section-title {
      font-size: 15px; font-weight: 700; color: #f1f5f9;
      margin: 0 0 12px 0; letter-spacing: -0.3px;
    }
    .audio-carousel { display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 12px; }
    .audio-pill {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      background: #1e293b; border: 1px solid #334155; border-radius: 14px;
      min-width: 200px; flex-shrink: 0; transition: all 0.2s;
    }
    .audio-playing { border-color: #06b6d4; background: rgba(6,182,212,0.06); }
    .audio-pill-art {
      width: 38px; height: 38px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .audio-pill-emoji { font-size: 18px; }
    .audio-pill-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .audio-pill-title { font-size: 12px; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .audio-pill-dur { font-size: 10px; color: #64748b; }
    .audio-play-btn {
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: rgba(6,182,212,0.15); color: #06b6d4; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: all 0.2s;
    }
    .audio-play-btn:hover { background: rgba(6,182,212,0.25); }

    /* Export FAB */
    .export-fab {
      position: absolute; top: 12px; right: 12px;
      width: 36px; height: 36px; border-radius: 10px; border: none;
      background: rgba(255,255,255,0.08); font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .export-fab:hover { background: rgba(255,255,255,0.15); transform: scale(1.05); }

    /* Mic Dictation (7.1) */
    .input-with-mic { position: relative; }
    .input-with-mic .victoria-input { padding-right: 50px; }
    .mic-btn {
      position: absolute; top: 10px; right: 10px;
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: rgba(239,68,68,0.12); color: #ef4444; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .mic-btn:hover { background: rgba(239,68,68,0.2); }
    .mic-active {
      background: rgba(239,68,68,0.3) !important; color: #fff !important;
      animation: micPulse 1s infinite;
    }
    @keyframes micPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
    }

    /* Responsive Mobile (7.3) */
    @media (max-width: 480px) {
      :host { font-size: 14px; }
      .hub-header { flex-direction: column; text-align: center; gap: 12px; }
      .greeting-name { font-size: 22px !important; }
      .hub-progress-ring { width: 56px; height: 56px; }
      .progress-pct { font-size: 12px; }
      .sprint-hero-card { padding: 16px; }
      .sprint-hero-title { font-size: 18px; }
      .day-progress { gap: 6px; }
      .day-step { min-width: 60px; padding: 10px 6px; }
      .day-icon { font-size: 18px; }
      .day-label { font-size: 10px; }
      .qa-carousel { gap: 8px; }
      .qa-card { min-width: 80px; padding: 12px 8px; }
      .qa-icon { width: 36px; height: 36px; font-size: 16px; }
      .qa-label { font-size: 11px; }
      .qa-desc { font-size: 9px; }
      .overlay-card { padding: 20px; margin: 8px; max-height: 92vh; }
      .overlay-tall { max-height: 92vh; }
      .ov-emoji { font-size: 32px; }
      .ov-title { font-size: 18px; }
      .alert-card { flex-wrap: wrap; }
      .alert-action { width: 100%; text-align: center; margin-top: 6px; }
      .audio-pill { min-width: 170px; }
      .streak-widget { padding: 14px; }
      .sim-option { padding: 12px; }
      .sim-option-text { font-size: 13px; }
      .exp-vs { gap: 10px; }
      .exp-vs-value { font-size: 22px; }
    }
  `]
})
export class EntrenamientoHubComponent implements OnInit {
  loading = true;
  error = false;
  plan: PlanPublico | null = null;
  token = '';

  vistaActual = '';
  toastMsg = '';

  // PWA / Notifications
  showInstallBanner = false;
  showNotifBanner = false;
  private deferredPrompt: any = null;
  private dailyNotifTimer: any = null;

  // Emotional thermometer
  emociones = [
    { emoji: '😌', nombre: 'Tranquilo' },
    { emoji: '😊', nombre: 'Bien' },
    { emoji: '😐', nombre: 'Normal' },
    { emoji: '😤', nombre: 'Frustrado' },
    { emoji: '😰', nombre: 'Ansioso' },
    { emoji: '😢', nombre: 'Triste' },
    { emoji: '😡', nombre: 'Enojado' },
    { emoji: '🤩', nombre: 'Motivado' }
  ];
  emocionSelect = '';
  nivelEmocional = 5;
  victoriaTexto = '';
  winTab: 'new' | 'log' = 'new';
  winEmojis = ['🌟', '💪', '🌈', '🚀', '✨', '🏅', '🔥', '🌞'];
  victoriaPrompt = '';
  victoriaPrompts = [
    '¿Qué hiciste muy bien hoy?',
    '¿Qué obstáculo superaste recientemente?',
    '¿De qué momento de esta semana te sientes orgulloso/a?',
    '¿Qué logro pequeño quieres celebrar?',
    '¿Cuándo mostraste una fortaleza que no sabías que tenías?',
    '¿Qué decisión difícil tomaste bien?'
  ];

  // Experimento Conductual
  expStep = 1;
  expSituacion = '';
  expPrediccion = '';
  expProbabilidad = 7;
  expRealidad = '';
  expRealidadNivel = 3;

  // Dictado por voz (7.1)
  dictandoCampo: string = '';
  private recognition: any = null;

  // Alertas inteligentes (6.2)
  alertas: { emoji: string; titulo: string; mensaje: string; tipo: string; accion?: string; id: string }[] = [];

  // Audio-Pills (6.3)
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  audioPlayingIdx = -1;
  audioPills = [
    { titulo: 'Respiración 4-7-8', duracion: '1:30', emoji: '🌬️', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', url: '' },
    { titulo: 'Escaneo Corporal', duracion: '2:00', emoji: '🧘', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', url: '' },
    { titulo: 'Anclaje al Presente', duracion: '1:15', emoji: '⚓', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', url: '' },
    { titulo: 'Visualización Positiva', duracion: '2:30', emoji: '🌈', gradient: 'linear-gradient(135deg, #10b981, #059669)', url: '' },
    { titulo: 'Relajación Muscular', duracion: '2:00', emoji: '💪', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', url: '' }
  ];

  // Desahogo
  desahogoStep = 1;
  desahogoEmocion = '';
  desahogoSituacion = '';
  desahogoPensamiento = '';
  guardandoDesahogo = false;

  // Filtro Socrático
  preguntasSocraticas = [
    '¿Tienes pruebas irrefutables de que este pensamiento es 100% cierto?',
    '¿Hay alguna otra forma de interpretar lo que pasó?',
    '¿Qué le dirías a un amigo cercano en esta misma situación?',
    '¿Este pensamiento te ayuda a resolver la situación o te paraliza?',
    '¿Dentro de un año, esto seguirá siendo igual de importante?'
  ];
  socraticIdx = 0;
  socraticFlipped = false;
  socraticRespuestas: string[] = [];

  // Simulador de Decisión
  simEscenarios: any[] = [
    {
      escenario: 'Estás en una reunión y tu jefe critica tu trabajo frente a todos. Sientes que es injusto. ¿Qué haces?',
      opciones: [
        { texto: 'Respondes inmediatamente defendiéndote con argumentos sólidos', feedback: 'Responder en caliente puede escalar el conflicto. Aunque tengas razón, el timing es clave.', buena: false },
        { texto: 'Tomas nota, respiras y pides una reunión privada después', feedback: '¡Excelente! Mantener la compostura y abordar el tema en privado demuestra inteligencia emocional.', buena: true },
        { texto: 'Te quedas callado y no dices nada, pero por dentro estás furioso', feedback: 'Evitar el conflicto puede ser dañino a largo plazo. Es mejor abordar la situación de forma asertiva.', buena: false }
      ]
    },
    {
      escenario: 'Un compañero toma el crédito por una idea que fue tuya en una presentación importante. ¿Cómo reaccionas?',
      opciones: [
        { texto: 'Lo expones frente a todos diciendo que la idea fue tuya', feedback: 'Confrontar públicamente puede dañar la relación y crear un ambiente tenso.', buena: false },
        { texto: 'Lo hablas en privado después, expresando cómo te sentiste', feedback: '¡Bien hecho! La comunicación asertiva y privada es la forma más madura de resolverlo.', buena: true },
        { texto: 'Lo dejas pasar, no vale la pena crear un problema', feedback: 'Dejarlo pasar repetidamente puede generar resentimiento acumulado y afectar tu autoestima.', buena: false }
      ]
    },
    {
      escenario: 'Tienes una deadline imposible. Sabes que no la vas a cumplir. ¿Qué haces?',
      opciones: [
        { texto: 'Trabajas toda la noche para intentar lograrlo a como dé lugar', feedback: 'El agotamiento extremo reduce la calidad del trabajo y afecta tu salud. No es sostenible.', buena: false },
        { texto: 'Comunicas con anticipación que necesitas más tiempo y propones un plan', feedback: '¡Correcto! La comunicación proactiva y honesta genera confianza y permite replantear expectativas.', buena: true },
        { texto: 'Entregas lo que puedas, aunque esté incompleto, sin avisar', feedback: 'Entregar trabajo incompleto sin comunicar expectativas puede dañar tu credibilidad.', buena: false }
      ]
    },
    {
      escenario: 'Un cliente nuevo te pide algo que va en contra de tus valores profesionales. Es un contrato muy lucrativo. ¿Qué decides?',
      opciones: [
        { texto: 'Aceptas —el dinero es importante y puedes adaptarte', feedback: 'Comprometer tus valores puede funcionar a corto plazo pero genera conflicto interno y desgaste.', buena: false },
        { texto: 'Rechazas de forma respetuosa, explicando tus límites y proponiendo alternativas', feedback: '¡Gran decisión! Establecer límites claros y ofrecer alternativas es profesional y sostenible.', buena: true },
        { texto: 'Le dices que sí pero secretamente haces las cosas a tu manera', feedback: 'La falta de transparencia puede destruir la confianza y generar conflictos mayores.', buena: false }
      ]
    }
  ];
  simEscenarioIdx = 0;
  simMostrandoFeedback = false;
  simFeedbackActual: any = null;
  simCompleto = false;
  simResultados: any[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient, private exportService: ChartExportService) { }

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.cargarPlan();
    this.initPWAInstallPrompt();
    this.checkNotificationPermission();
  }

  // ═══ TAREA DE HOY (Daily Task Focus) ═══

  get tareaDeHoy(): { tipo: string; emoji: string; titulo: string; descripcion: string; accionLabel: string; diaLabel: string; completada: boolean } | null {
    const sprint = this.sprintActual;
    if (!sprint) return null;

    // Day 1-2: Inspiración
    if (!sprint.diaInspiracion.completado) {
      return {
        tipo: 'inspiracion',
        emoji: '🌟',
        titulo: 'Momento de Inspiración',
        descripcion: `Lee el contenido inspiracional para «${sprint.habilidad}». Tómate unos minutos para reflexionar.`,
        accionLabel: 'Abrir inspiración →',
        diaLabel: 'Día 1–2',
        completada: false
      };
    }

    // Day 3-4: Micro-Acción
    if (!sprint.diaMicroAccion.completado) {
      return {
        tipo: 'accion',
        emoji: '⚡',
        titulo: 'Micro-Acción del Día',
        descripcion: `Aplica lo aprendido con una acción concreta para «${sprint.habilidad}». ¡Solo toma unos minutos!`,
        accionLabel: 'Ver micro-acción →',
        diaLabel: 'Día 3–4',
        completada: false
      };
    }

    // Day 5: Check-In
    if (!sprint.diaCheckIn.respuesta) {
      return {
        tipo: 'checkin',
        emoji: '💬',
        titulo: 'Check-In Semanal',
        descripcion: `¿Cómo te fue esta semana con «${sprint.habilidad}»? Comparte tu reflexión.`,
        accionLabel: 'Responder check-in →',
        diaLabel: 'Día 5',
        completada: false
      };
    }

    // All done for this sprint
    return null;
  }

  abrirTareaDeHoy() {
    const tarea = this.tareaDeHoy;
    if (!tarea) return;
    switch (tarea.tipo) {
      case 'inspiracion': this.vistaActual = 'inspiracion'; break;
      case 'accion': this.vistaActual = 'accion'; break;
      case 'checkin': this.vistaActual = 'checkin'; break;
    }
  }

  // ═══ PWA INSTALL PROMPT ═══

  private initPWAInstallPrompt() {
    // Listen for the beforeinstallprompt event (Chrome, Edge, Samsung Internet)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      // Only show the banner if user hasn't dismissed it before
      if (!localStorage.getItem('hub_pwa_dismissed')) {
        this.showInstallBanner = true;
      }
    });

    // Detect standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.showInstallBanner = false;
    }
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.showToast('📲 ¡App instalada!');
        }
        this.deferredPrompt = null;
        this.showInstallBanner = false;
        localStorage.setItem('hub_pwa_dismissed', '1');
      });
    } else {
      // Fallback: show instructions for iOS / unsupported browsers
      this.showToast('📱 Usa "Compartir → Agregar a pantalla de inicio" en tu navegador');
      this.showInstallBanner = false;
      localStorage.setItem('hub_pwa_dismissed', '1');
    }
  }

  // ═══ NOTIFICATIONS (Daily Alerts) ═══

  private checkNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // Show the banner after a short delay so it doesn't overwhelm the user
      if (!localStorage.getItem('hub_notif_dismissed')) {
        setTimeout(() => { this.showNotifBanner = true; }, 3000);
      }
    } else if (Notification.permission === 'granted') {
      this.scheduleDailyNotification();
    }
  }

  requestNotifications() {
    if (!('Notification' in window)) {
      this.showToast('Tu navegador no soporta notificaciones');
      this.showNotifBanner = false;
      return;
    }
    Notification.requestPermission().then(permission => {
      this.showNotifBanner = false;
      if (permission === 'granted') {
        this.showToast('🔔 ¡Recordatorios activados!');
        localStorage.setItem('hub_notif_dismissed', '1');
        this.scheduleDailyNotification();
        // Send an immediate welcome notification
        this.sendNotification('¡Entrenamiento activo! 🎯', 'Te enviaremos recordatorios diarios sobre tus tareas pendientes.');
      } else {
        localStorage.setItem('hub_notif_dismissed', '1');
      }
    });
  }

  private scheduleDailyNotification() {
    // Check every 4 hours if there's a pending task, send a fresh notification
    // This works as long as the tab/PWA is open in the background
    if (this.dailyNotifTimer) clearInterval(this.dailyNotifTimer);

    this.dailyNotifTimer = setInterval(() => {
      const tarea = this.tareaDeHoy;
      if (tarea && !tarea.completada) {
        const lastNotif = localStorage.getItem('hub_last_notif_date');
        const today = new Date().toDateString();
        if (lastNotif !== today) {
          this.sendNotification(
            `${tarea.emoji} ${tarea.titulo}`,
            tarea.descripcion
          );
          localStorage.setItem('hub_last_notif_date', today);
        }
      }
    }, 4 * 60 * 60 * 1000); // Every 4 hours

    // Also check immediately on load
    setTimeout(() => {
      const tarea = this.tareaDeHoy;
      if (tarea && !tarea.completada && Notification.permission === 'granted') {
        const lastNotif = localStorage.getItem('hub_last_notif_date');
        const today = new Date().toDateString();
        if (lastNotif !== today) {
          this.sendNotification(
            `${tarea.emoji} ${tarea.titulo}`,
            tarea.descripcion
          );
          localStorage.setItem('hub_last_notif_date', today);
        }
      }
    }, 5000);
  }

  private sendNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') return;
    try {
      const notif = new Notification(title, {
        body,
        icon: '/assets/icons/logo-192.png',
        badge: '/assets/icons/logo-192.png',
        tag: 'entrenamiento-daily',
        requireInteraction: false
      } as NotificationOptions);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      // Fallback for environments where Notification constructor fails
      console.warn('Notification failed:', e);
    }
  }

  // ═══ EXPORTAR PROGRESO (7.2) ═══

  async exportarProgreso() {
    if (!this.plan) return;
    this.showToast('Generando reporte...');

    const datasets: ExportDataSet[] = [];

    // 1. Sprints
    datasets.push({
      title: 'Sprints de Entrenamiento',
      columns: [
        { key: 'semana', header: 'Semana' },
        { key: 'habilidad', header: 'Habilidad' },
        { key: 'estado', header: 'Estado' },
        { key: 'inspiracion', header: 'Inspiración' },
        { key: 'accion', header: 'Micro-Acción' },
        { key: 'checkin', header: 'Check-In' }
      ],
      rows: this.plan.sprints.map(s => ({
        semana: s.semana,
        habilidad: s.habilidad,
        estado: s.estado,
        inspiracion: s.diaInspiracion?.completado ? '✓' : '–',
        accion: s.diaMicroAccion?.completado ? '✓' : '–',
        checkin: s.diaCheckIn?.respuesta || '–'
      }))
    });

    // 2. Emotional Records
    const registros = (this.plan as any).registrosEmocionales || [];
    if (registros.length > 0) {
      datasets.push({
        title: 'Registros Emocionales',
        columns: [
          { key: 'fecha', header: 'Fecha', format: 'date' },
          { key: 'nivel', header: 'Nivel (1-10)', format: 'number' },
          { key: 'emocion', header: 'Emoción' }
        ],
        rows: registros.map((r: any) => ({
          fecha: new Date(r.fecha).toLocaleDateString('es-ES'),
          nivel: r.nivel,
          emocion: r.emocion || ''
        }))
      });
    }

    // 3. Victories
    const victorias = (this.plan as any).victorias || [];
    if (victorias.length > 0) {
      datasets.push({
        title: 'Victorias Registradas',
        columns: [
          { key: 'fecha', header: 'Fecha', format: 'date' },
          { key: 'descripcion', header: 'Logro' }
        ],
        rows: victorias.map((v: any) => ({
          fecha: new Date(v.fecha).toLocaleDateString('es-ES'),
          descripcion: v.descripcion
        }))
      });
    }

    try {
      await this.exportService.exportPDF(datasets, {
        fileName: `progreso-${this.plan.candidatoNombre.replace(/\s+/g, '-').toLowerCase()}`,
        title: `Reporte de Progreso — ${this.plan.candidatoNombre}`,
        subtitle: `Progreso: ${this.plan.progreso}% · ${this.getSprintsCompletados()} sprints completados`,
        includeTimestamp: true
      });
      this.showToast('📄 Reporte exportado exitosamente');
    } catch (e) {
      // Fallback to CSV
      this.exportService.exportCSV(datasets[0], {
        fileName: `progreso-${this.plan.candidatoNombre.replace(/\s+/g, '-').toLowerCase()}`
      });
      this.showToast('📄 Reporte CSV exportado');
    }
  }

  cargarPlan() {
    this.loading = true;
    this.http.get<{ status: string; data: PlanPublico }>(`/api/entrenamientos/public/${this.token}`).subscribe({
      next: (res) => {
        this.plan = res.data;
        this.loading = false;
        this.detectarAlertas();
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  // ═══ SMART ALERTS (6.2) ═══

  detectarAlertas() {
    if (!this.plan) return;
    this.alertas = [];

    // 1. Inactividad: 2+ semanas sin interacción
    if ((this.plan as any).semanasIgnoradas >= 2) {
      this.alertas.push({
        emoji: '💤', titulo: 'Sprint de Reconexión',
        mensaje: `Llevas ${(this.plan as any).semanasIgnoradas} semanas sin actividad. ¿Te gustaría un sprint suave para retomar el ritmo?`,
        tipo: 'info', accion: 'Retomar', id: 'inactividad'
      });
    }

    // 2. Estrés alto: promedio >7 en últimos 3 registros
    const registros = (this.plan as any).registrosEmocionales || [];
    if (registros.length >= 3) {
      const ultimos3 = registros.slice(-3);
      const promedioEstres = ultimos3.reduce((sum: number, r: any) => sum + (r.nivel || 0), 0) / 3;
      if (promedioEstres > 7) {
        this.alertas.push({
          emoji: '⚠️', titulo: 'Nivel de estrés elevado',
          mensaje: `Tu promedio emocional reciente es ${promedioEstres.toFixed(1)}/10. Considera tomar una micro-pausa o escuchar un audio de respiración.`,
          tipo: 'warning', accion: 'Respirar', id: 'estres'
        });
      }
    }

    // 3. Cuello de botella: >1 sprint activo
    const sprintsActivos = this.plan.sprints.filter(s => s.estado === 'activo');
    if (sprintsActivos.length > 1) {
      this.alertas.push({
        emoji: '🚫', titulo: 'Cuello de botella',
        mensaje: `Tienes ${sprintsActivos.length} sprints activos simultáneamente. Enfócate en uno a la vez para mejores resultados.`,
        tipo: 'danger', id: 'bottleneck'
      });
    }
  }

  ejecutarAlerta(alerta: any) {
    if (alerta.id === 'estres') {
      // Scroll to audio section or play breathing audio
      this.toggleAudio(0); // Play first audio (Respiración)
    } else if (alerta.id === 'inactividad') {
      this.showToast('¡Bienvenido de vuelta! Tu sprint de reconexión está listo.');
    }
    this.descartarAlerta(alerta);
  }

  descartarAlerta(alerta: any) {
    this.alertas = this.alertas.filter(a => a.id !== alerta.id);
  }

  // ═══ AUDIO-PILLS (6.3) ═══

  toggleAudio(idx: number) {
    if (this.audioPlayingIdx === idx) {
      this.audioPlayingIdx = -1;
      // If we had real audio: this.audioPlayerRef.nativeElement.pause();
      this.showToast('Audio pausado');
    } else {
      this.audioPlayingIdx = idx;
      this.showToast(`Reproduciendo: ${this.audioPills[idx].titulo}`);
      // With real audio: player.src = url; player.play();
    }
  }

  get sprintActual(): SprintData | null {
    if (!this.plan) return null;
    return this.plan.sprints.find(s => s.estado === 'activo') || null;
  }

  getGreetingText(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getGreetingEmoji(): string {
    const h = new Date().getHours();
    if (h < 12) return '🌅';
    if (h < 18) return '☀️';
    return '🌙';
  }

  getSprintsCompletados(): number {
    return (this.plan?.sprints || []).filter(s => s.estado === 'completado').length;
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  completarDia(tipo: string) {
    if (!this.plan || !this.sprintActual) return;
    const sprintIdx = this.plan.sprints.findIndex(s => s.estado === 'activo');
    if (sprintIdx === -1) return;

    // Optimistic update
    if (tipo === 'inspiracion') {
      this.plan.sprints[sprintIdx].diaInspiracion.completado = true;
    } else if (tipo === 'accion') {
      this.plan.sprints[sprintIdx].diaMicroAccion.completado = true;
    }

    this.http.put(`/api/entrenamientos/${this.plan._id}`, {
      sprints: this.plan.sprints
    }).subscribe({
      next: () => this.showToast(tipo === 'inspiracion' ? '🌟 ¡Inspiración completada!' : '⚡ ¡Micro-acción completada!'),
      error: () => this.showToast('Error al guardar')
    });
  }

  responderCheckIn(respuesta: string) {
    if (!this.plan) return;
    const sprintIdx = this.plan.sprints.findIndex(s => s.estado === 'activo');
    if (sprintIdx === -1) return;

    this.plan.sprints[sprintIdx].diaCheckIn = { respuesta };

    // Check if all 3 days completed → mark sprint as completado
    const sprint = this.plan.sprints[sprintIdx];
    if (sprint.diaInspiracion?.completado && sprint.diaMicroAccion?.completado) {
      sprint.estado = 'completado';
      // Activate next sprint
      if (sprintIdx + 1 < this.plan.sprints.length) {
        this.plan.sprints[sprintIdx + 1].estado = 'activo';
      }
      // Update progress
      const completed = this.plan.sprints.filter(s => s.estado === 'completado').length;
      this.plan.progreso = Math.round((completed / this.plan.sprints.length) * 100);
    }

    this.http.put(`/api/entrenamientos/${this.plan._id}`, {
      sprints: this.plan.sprints,
      progreso: this.plan.progreso
    }).subscribe({
      next: () => {
        this.showToast('💬 ¡Check-in registrado!');
        this.vistaActual = '';
      },
      error: () => this.showToast('Error al guardar')
    });
  }

  registrarEmocion() {
    if (!this.plan || !this.emocionSelect) return;

    const registro = {
      nivel: this.nivelEmocional,
      emocion: this.emocionSelect
    };

    this.http.post(`/api/entrenamientos/${this.plan._id}/emocional`, registro).subscribe({
      next: () => {
        this.showToast('🌡️ ¡Registrado!');
        this.vistaActual = '';
        this.emocionSelect = '';
        this.nivelEmocional = 5;
      },
      error: () => this.showToast('Error al registrar')
    });
  }

  registrarVictoria() {
    if (!this.plan || !this.victoriaTexto.trim()) return;

    this.http.post(`/api/entrenamientos/${this.plan._id}/victoria`, {
      descripcion: this.victoriaTexto
    }).subscribe({
      next: () => {
        this.showToast('🏆 ¡Victoria registrada!');
        this.vistaActual = '';
        this.victoriaTexto = '';
      },
      error: () => this.showToast('Error al registrar')
    });
  }

  // ═══ DESAHOGO ═══

  guardarDesahogo() {
    if (!this.plan) return;
    this.guardandoDesahogo = true;

    const registro = {
      nivel: 5,
      emocion: this.desahogoEmocion,
      situacion: this.desahogoSituacion,
      pensamiento: this.desahogoPensamiento
    };

    this.http.post(`/api/entrenamientos/${this.plan._id}/emocional`, registro).subscribe({
      next: () => {
        this.guardandoDesahogo = false;
        this.showToast('💭 ¡Pensamiento atrapado!');
        // Launch Socratic Filter
        this.socraticIdx = 0;
        this.socraticRespuestas = [];
        this.socraticFlipped = false;
        this.vistaActual = 'socratico';
      },
      error: () => {
        this.guardandoDesahogo = false;
        this.showToast('Error al guardar');
      }
    });
  }

  resetDesahogo() {
    this.desahogoStep = 1;
    this.desahogoEmocion = '';
    this.desahogoSituacion = '';
    this.desahogoPensamiento = '';
  }

  // ═══ FILTRO SOCRÁTICO ═══

  responderSocratico(respuesta: string) {
    this.socraticRespuestas.push(respuesta);
    if (this.socraticIdx + 1 < this.preguntasSocraticas.length) {
      this.socraticFlipped = true;
      setTimeout(() => {
        this.socraticIdx++;
        this.socraticFlipped = false;
      }, 300);
    } else {
      // Completed all cards
      this.vistaActual = 'socratico-fin';
      this.resetDesahogo();
    }
  }

  // ═══ SIMULADOR DE DECISIÓN ═══

  get simEscenarioActual() {
    return this.simEscenarios[this.simEscenarioIdx] || null;
  }

  iniciarSimulador() {
    this.simEscenarioIdx = 0;
    this.simMostrandoFeedback = false;
    this.simFeedbackActual = null;
    this.simCompleto = false;
    this.simResultados = [];
    this.vistaActual = 'simulador';
  }

  elegirOpcion(idx: number) {
    const escenario = this.simEscenarioActual;
    if (!escenario) return;
    const opcion = escenario.opciones[idx];
    this.simFeedbackActual = opcion;
    this.simMostrandoFeedback = true;
    this.simResultados.push({ feedback: opcion.feedback, buena: opcion.buena });
  }

  siguienteEscenario() {
    if (this.simEscenarioIdx + 1 < this.simEscenarios.length) {
      this.simEscenarioIdx++;
      this.simMostrandoFeedback = false;
      this.simFeedbackActual = null;
    } else {
      this.simCompleto = true;
      // Save results to API
      if (this.plan) {
        this.http.post(`/api/entrenamientos/${this.plan._id}/simulador`, {
          resultados: this.simResultados,
          score: this.getSimScore()
        }).subscribe({
          next: () => { },
          error: () => { }
        });
      }
    }
  }

  getSimScore(): number {
    return this.simResultados.filter(r => r.buena).length;
  }

  // ═══ WIN LOG (5.1) ═══

  getVictoriaPrompt(): string {
    return this.victoriaPrompts[Math.floor(Math.random() * this.victoriaPrompts.length)];
  }

  // ═══ EXPERIMENTO CONDUCTUAL (5.3) ═══

  guardarPrediccion() {
    if (!this.expSituacion.trim() || !this.expPrediccion.trim()) return;
    this.expStep = 2;
  }

  guardarExperimento() {
    if (!this.expRealidad.trim() || !this.plan) return;
    // Save to API
    this.http.post(`/api/entrenamientos/${this.plan._id}/emocional`, {
      tipo: 'experimento',
      situacion: this.expSituacion,
      prediccion: this.expPrediccion,
      probabilidadEstimada: this.expProbabilidad,
      realidad: this.expRealidad,
      realidadNivel: this.expRealidadNivel
    }).subscribe({
      next: () => { },
      error: () => { }
    });
    this.expStep = 3;
  }

  resetExperimento() {
    this.expStep = 1;
    this.expSituacion = '';
    this.expPrediccion = '';
    this.expProbabilidad = 7;
    this.expRealidad = '';
    this.expRealidadNivel = 3;
  }

  // ═══ DICTADO POR VOZ (7.1) ═══

  toggleDictado(campo: string) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showToast('Tu navegador no soporta dictado por voz');
      return;
    }

    // If already dictating this field, stop
    if (this.dictandoCampo === campo) {
      this.recognition?.stop();
      this.dictandoCampo = '';
      return;
    }

    // Stop any existing recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = true;
    this.recognition.continuous = true;
    this.dictandoCampo = campo;
    this.showToast('🎙 Escuchando... habla ahora');

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      switch (campo) {
        case 'victoria': this.victoriaTexto = transcript; break;
        case 'situacion': this.desahogoSituacion = transcript; break;
        case 'pensamiento': this.desahogoPensamiento = transcript; break;
        case 'expSituacion': this.expSituacion = transcript; break;
        case 'expPrediccion': this.expPrediccion = transcript; break;
        case 'expRealidad': this.expRealidad = transcript; break;
      }
    };

    this.recognition.onerror = () => {
      this.dictandoCampo = '';
      this.showToast('Error al escuchar. Intenta de nuevo.');
    };

    this.recognition.onend = () => {
      this.dictandoCampo = '';
    };

    this.recognition.start();
  }
}
