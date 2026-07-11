import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * ActuaYa — Flat Illustration Icon System
 * Bold geometric filled shapes, multi-color palette:
 * Navy (#1e1e4a), Purple (#6c5ce7), Pink (#e84393),
 * Light Blue (#74b9ff), Teal (#00cec9), White (#fff)
 */

// Color palette constants
const N = '#1a2e35';  // Navy (dark teal for light bg)
const P = '#6c5ce7';  // Purple (primary)
const K = '#e84393';  // Pink (accent)
const B = '#74b9ff';  // Blue (light)
const T = '#00cec9';  // Teal
const W = '#ddd6fe';  // Soft lavender (was white)
const LP = '#a29bfe'; // Light purple

const ICONS: Record<string, string> = {

  // ═══════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════

  menu: `<svg viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="2.5" rx="1.25" fill="${N}"/>
    <rect x="3" y="10.75" width="18" height="2.5" rx="1.25" fill="${P}"/>
    <rect x="3" y="17.5" width="18" height="2.5" rx="1.25" fill="${N}"/>
  </svg>`,

  // Dashboard — 4-panel grid
  dashboard: `<svg viewBox="0 0 24 24">
    <rect x="2" y="2" width="9" height="9" rx="2" fill="#6c5ce7"/>
    <rect x="13" y="2" width="9" height="9" rx="2" fill="#74b9ff"/>
    <rect x="2" y="13" width="9" height="9" rx="2" fill="#00cec9"/>
    <rect x="13" y="13" width="9" height="9" rx="2" fill="#e84393"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  ESTRATEGIA
  // ═══════════════════════════════════════

  // Metas — a flag on a mountain peak
  target: `<svg viewBox="0 0 24 24">
    <polygon points="4,22 12,6 20,22" fill="#e8e0ff" rx="2"/>
    <polygon points="8,22 12,12 16,22" fill="#c4b5fd"/>
    <rect x="11" y="4" width="2" height="10" rx="1" fill="#6c5ce7"/>
    <polygon points="13,4 22,7 13,10" fill="#e84393"/>
  </svg>`,

  // Árbol de Metas — org chart hierarchy
  tree: `<svg viewBox="0 0 24 24">
    <rect x="8" y="1" width="8" height="5" rx="2" fill="#6c5ce7"/>
    <rect x="1" y="18" width="6" height="5" rx="1.5" fill="#e84393"/>
    <rect x="9" y="18" width="6" height="5" rx="1.5" fill="#00cec9"/>
    <rect x="17" y="18" width="6" height="5" rx="1.5" fill="#74b9ff"/>
    <rect x="11.5" y="6" width="1" height="5" fill="#1a2e35"/>
    <rect x="3.5" y="11" width="1" height="7" fill="#1a2e35"/>
    <rect x="11.5" y="11" width="1" height="7" fill="#1a2e35"/>
    <rect x="19.5" y="11" width="1" height="7" fill="#1a2e35"/>
    <rect x="3.5" y="11" width="17" height="1" fill="#1a2e35"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  COMERCIAL
  // ═══════════════════════════════════════

  // El Radar — satellite dish scanning
  radar: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="#6c5ce7" stroke-width="1.5" opacity=".3"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="#6c5ce7" stroke-width="1.5" opacity=".5"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="#6c5ce7" stroke-width="1.5" opacity=".7"/>
    <circle cx="12" cy="12" r="2" fill="#6c5ce7"/>
    <line x1="12" y1="12" x2="19" y2="5" stroke="#00cec9" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="7" r="2" fill="#e84393"/>
  </svg>`,

  // Pipeline — horizontal flow with arrows
  pipeline: `<svg viewBox="0 0 24 24">
    <rect x="1" y="9" width="22" height="6" rx="3" fill="#e8e0ff"/>
    <circle cx="5" cy="12" r="2.5" fill="#e84393"/>
    <circle cx="12" cy="12" r="2.5" fill="#6c5ce7"/>
    <circle cx="19" cy="12" r="2.5" fill="#00cec9"/>
    <path d="M8 12h1.5M14.5 12h2" stroke="#1a2e35" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="22,12 19,9 19,15" fill="#00cec9" opacity=".5"/>
  </svg>`,

  // Embudos — clear funnel shape
  funnel: `<svg viewBox="0 0 24 24">
    <path d="M3 3h18l-6 8v7l-6 3V11z" fill="#6c5ce7"/>
    <path d="M3 3h18l-3 4H6z" fill="#74b9ff"/>
    <path d="M9 15v6l6-3v-5z" fill="#e84393"/>
  </svg>`,

  // Deals — dollar coin
  deal: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#00cec9"/>
    <circle cx="12" cy="12" r="8.5" fill="#fff" opacity=".2"/>
    <text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold" font-family="system-ui">$</text>
  </svg>`,

  // Deals/Handshake — two hands
  handshake: `<svg viewBox="0 0 24 24">
    <path d="M2 11l4-4h4l2 2 2-2h4l4 4" stroke="#6c5ce7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M6 14l3-3 3 2 3-2 3 3" stroke="#e84393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="5" cy="14" r="2" fill="#74b9ff"/>
    <circle cx="19" cy="14" r="2" fill="#74b9ff"/>
    <path d="M9 18l3 2 3-2" stroke="#00cec9" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  PROYECTOS
  // ═══════════════════════════════════════

  // Tablero — kanban board with columns
  board: `<svg viewBox="0 0 24 24">
    <rect x="1" y="2" width="22" height="20" rx="3" fill="#1a2e35"/>
    <rect x="3" y="6" width="5" height="3" rx="1" fill="#6c5ce7"/>
    <rect x="3" y="10.5" width="5" height="3" rx="1" fill="#a29bfe" opacity=".6"/>
    <rect x="9.5" y="6" width="5" height="3" rx="1" fill="#e84393"/>
    <rect x="9.5" y="10.5" width="5" height="3" rx="1" fill="#e84393" opacity=".5"/>
    <rect x="9.5" y="15" width="5" height="3" rx="1" fill="#e84393" opacity=".3"/>
    <rect x="16" y="6" width="5" height="3" rx="1" fill="#00cec9"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  ANALÍTICA
  // ═══════════════════════════════════════

  // Rendimiento — speedometer gauge
  bolt: `<svg viewBox="0 0 24 24">
    <path d="M3 18a9 9 0 0 1 18 0" fill="none" stroke="#e8e0ff" stroke-width="4" stroke-linecap="round"/>
    <path d="M3 18a9 9 0 0 1 12.7-9" fill="none" stroke="#6c5ce7" stroke-width="4" stroke-linecap="round"/>
    <line x1="12" y1="18" x2="16" y2="10" stroke="#e84393" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="12" cy="18" r="2" fill="#1a2e35"/>
  </svg>`,

  // Progreso — bar chart rising
  'chart-down': `<svg viewBox="0 0 24 24">
    <rect x="2" y="16" width="4" height="6" rx="1" fill="#74b9ff"/>
    <rect x="7.5" y="12" width="4" height="10" rx="1" fill="#6c5ce7"/>
    <rect x="13" y="8" width="4" height="14" rx="1" fill="#e84393"/>
    <rect x="18.5" y="4" width="4" height="18" rx="1" fill="#00cec9"/>
    <path d="M4 14l5-4 5 2 5-6" stroke="#1a2e35" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Tiempo — clear clock face
  timer: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="13" r="10" fill="#6c5ce7"/>
    <circle cx="12" cy="13" r="8" fill="#fff"/>
    <rect x="11.2" y="7" width="1.6" height="6.5" rx=".8" fill="#1a2e35"/>
    <rect x="12" y="12.2" width="5" height="1.6" rx=".8" fill="#e84393"/>
    <circle cx="12" cy="13" r="1.5" fill="#1a2e35"/>
    <rect x="9" y="1" width="6" height="3" rx="1.5" fill="#6c5ce7"/>
  </svg>`,

  // Revisión — weekly calendar with checkmark
  notebook: `<svg viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="19" rx="3" fill="#6c5ce7"/>
    <rect x="2" y="3" width="20" height="5" rx="3" fill="#1a2e35"/>
    <rect x="4" y="10" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="8.5" y="10" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="13" y="10" width="3" height="3" rx=".5" fill="#00cec9"/>
    <rect x="17.5" y="10" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="4" y="15" width="3" height="3" rx=".5" fill="#e84393"/>
    <rect x="8.5" y="15" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="13" y="15" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="17.5" y="15" width="3" height="3" rx=".5" fill="#fff" opacity=".3"/>
    <rect x="7" y="1" width="2" height="4" rx="1" fill="#74b9ff"/>
    <rect x="15" y="1" width="2" height="4" rx="1" fill="#74b9ff"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  MOBILE TABS
  // ═══════════════════════════════════════

  sun: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" fill="${K}"/>
    <circle cx="12" cy="12" r="3" fill="${B}" opacity=".6"/>
    <rect x="11" y="1" width="2" height="4" rx="1" fill="${P}"/>
    <rect x="11" y="19" width="2" height="4" rx="1" fill="${P}"/>
    <rect x="1" y="11" width="4" height="2" rx="1" fill="${P}"/>
    <rect x="19" y="11" width="4" height="2" rx="1" fill="${P}"/>
    <rect x="3.5" y="3.5" width="2" height="3.5" rx="1" fill="${P}" transform="rotate(-45 4.5 5.25)"/>
    <rect x="17" y="17" width="2" height="3.5" rx="1" fill="${P}" transform="rotate(-45 18 18.75)"/>
    <rect x="3.5" y="17" width="2" height="3.5" rx="1" fill="${P}" transform="rotate(45 4.5 18.75)"/>
    <rect x="17" y="3.5" width="2" height="3.5" rx="1" fill="${P}" transform="rotate(45 18 5.25)"/>
  </svg>`,

  capture: `<svg viewBox="0 0 24 24">
    <polygon points="13 1 3 14 11 14 10 23 21 10 13 10" fill="${B}"/>
    <polygon points="13 1 9 8 13 10 21 10" fill="${P}" opacity=".7"/>
  </svg>`,

  briefing: `<svg viewBox="0 0 24 24">
    <rect x="3" y="1" width="18" height="22" rx="3" fill="${P}"/>
    <rect x="6" y="4" width="12" height="16" rx="1.5" fill="${N}"/>
    <rect x="8" y="6.5" width="8" height="1.5" rx=".75" fill="${W}" opacity=".6"/>
    <rect x="8" y="10" width="8" height="1.5" rx=".75" fill="${W}" opacity=".4"/>
    <rect x="8" y="13.5" width="5" height="1.5" rx=".75" fill="${W}" opacity=".3"/>
    <circle cx="10" cy="17.5" r="1.5" fill="${T}"/>
    <path d="M9.5 17.5l.8.8 2-2" stroke="${N}" stroke-width="1" stroke-linecap="round" fill="none"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  STATUS
  // ═══════════════════════════════════════

  hourglass: `<svg viewBox="0 0 24 24">
    <rect x="5" y="1" width="14" height="3" rx="1.5" fill="${P}"/>
    <rect x="5" y="20" width="14" height="3" rx="1.5" fill="${P}"/>
    <path d="M7 4v3c0 2.5 2 4 5 5-3 1-5 2.5-5 5v3h10v-3c0-2.5-2-4-5-5 3-1 5-2.5 5-5V4z" fill="${B}"/>
    <path d="M9 17c0-1.5 1.5-2.5 3-3v6h-1c-1.1 0-2-.9-2-2z" fill="${K}" opacity=".5"/>
    <circle cx="12" cy="12" r="1.5" fill="${W}"/>
  </svg>`,

  fire: `<svg viewBox="0 0 24 24">
    <path d="M12 22c5 0 8-3.5 8-9 0-3-2-5.5-3.5-7.5L12 10 10 5.5C8 7.5 4 10.5 4 15c0 4 3 7 8 7z" fill="${K}"/>
    <path d="M12 22c-2.5-1-4-3-4-5.5 0-2 1.5-3.5 4-4.5 2.5 1 4 2.5 4 4.5S14.5 21 12 22z" fill="${B}"/>
    <path d="M12 22c-1.2-.5-2-1.5-2-3 0-1 .8-2 2-2.5 1.2.5 2 1.5 2 2.5s-.8 2.5-2 3z" fill="${W}" opacity=".6"/>
  </svg>`,

  pause: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${P}"/>
    <rect x="7.5" y="7" width="3.5" height="10" rx="1.5" fill="${W}"/>
    <rect x="13" y="7" width="3.5" height="10" rx="1.5" fill="${W}"/>
  </svg>`,

  check: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${T}"/>
    <polyline points="7 12 10.5 16 17 8" stroke="${W}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  CONTEXTUAL
  // ═══════════════════════════════════════

  warning: `<svg viewBox="0 0 24 24">
    <path d="M12 2L1 21h22z" fill="${K}"/>
    <path d="M12 2L1 21h11z" fill="${P}" opacity=".3"/>
    <rect x="10.5" y="9" width="3" height="6" rx="1.5" fill="${W}"/>
    <circle cx="12" cy="18" r="1.5" fill="${W}"/>
  </svg>`,

  celebrate: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="${P}" stroke-width="2"/>
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="${K}" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" fill="${P}"/>
  </svg>`,

  brain: `<svg viewBox="0 0 24 24">
    <path d="M12 2C7 2 4 5.5 4 9c0 2 1 4 1 6s-1 3.5 0 5c.8 1 3 2 7 2z" fill="${K}"/>
    <path d="M12 2c5 0 8 3.5 8 7 0 2-1 4-1 6s1 3.5 0 5c-.8 1-3 2-7 2z" fill="${P}"/>
    <rect x="11" y="2" width="2" height="20" rx="1" fill="${N}"/>
    <path d="M8 7c1.5 1.5 3 2 4 2" stroke="${W}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/>
    <path d="M16 7c-1.5 1.5-3 2-4 2" stroke="${W}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/>
    <path d="M8 14c1.5 1 3 1.3 4 1.3" stroke="${W}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".4"/>
    <path d="M16 14c-1.5 1-3 1.3-4 1.3" stroke="${W}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".4"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  THEME
  // ═══════════════════════════════════════

  moon: `<svg viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="${P}"/>
    <circle cx="9" cy="8" r="1.5" fill="${N}" opacity=".3"/>
    <circle cx="13" cy="15" r="2" fill="${N}" opacity=".2"/>
    <circle cx="7" cy="14" r="1" fill="${N}" opacity=".2"/>
  </svg>`,

  'sun-small': `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" fill="${B}"/>
    <circle cx="12" cy="12" r="3" fill="${W}" opacity=".4"/>
    <rect x="11" y="2" width="2" height="3.5" rx="1" fill="${P}"/>
    <rect x="11" y="18.5" width="2" height="3.5" rx="1" fill="${P}"/>
    <rect x="2" y="11" width="3.5" height="2" rx="1" fill="${P}"/>
    <rect x="18.5" y="11" width="3.5" height="2" rx="1" fill="${P}"/>
    <rect x="4.3" y="4.3" width="2" height="3" rx="1" fill="${P}" transform="rotate(-45 5.3 5.8)"/>
    <rect x="17.7" y="16.7" width="2" height="3" rx="1" fill="${P}" transform="rotate(-45 18.7 18.2)"/>
    <rect x="4.3" y="16.7" width="2" height="3" rx="1" fill="${P}" transform="rotate(45 5.3 18.2)"/>
    <rect x="17.7" y="4.3" width="2" height="3" rx="1" fill="${P}" transform="rotate(45 18.7 5.8)"/>
  </svg>`,

  contrast: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${B}"/>
    <path d="M12 1a11 11 0 000 22z" fill="${N}"/>
    <circle cx="8" cy="10" r="1.5" fill="${W}" opacity=".4"/>
    <circle cx="16" cy="14" r="1.5" fill="${P}" opacity=".4"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════

  search: `<svg viewBox="0 0 24 24">
    <circle cx="10" cy="10" r="8" fill="${P}"/>
    <circle cx="10" cy="10" r="5.5" fill="${N}"/>
    <rect x="16" y="15" width="7" height="3.5" rx="1.5" fill="${K}" transform="rotate(45 19.5 16.75)"/>
    <circle cx="10" cy="10" r="2" fill="${W}" opacity=".3"/>
  </svg>`,

  bell: `<svg viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="${P}"/>
    <path d="M12 2a6 6 0 00-6 6c0 7-3 9-3 9h9z" fill="${B}" opacity=".4"/>
    <circle cx="12" cy="3" r="2" fill="${K}"/>
    <rect x="9" y="19" width="6" height="3" rx="1.5" fill="${K}"/>
  </svg>`,

  user: `<svg viewBox="0 0 24 24">
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7z" fill="${P}"/>
    <circle cx="12" cy="8" r="5" fill="${B}"/>
    <circle cx="12" cy="8" r="3" fill="${N}" opacity=".2"/>
  </svg>`,

  pencil: `<svg viewBox="0 0 24 24">
    <path d="M16 3l5 5-14 14H2v-5z" fill="${P}"/>
    <path d="M16 3l5 5-2 2-5-5z" fill="${K}"/>
    <path d="M2 22l1.5-5.5L7 20z" fill="${B}"/>
  </svg>`,

  download: `<svg viewBox="0 0 24 24">
    <rect x="2" y="16" width="20" height="6" rx="2" fill="${P}"/>
    <rect x="8" y="2" width="8" height="12" rx="2" fill="${B}"/>
    <polygon points="6 12 12 19 18 12" fill="${K}"/>
    <circle cx="18" cy="19" r="1.2" fill="${T}"/>
  </svg>`,

  upload: `<svg viewBox="0 0 24 24">
    <rect x="2" y="16" width="20" height="6" rx="2" fill="${P}"/>
    <rect x="8" y="8" width="8" height="12" rx="2" fill="${B}"/>
    <polygon points="6 10 12 3 18 10" fill="${K}"/>
    <circle cx="18" cy="19" r="1.2" fill="${T}"/>
  </svg>`,

  trash: `<svg viewBox="0 0 24 24">
    <rect x="4" y="6" width="16" height="16" rx="2" fill="${K}"/>
    <rect x="3" y="3" width="18" height="4" rx="2" fill="${P}"/>
    <rect x="8" y="1" width="8" height="3" rx="1.5" fill="${N}"/>
    <rect x="9" y="10" width="2" height="8" rx="1" fill="${W}" opacity=".4"/>
    <rect x="13" y="10" width="2" height="8" rx="1" fill="${W}" opacity=".4"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  MODULE-SPECIFIC (unique per module)
  // ═══════════════════════════════════════

  // Catálogo / Cotizador — price tag
  catalog: `<svg viewBox="0 0 24 24">
    <path d="M2 3v8l10 10 8-8L10 3z" fill="${T}"/>
    <path d="M10 3L2 3v8l4 4" fill="${P}" opacity=".4"/>
    <circle cx="7" cy="8" r="2" fill="${W}"/>
    <rect x="14" y="3" width="8" height="4" rx="2" fill="${K}"/>
    <text x="18" y="6" text-anchor="middle" fill="#fff" font-size="3.5" font-weight="bold" font-family="system-ui">$</text>
  </svg>`,

  // Inventario — open box with items
  inventory: `<svg viewBox="0 0 24 24">
    <path d="M2 8l10-6 10 6v12l-10 4-10-4z" fill="${P}"/>
    <path d="M12 2l10 6v12l-10 4z" fill="${N}" opacity=".3"/>
    <path d="M2 8l10 6 10-6" stroke="${W}" stroke-width="1" fill="none" opacity=".4"/>
    <line x1="12" y1="14" x2="12" y2="24" stroke="${W}" stroke-width="1" opacity=".3"/>
    <rect x="8" y="10" width="3" height="3" rx=".5" fill="${K}"/>
    <rect x="13" y="10" width="3" height="3" rx=".5" fill="${T}"/>
    <rect x="10" y="6" width="4" height="3" rx=".5" fill="${B}"/>
  </svg>`,

  // Turnos — clock with person silhouette
  shifts: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${P}"/>
    <circle cx="12" cy="12" r="7.5" fill="${W}" opacity=".15"/>
    <rect x="11.2" y="5" width="1.6" height="7" rx=".8" fill="${W}"/>
    <rect x="12" y="11.2" width="5" height="1.6" rx=".8" fill="${K}"/>
    <circle cx="12" cy="12" r="1.2" fill="${W}"/>
    <circle cx="20" cy="7" r="2.5" fill="${B}"/>
    <path d="M16.5 12c0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5" fill="${B}"/>
  </svg>`,

  // Flujo de Caja — banknotes flowing
  cashflow: `<svg viewBox="0 0 24 24">
    <rect x="1" y="5" width="15" height="10" rx="2" fill="${T}"/>
    <rect x="4" y="8" width="15" height="10" rx="2" fill="${P}"/>
    <circle cx="11.5" cy="13" r="3" fill="${W}" opacity=".3"/>
    <text x="11.5" y="15" text-anchor="middle" fill="${W}" font-size="5" font-weight="bold" font-family="system-ui">$</text>
    <path d="M18 6l3-3M18 9l5-5M21 12l2-2" stroke="${K}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // Calculadora de Rentabilidad — calculator
  'profitability-calc': `<svg viewBox="0 0 24 24">
    <rect x="4" y="1" width="16" height="22" rx="3" fill="${P}"/>
    <rect x="6" y="3" width="12" height="5" rx="1.5" fill="${T}"/>
    <text x="12" y="7" text-anchor="middle" fill="#fff" font-size="4" font-weight="bold" font-family="system-ui">%</text>
    <rect x="6" y="10" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="10.5" y="10" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="15" y="10" width="3" height="3" rx="1" fill="${K}"/>
    <rect x="6" y="14.5" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="10.5" y="14.5" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="15" y="14.5" width="3" height="3" rx="1" fill="${B}"/>
    <rect x="6" y="19" width="7.5" height="2.5" rx="1" fill="${W}" opacity=".4"/>
    <rect x="15" y="19" width="3" height="2.5" rx="1" fill="${T}"/>
  </svg>`,

  // Licitaciones — document with magnifier
  licitaciones: `<svg viewBox="0 0 24 24">
    <rect x="3" y="2" width="14" height="20" rx="2" fill="${P}"/>
    <rect x="6" y="5" width="8" height="1.5" rx=".75" fill="${W}" opacity=".5"/>
    <rect x="6" y="8" width="8" height="1.5" rx=".75" fill="${W}" opacity=".3"/>
    <rect x="6" y="11" width="5" height="1.5" rx=".75" fill="${W}" opacity=".3"/>
    <circle cx="17" cy="16" r="5" fill="${B}"/>
    <circle cx="17" cy="16" r="3" fill="${N}"/>
    <rect x="20" y="19.5" width="4" height="2.5" rx="1" fill="${K}" transform="rotate(45 22 20.75)"/>
  </svg>`,

  // Analítica — pie chart
  analytics: `<svg viewBox="0 0 24 24">
    <circle cx="11" cy="13" r="9" fill="${B}"/>
    <path d="M11 4a9 9 0 0 1 9 9h-9z" fill="${K}"/>
    <path d="M11 13V4a9 9 0 0 0-7.8 5z" fill="${P}"/>
    <circle cx="11" cy="13" r="3" fill="${W}" opacity=".2"/>
  </svg>`,

  // Evaluaciones / Test — checklist document
  test: `<svg viewBox="0 0 24 24">
    <rect x="4" y="3" width="16" height="19" rx="2" fill="${P}"/>
    <rect x="8" y="1" width="8" height="4" rx="1" fill="${T}"/>
    <rect x="9" y="9" width="7" height="1.5" rx=".75" fill="${W}" opacity=".7"/>
    <rect x="9" y="13" width="7" height="1.5" rx=".75" fill="${W}" opacity=".7"/>
    <rect x="9" y="17" width="5" height="1.5" rx=".75" fill="${W}" opacity=".7"/>
    <circle cx="6.5" cy="9.75" r="1" fill="${B}"/>
    <circle cx="6.5" cy="13.75" r="1" fill="${B}"/>
    <circle cx="6.5" cy="17.75" r="1" fill="${K}"/>
  </svg>`,

  // Clínica — medical building with cross
  clinic: `<svg viewBox="0 0 24 24">
    <rect x="3" y="7" width="18" height="15" rx="2" fill="${P}"/>
    <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" fill="${B}"/>
    <rect x="10.5" y="10" width="3" height="8" rx="1" fill="${W}"/>
    <rect x="8" y="12.5" width="8" height="3" rx="1" fill="${W}"/>
    <rect x="3" y="20" width="18" height="2" rx="1" fill="${K}" opacity=".2"/>
  </svg>`,

  // Calendario
  calendar: `<svg viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="${P}"/>
    <rect x="3" y="4" width="18" height="6" rx="2" fill="${N}"/>
    <rect x="7" y="2" width="2" height="4" rx="1" fill="${W}"/>
    <rect x="15" y="2" width="2" height="4" rx="1" fill="${W}"/>
    <rect x="7" y="13" width="3" height="3" rx="1" fill="${B}"/>
    <rect x="11" y="13" width="3" height="3" rx="1" fill="${B}"/>
    <rect x="15" y="13" width="3" height="3" rx="1" fill="${K}"/>
    <rect x="7" y="17" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="11" y="17" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
    <rect x="15" y="17" width="3" height="3" rx="1" fill="${W}" opacity=".5"/>
  </svg>`,

  // Tool / Wrench
  tool: `<svg viewBox="0 0 24 24">
    <path d="M14.7 9.3l-8 8A2.5 2.5 0 0 1 3.5 14l8-8a5.5 5.5 0 1 1 3.2 3.3z" fill="${T}"/>
    <circle cx="18" cy="6" r="1.5" fill="${W}"/>
    <path d="M7 17l-3 3 2 2 3-3" fill="${N}"/>
  </svg>`,

  // ═══════════════════════════════════════
  //  EXTRAS
  // ═══════════════════════════════════════

  plus: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${P}"/>
    <rect x="10.5" y="5" width="3" height="14" rx="1.5" fill="${W}"/>
    <rect x="5" y="10.5" width="14" height="3" rx="1.5" fill="${W}"/>
  </svg>`,

  mobile: `<svg viewBox="0 0 24 24">
    <rect x="5" y="2" width="14" height="20" rx="3" fill="${P}"/>
    <rect x="7" y="5" width="10" height="13" rx="1" fill="${N}"/>
    <rect x="10.5" y="3.5" width="3" height="1" rx=".5" fill="${W}" opacity=".5"/>
    <circle cx="12" cy="19.5" r="1" fill="${W}"/>
  </svg>`,

  chevron: `<svg viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" stroke="${P}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  close: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${K}"/>
    <rect x="6" y="10.5" width="12" height="3" rx="1.5" fill="${W}" transform="rotate(45 12 12)"/>
    <rect x="6" y="10.5" width="12" height="3" rx="1.5" fill="${W}" transform="rotate(-45 12 12)"/>
  </svg>`,

  settings: `<svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="${N}"/>
    <circle cx="12" cy="12" r="5" fill="${P}"/>
    <circle cx="12" cy="12" r="2.5" fill="${W}"/>
    <rect x="10.5" y="0" width="3" height="6" rx="1.5" fill="${P}"/>
    <rect x="10.5" y="18" width="3" height="6" rx="1.5" fill="${P}"/>
    <rect x="0" y="10.5" width="6" height="3" rx="1.5" fill="${P}"/>
    <rect x="18" y="10.5" width="6" height="3" rx="1.5" fill="${P}"/>
  </svg>`,
};

@Component({
  selector: 'um-icon',
  standalone: true,
  template: `<span class="um-icon-wrap" [innerHTML]="safeIcon" [style.width.px]="size" [style.height.px]="size"></span>`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .um-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    :host ::ng-deep svg {
      width: 100%;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UmIconComponent {
  @Input() name: string = 'target';
  @Input() size: number = 20;

  safeIcon: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const svg = ICONS[this.name];
    this.safeIcon = svg
      ? this.sanitizer.bypassSecurityTrustHtml(svg)
      : '';
  }
}

export type UmIconName = keyof typeof ICONS;
export const UM_ICON_NAMES = Object.keys(ICONS);
