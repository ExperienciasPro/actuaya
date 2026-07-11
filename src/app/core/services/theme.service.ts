import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type AppTheme = 'light' | 'dark' | 'auto';
export type AppTextSize = 'small' | 'medium' | 'large';

const EMOJI_TO_MATERIAL: Record<string, string> = {
  '🏠': 'home', '📊': 'bar_chart', '🎯': 'flag', '💰': 'payments', '🌪️': 'trending_up', '📡': 'track_changes', '📋': 'assignment', '📱': 'phone_android', '🏷️': 'sell', '⚙️': 'settings', '💸': 'currency_exchange', '📐': 'calculate', '🎨': 'palette', '🧾': 'receipt_long', '🤝': 'handshake', '🧪': 'science', '🗄️': 'database', '⏲️': 'timer', '📅': 'calendar_today', '🛠️': 'build', '👤': 'person', '📦': 'inventory_2', '🍽️': 'restaurant', '🕐': 'schedule', '💎': 'diamond', '👥': 'group', '🔍': 'search', '✅': 'check_circle', '✓': 'check', '⚠️': 'warning', '📭': 'mark_email_read', '📈': 'show_chart', '⚡': 'bolt', '🚨': 'emergency', '🖥️': 'desktop_mac', '🔧': 'handyman', '🔑': 'key', '💬': 'chat', '🏆': 'emoji_events', '🎉': 'celebration', '⬇️': 'arrow_downward', '⏸️': 'pause', '⏸': 'pause', '⏳': 'hourglass_empty', '⏱️': 'timer', '⊘': 'block', '↗': 'arrow_outward', '🧩': 'extension', '🧘': 'self_improvement', '🚻': 'wc', '🚀': 'rocket', '🗑️': 'delete', '🖼️': 'image', '🔴': 'circle', '🔔': 'notifications', '🔒': 'lock', '🔄': 'sync', '📸': 'photo_camera', '📧': 'email', '📥': 'inbox', '📤': 'outbox', '📚': 'menu_book', '📍': 'location_on', '📄': 'description', '💼': 'work', '💵': 'attach_money', '💍': 'ring', '👨‍🔧': 'plumbing', '🏙️': 'location_city', '🎂': 'cake', '🌍': 'public', '✨': 'auto_awesome', '⚡️': 'bolt', '⚖': 'balance', '▶': 'play_arrow', '⏭': 'skip_next', '⋮': 'more_vert', '↙': 'call_received', '↑': 'arrow_upward', '🚫': 'cancel',
  '✏️': 'edit', '🏗️': 'construction', '📝': 'edit_note', '🎓': 'school', '📉': 'trending_down', '⏰': 'alarm', '🤯': 'psychology', '🎆': 'flare', '🧑‍💻': 'computer', '🧳': 'luggage', '🏢': 'apartment', '👩‍💼': 'business_center', '👨‍💼': 'business_center', '👩‍🔧': 'engineering', '👩‍🏫': 'school', '🕰️': 'schedule', '🗓️': 'calendar_month', '🪓': 'carpenter', '🧍': 'person', '🧺': 'local_laundry_service', '🍏': 'nutrition', '🌖': 'dark_mode', '🪵': 'forest', '🔬': 'biotech', '💾': 'save', '🛒': 'shopping_cart', '🍕': 'local_pizza', '📆': 'date_range', '🎛️': 'tune', '💳': 'credit_card', '🌈': 'looks', '🦋': 'pets', '🍀': 'eco', '🐝': 'hive', '🌾': 'grass', '🧬': 'dna', '🪨': 'landscape', '☖': 'person', '♨': 'hot_tub', '◴': 'schedule'
};

const EMOJI_TO_KEY: Record<string, string> = {
  '🏠': 'home', '📊': 'analytics', '🎯': 'goals', '💰': 'finance', '🌪️': 'sales', '📡': 'radar', '📋': 'projects', '📱': 'coach', '🏷️': 'catalog', '⚙️': 'settings', '💸': 'cashflow', '📐': 'profitability', '🎨': 'storytelling', '🧾': 'income', '🤝': 'deals', '🧪': 'tests', '🗄️': 'data', '⏲️': 'ceo', '📅': 'assignments', '🛠️': 'technician', '👤': 'client', '📦': 'inventory', '🍽️': 'menu', '🕐': 'shifts', '💎': 'subscriptions'
};

// Normalize dictionaries by stripping variation selectors for reliable lookups
const NORM_EMOJI_TO_MATERIAL: Record<string, string> = {};
for (const [k, v] of Object.entries(EMOJI_TO_MATERIAL)) {
  NORM_EMOJI_TO_MATERIAL[k.replace(/\uFE0F/g, '')] = v;
}

const NORM_EMOJI_TO_KEY: Record<string, string> = {};
for (const [k, v] of Object.entries(EMOJI_TO_KEY)) {
  NORM_EMOJI_TO_KEY[k.replace(/\uFE0F/g, '')] = v;
}

export interface ColorPalette {
  id: string;
  name: string;
  preview: string[];       // 4 preview colors
  sidebarBg: string;
  sidebarText: string;
  sidebarActive: string;
  accent: string;
  accentLight: string;
}

export interface IconPack {
  id: string;
  name: string;
  preview: string;
  map: Record<string, string>;
  useFont?: boolean;
  fontStyle?: 'filled' | 'outlined' | 'circle' | 'glass';
}

export const COLOR_PALETTES: ColorPalette[] = [
  { id: 'default', name: 'ActuaYa Classic', preview: ['#e8f5e9','#2e7d32','#6c5ce7','#00cec9'], sidebarBg: '#eef2e6', sidebarText: '#3c4a2f', sidebarActive: '#2e7d32', accent: '#6c5ce7', accentLight: '#f0ecff' },
  { id: 'ocean', name: 'Océano Profundo', preview: ['#e3f2fd','#1565c0','#0288d1','#00bcd4'], sidebarBg: '#e3f2fd', sidebarText: '#1a2a3a', sidebarActive: '#1565c0', accent: '#0288d1', accentLight: '#e1f5fe' },
  { id: 'sunset', name: 'Atardecer Cálido', preview: ['#fff3e0','#e65100','#ff6d00','#ff9100'], sidebarBg: '#fff3e0', sidebarText: '#3e2723', sidebarActive: '#e65100', accent: '#ff6d00', accentLight: '#fff8e1' },
  { id: 'royal', name: 'Púrpura Real', preview: ['#f3e5f5','#6a1b9a','#8e24aa','#ab47bc'], sidebarBg: '#f3e5f5', sidebarText: '#311b42', sidebarActive: '#6a1b9a', accent: '#8e24aa', accentLight: '#f3e5f5' },
  { id: 'forest', name: 'Bosque Natural', preview: ['#e8f5e9','#2e7d32','#43a047','#66bb6a'], sidebarBg: '#e8f5e9', sidebarText: '#1b3a1b', sidebarActive: '#2e7d32', accent: '#43a047', accentLight: '#e8f5e9' },
  { id: 'midnight', name: 'Medianoche', preview: ['#263238','#37474f','#546e7a','#78909c'], sidebarBg: '#263238', sidebarText: '#cfd8dc', sidebarActive: '#78909c', accent: '#546e7a', accentLight: '#37474f' },
  { id: 'coral', name: 'Coral Fresco', preview: ['#fce4ec','#c62828','#ef5350','#e57373'], sidebarBg: '#fce4ec', sidebarText: '#3e1a1a', sidebarActive: '#c62828', accent: '#ef5350', accentLight: '#ffebee' },
  { id: 'mint', name: 'Menta Suave', preview: ['#e0f2f1','#00695c','#00897b','#4db6ac'], sidebarBg: '#e0f2f1', sidebarText: '#1a3a35', sidebarActive: '#00695c', accent: '#00897b', accentLight: '#e0f2f1' },
];

export const ICON_PACKS: IconPack[] = [
  {
    id: 'classic', name: 'Clásico', preview: '🏠📊🎯💰',
    map: { home: '🏠', analytics: '📊', goals: '🎯', finance: '💰', sales: '🌪️', radar: '📡', projects: '📋', coach: '📱', catalog: '🏷️', settings: '⚙️', cashflow: '💸', profitability: '📐', storytelling: '🎨', income: '🧾', deals: '🤝', forms: '📋', tests: '🧪', data: '🗄️', results: '📊', ceo: '⏲️', assignments: '📅', technician: '🛠️', client: '👤', inventory: '📦', menu: '🍽️', shifts: '🕐', admin: '⚙️', subscriptions: '💎' },
  },
  {
    id: 'minimal', name: 'Minimalista', preview: '◉ ▣ ◎ ◈',
    map: { home: '◉', analytics: '▣', goals: '◎', finance: '◈', sales: '▲', radar: '◐', projects: '▦', coach: '◧', catalog: '◆', settings: '⊛', cashflow: '◇', profitability: '△', storytelling: '○', income: '□', deals: '◑', forms: '▤', tests: '◍', data: '▥', results: '▣', ceo: '◷', assignments: '▦', technician: '⚒', client: '☖', inventory: '▤', menu: '♨', shifts: '◴', admin: '⊛', subscriptions: '◈' },
  },
  {
    id: 'neon', name: 'Neón Moderno', preview: '⚡🔥💎✨',
    map: { home: '⚡', analytics: '💎', goals: '🔥', finance: '💲', sales: '🚀', radar: '🛸', projects: '🎯', coach: '📲', catalog: '🏪', settings: '🔧', cashflow: '💳', profitability: '📉', storytelling: '🌈', income: '💵', deals: '💼', forms: '📝', tests: '🔬', data: '💾', results: '💎', ceo: '⏱️', assignments: '📆', technician: '🔧', client: '👥', inventory: '🛒', menu: '🍕', shifts: '⏳', admin: '🎛️', subscriptions: '💳' },
  },
  {
    id: 'nature', name: 'Naturaleza', preview: '🌿🌸🌊🌅',
    map: { home: '🌿', analytics: '🌸', goals: '🌅', finance: '🌻', sales: '🌊', radar: '🦅', projects: '🌲', coach: '🌱', catalog: '🌺', settings: '🍃', cashflow: '🌧️', profitability: '🌈', storytelling: '🦋', income: '🍀', deals: '🐝', forms: '🌾', tests: '🧬', data: '🪨', results: '🌸', ceo: '🕰️', assignments: '🗓️', technician: '🪓', client: '🧍', inventory: '🧺', menu: '🍏', shifts: '🌖', admin: '🪵', subscriptions: '💍' },
  },
  {
    id: 'solid', name: 'Sólido Moderno', preview: 'home bar_chart flag payments',
    useFont: true, fontStyle: 'filled',
    map: { home: 'home', analytics: 'bar_chart', goals: 'flag', finance: 'payments', sales: 'trending_up', radar: 'track_changes', projects: 'assignment', coach: 'phone_android', catalog: 'sell', settings: 'settings', cashflow: 'currency_exchange', profitability: 'calculate', storytelling: 'palette', income: 'receipt_long', deals: 'handshake', forms: 'description', tests: 'science', data: 'database', results: 'monitoring', ceo: 'timer', assignments: 'calendar_today', technician: 'build', client: 'person', inventory: 'inventory_2', menu: 'restaurant', shifts: 'schedule', admin: 'admin_panel_settings', subscriptions: 'diamond' },
  },
  {
    id: 'outline', name: 'Línea Fina', preview: 'home bar_chart flag payments',
    useFont: true, fontStyle: 'outlined',
    map: { home: 'home', analytics: 'bar_chart', goals: 'flag', finance: 'payments', sales: 'trending_up', radar: 'track_changes', projects: 'assignment', coach: 'phone_android', catalog: 'sell', settings: 'settings', cashflow: 'currency_exchange', profitability: 'calculate', storytelling: 'palette', income: 'receipt_long', deals: 'handshake', forms: 'description', tests: 'science', data: 'database', results: 'monitoring', ceo: 'timer', assignments: 'calendar_today', technician: 'build', client: 'person', inventory: 'inventory_2', menu: 'restaurant', shifts: 'schedule', admin: 'admin_panel_settings', subscriptions: 'diamond' },
  },
  {
    id: 'circles', name: 'Circular Plano', preview: 'home bar_chart flag payments',
    useFont: true, fontStyle: 'circle',
    map: { home: 'home', analytics: 'bar_chart', goals: 'flag', finance: 'payments', sales: 'trending_up', radar: 'track_changes', projects: 'assignment', coach: 'phone_android', catalog: 'sell', settings: 'settings', cashflow: 'currency_exchange', profitability: 'calculate', storytelling: 'palette', income: 'receipt_long', deals: 'handshake', forms: 'description', tests: 'science', data: 'database', results: 'monitoring', ceo: 'timer', assignments: 'calendar_today', technician: 'build', client: 'person', inventory: 'inventory_2', menu: 'restaurant', shifts: 'schedule', admin: 'admin_panel_settings', subscriptions: 'diamond' },
  },
  {
    id: 'glass', name: 'Cristal 3D', preview: 'home bar_chart flag payments',
    useFont: true, fontStyle: 'glass',
    map: { home: 'home', analytics: 'bar_chart', goals: 'flag', finance: 'payments', sales: 'trending_up', radar: 'track_changes', projects: 'assignment', coach: 'phone_android', catalog: 'sell', settings: 'settings', cashflow: 'currency_exchange', profitability: 'calculate', storytelling: 'palette', income: 'receipt_long', deals: 'handshake', forms: 'description', tests: 'science', data: 'database', results: 'monitoring', ceo: 'timer', assignments: 'calendar_today', technician: 'build', client: 'person', inventory: 'inventory_2', menu: 'restaurant', shifts: 'schedule', admin: 'admin_panel_settings', subscriptions: 'diamond' },
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'um_theme';
  private readonly PALETTE_KEY = 'um_color_palette';
  private readonly ICONS_KEY = 'um_icon_pack';
  private readonly TEXT_SIZE_KEY = 'um_text_size';

  private themeSignal = signal<AppTheme>('auto');
  private paletteSignal = signal<string>('default');
  private iconPackSignal = signal<string>('circles');
  private textSizeSignal = signal<AppTextSize>('medium');

  readonly theme = this.themeSignal.asReadonly();
  readonly paletteId = this.paletteSignal.asReadonly();
  readonly iconPackId = this.iconPackSignal.asReadonly();
  readonly textSize = this.textSizeSignal.asReadonly();

  constructor(private storage: StorageService) {
    const saved = this.storage.get<AppTheme>(this.STORAGE_KEY);
    if (saved) this.themeSignal.set(saved);

    const savedPalette = this.storage.get<string>(this.PALETTE_KEY);
    if (savedPalette) this.paletteSignal.set(savedPalette);

    const savedIcons = this.storage.get<string>(this.ICONS_KEY);
    if (savedIcons) this.iconPackSignal.set(savedIcons);

    const savedTextSize = this.storage.get<AppTextSize>(this.TEXT_SIZE_KEY);
    if (savedTextSize) this.textSizeSignal.set(savedTextSize);

    this.applyTheme();
    this.applyPalette();
    this.applyTextSize();
    this.applyIconFont();
    this.initGlobalIconObserver();
  }

  setTheme(theme: AppTheme): void {
    this.themeSignal.set(theme);
    this.storage.set(this.STORAGE_KEY, theme);
    this.applyTheme();
  }

  setPalette(paletteId: string): void {
    this.paletteSignal.set(paletteId);
    this.storage.set(this.PALETTE_KEY, paletteId);
    this.applyPalette();
  }

  setIconPack(packId: string): void {
    this.iconPackSignal.set(packId);
    this.storage.set(this.ICONS_KEY, packId);
    this.applyIconFont();
    if (typeof document !== 'undefined') {
      // Clear cached pack id so all icons get re-processed
      document.querySelectorAll('[data-icon-pack]').forEach(el => el.removeAttribute('data-icon-pack'));
      this.processIcons();
    }
  }

  setTextSize(size: AppTextSize): void {
    this.textSizeSignal.set(size);
    this.storage.set(this.TEXT_SIZE_KEY, size);
    this.applyTextSize();
  }

  getIcon(key: string): string {
    const pack = ICON_PACKS.find(p => p.id === this.iconPackSignal());
    return pack?.map[key] || ICON_PACKS[0].map[key] || '•';
  }

  getCurrentPalette(): ColorPalette {
    return COLOR_PALETTES.find(p => p.id === this.paletteSignal()) || COLOR_PALETTES[0];
  }

  toggle(): void {
    const current = this.themeSignal();
    const next: AppTheme = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    this.setTheme(next);
  }

  private applyTheme(): void {
    const theme = this.themeSignal();
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
      root.classList.add(`theme-${theme}`);
    }
  }

  private applyPalette(): void {
    const palette = this.getCurrentPalette();
    const root = document.documentElement;
    root.style.setProperty('--sidebar-bg', palette.sidebarBg);
    root.style.setProperty('--sidebar-text', palette.sidebarText);
    root.style.setProperty('--sidebar-active', palette.sidebarActive);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--accent-light', palette.accentLight);

    // Parse accent hex to RGB for rgba() usage
    const hex = palette.accent.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

    // Parse sidebarActive to RGB
    const saHex = palette.sidebarActive.replace('#', '');
    const sr = parseInt(saHex.substring(0, 2), 16);
    const sg = parseInt(saHex.substring(2, 4), 16);
    const sb = parseInt(saHex.substring(4, 6), 16);
    root.style.setProperty('--sidebar-active-rgb', `${sr}, ${sg}, ${sb}`);

    // Programmatically override hardcoded inline styles on the page
    this.overrideInlineColors(palette);
  }

  private overrideInlineColors(palette: ColorPalette): void {
    if (typeof document === 'undefined') return;
    // Target all elements with inline style containing common hardcoded accent hex colors
    const accentHexes = ['#3b82f6', '#2563eb', '#8b5cf6', '#7c3aed', '#6c5ce7', '#6c3ce9',
                         '#10b981', '#059669', '#f59e0b', '#d97706', '#6366f1', '#0ea5e9',
                         '#06b6d4', '#14b8a6', '#0891b2'];
    const bgHexes = ['#eff6ff', '#f0f9ff', '#ecfeff', '#f0fdf4', '#ecfdf5', '#fffbeb',
                     '#fef3c7', '#f5f3ff', '#eef2ff', '#ccfbf1'];

    document.querySelectorAll('[style]').forEach((el: Element) => {
      const style = (el as HTMLElement).style;
      const raw = el.getAttribute('style') || '';

      // Replace accent foreground colors
      for (const hex of accentHexes) {
        if (raw.toLowerCase().includes(hex)) {
          if (raw.includes('color') && !raw.includes('background')) {
            // It's a text color
            style.setProperty('color', palette.accent, 'important');
          }
          if (raw.includes('background')) {
            // Could be background or background-color
            if (raw.includes('background-color') || (raw.includes('background:') && !raw.includes('gradient'))) {
              style.setProperty('background-color', palette.accent, 'important');
              style.setProperty('color', '#fff', 'important');
            }
          }
          if (raw.includes('border')) {
            style.setProperty('border-color', palette.accent, 'important');
          }
        }
      }
      // Replace accent light background colors
      for (const hex of bgHexes) {
        if (raw.toLowerCase().includes(hex) && raw.includes('background')) {
          style.setProperty('background-color', palette.accentLight, 'important');
        }
      }
    });
  }

  private applyTextSize(): void {
    const size = this.textSizeSignal();
    const root = document.documentElement;
    let px = '16px';
    if (size === 'small') px = '14px';
    if (size === 'large') px = '18px';
    root.style.setProperty('--app-font-size', px);
  }

  private applyIconFont(): void {
    const pack = ICON_PACKS.find(p => p.id === this.iconPackSignal());
    const root = document.documentElement;
    root.classList.remove('icon-font-filled', 'icon-font-outlined', 'icon-font-circle', 'icon-font-glass');
    if (pack?.useFont && pack?.fontStyle) {
      root.classList.add(`icon-font-${pack.fontStyle}`);
    }
  }
  private _iconObserver: MutationObserver | null = null;
  private _processingIcons = false;
  private _iconDebounce: any = null;

  private initGlobalIconObserver(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this._iconObserver = new MutationObserver(() => {
      if (this._processingIcons) return;
      if (this._iconDebounce) clearTimeout(this._iconDebounce);
      this._iconDebounce = setTimeout(() => {
        this.processIcons();
        this.overrideInlineColors(this.getCurrentPalette());
      }, 60);
    });

    this._iconObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => this.processIcons(), 150);
  }

  private processIcons(): void {
    if (typeof document === 'undefined') return;
    const pack = ICON_PACKS.find(p => p.id === this.iconPackSignal());
    if (!pack) return;

    this._processingIcons = true;
    const useFont = !!pack.useFont;

    // Generate regex from known emojis to ensure 100% match rate regardless of unicode properties
    const knownEmojis = Object.keys(NORM_EMOJI_TO_MATERIAL);
    // Sort by length descending so longer emojis match first
    knownEmojis.sort((a, b) => b.length - a.length);
    const emojiRegex = new RegExp(knownEmojis.join('|'), 'gu');

    // Walk ALL text nodes in the body
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Text) => {
          // Skip script/style/noscript
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'INPUT') {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip nodes already processed in current state
          if (parent.hasAttribute('data-icon-pack') && parent.getAttribute('data-icon-pack') === pack.id) {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent || '';
          
          // Accept if it contains one of our known emojis OR if parent was previously processed
          // Clean the text from variation selectors before testing just to be safe
          const cleanText = text.replace(/\uFE0F/g, '');
          if (emojiRegex.test(cleanText) || parent.hasAttribute('data-original-emoji')) {
            emojiRegex.lastIndex = 0;
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodesToProcess: { node: Text; parent: HTMLElement }[] = [];
    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const parent = textNode.parentElement;
      if (parent) nodesToProcess.push({ node: textNode, parent });
    }

    for (const { node, parent } of nodesToProcess) {
      const text = node.textContent || '';
      const trimmed = text.trim();
      const cleanEmoji = trimmed.replace(/\uFE0F/g, '');

      // Check if parent has a stored original emoji (was already processed before)
      const storedOriginal = parent.getAttribute('data-original-emoji');
      const cleanStored = storedOriginal ? storedOriginal.replace(/\uFE0F/g, '') : null;

      // Ensure the text node is isolated (no other non-whitespace text nodes exist in parent)
      const hasOtherText = Array.from(parent.childNodes).some(n => 
        n.nodeType === Node.TEXT_NODE && n !== node && (n.textContent || '').trim() !== ''
      );

      // Only convert IF it's a single standalone emoji (like in a badge, icon box, etc)
      const isOnlyEmoji = storedOriginal || (!hasOtherText && NORM_EMOJI_TO_MATERIAL[cleanEmoji]);

      if (isOnlyEmoji) {
        const originalEmoji = storedOriginal || trimmed;
        const baseLookup = cleanStored || cleanEmoji;
        
        if (!storedOriginal) {
          parent.setAttribute('data-original-emoji', originalEmoji);
        }

        if (useFont) {
          const matName = NORM_EMOJI_TO_MATERIAL[baseLookup] || 'fiber_manual_record';
          if (node.textContent !== matName) {
            node.textContent = matName;
            parent.setAttribute('data-themed-icon', 'true');
          }
        } else {
          // Emoji pack: restore original or map to pack variant
          const key = NORM_EMOJI_TO_KEY[baseLookup];
          const newIcon = (key && pack.map[key]) ? pack.map[key] : originalEmoji;
          if (node.textContent !== newIcon) {
            node.textContent = newIcon;
            parent.removeAttribute('data-themed-icon');
          }
        }
        parent.setAttribute('data-icon-pack', pack.id);
      }
      // Note: We completely skip mixed text (emojis inside paragraphs/titles)
      // This honors the user preference "a los titulos de las categorias no le pongas iconos"
    }

    // Re-enable observer after a short delay
    setTimeout(() => { this._processingIcons = false; }, 100);
  }
}
