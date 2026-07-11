import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, COLOR_PALETTES, ICON_PACKS, AppTheme, AppTextSize } from '../../../core/services/theme.service';

@Component({
  selector: 'um-appearance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="appearance-page">
      <div class="page-header">
        <h2>🎨 Personalizar Apariencia</h2>
        <p class="subtitle">Ajusta los colores y el estilo visual de tu plataforma</p>
      </div>

      <!-- Theme Mode -->
      <section class="section">
        <h3>Modo de visualización</h3>
        <div class="theme-row">
          @for (opt of themeOptions; track opt.value) {
            <button class="theme-btn" [class.active]="themeService.theme() === opt.value"
                    (click)="themeService.setTheme(opt.value)">
              <span class="theme-icon">{{ opt.icon }}</span>
              <span class="theme-label">{{ opt.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Color Palette -->
      <section class="section">
        <h3>Paleta de colores</h3>
        <p class="section-desc">Selecciona una combinación de colores que represente tu estilo</p>
        <div class="palette-grid">
          @for (palette of palettes; track palette.id) {
            <button class="palette-card" [class.active]="themeService.paletteId() === palette.id"
                    (click)="themeService.setPalette(palette.id)">
              <div class="palette-preview">
                @for (color of palette.preview; track color) {
                  <span class="color-dot" [style.background]="color"></span>
                }
              </div>
              <span class="palette-name">{{ palette.name }}</span>
              @if (themeService.paletteId() === palette.id) {
                <span class="check-mark">✓</span>
              }
            </button>
          }
        </div>
      </section>

      <!-- Icon Styles -->
      <section class="section">
        <h3>Estilo de iconos</h3>
        <p class="section-desc">Escoge el set de iconos que prefieras para la navegación</p>
        <div class="icon-grid">
          @for (pack of iconPacks; track pack.id) {
            <button class="icon-card" [class.active]="themeService.iconPackId() === pack.id"
                    (click)="themeService.setIconPack(pack.id)">
              @if (pack.useFont) {
                <span class="icon-preview font-preview">
                  @for (key of previewKeys; track key) {
                    <span class="msym" [class.msym-filled]="pack.fontStyle !== 'outlined'"
                          [class.msym-circle]="pack.fontStyle === 'circle'"
                          [class.msym-glass]="pack.fontStyle === 'glass'">{{ pack.map[key] }}</span>
                  }
                </span>
              } @else {
                <span class="icon-preview">{{ pack.preview }}</span>
              }
              <span class="icon-name">{{ pack.name }}</span>
              @if (themeService.iconPackId() === pack.id) {
                <span class="check-mark">✓</span>
              }
            </button>
          }
        </div>
      </section>

      <!-- Text Size -->
      <section class="section">
        <h3>Tamaño de texto</h3>
        <p class="section-desc">Ajusta el tamaño de la letra para mayor comodidad</p>
        <div class="theme-row">
          @for (size of textSizes; track size.value) {
            <button class="theme-btn" [class.active]="themeService.textSize() === size.value"
                    (click)="themeService.setTextSize(size.value)">
              <span class="theme-icon" [style.fontSize]="size.value === 'small' ? '20px' : size.value === 'large' ? '36px' : '28px'">{{ size.icon }}</span>
              <span class="theme-label">{{ size.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Live Preview -->
      <section class="section">
        <h3>Vista previa</h3>
        <div class="preview-box">
          <div class="preview-sidebar" [style.background]="currentPalette.sidebarBg">
            <div class="preview-item" [style.color]="currentPalette.sidebarText">
              <span>{{ getIcon('home') }}</span> Inicio
            </div>
            <div class="preview-item active" [style.color]="currentPalette.sidebarActive" [style.background]="currentPalette.accentLight">
              <span>{{ getIcon('analytics') }}</span> Analítica
            </div>
            <div class="preview-item" [style.color]="currentPalette.sidebarText">
              <span>{{ getIcon('goals') }}</span> Metas
            </div>
            <div class="preview-item" [style.color]="currentPalette.sidebarText">
              <span>{{ getIcon('finance') }}</span> Finanzas
            </div>
            <div class="preview-item" [style.color]="currentPalette.sidebarText">
              <span>{{ getIcon('projects') }}</span> Proyectos
            </div>
          </div>
          <div class="preview-content">
            <div class="preview-card" [style.border-left-color]="currentPalette.accent">
              <strong>Ejemplo de tarjeta</strong>
              <p>Así se verán los elementos con tu nueva paleta</p>
            </div>
            <button class="preview-btn" [style.background]="currentPalette.accent">Botón principal</button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .appearance-page { padding: 28px 32px; max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .page-header h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 6px; }
    .subtitle { color: #64748b; font-size: 0.95rem; margin: 0; }

    .section { margin-bottom: 36px; }
    .section h3 { font-size: 1.15rem; font-weight: 700; margin: 0 0 6px; }
    .section-desc { font-size: 0.85rem; color: #94a3b8; margin: 0 0 16px; }

    /* Theme Mode */
    .theme-row { display: flex; gap: 12px; margin-top: 14px; }
    .theme-btn {
      flex: 1; padding: 18px; border-radius: 14px; border: 2px solid #e2e8f0;
      background: #fff; cursor: pointer; display: flex; flex-direction: column;
      align-items: center; gap: 8px; transition: all 0.2s;
    }
    .theme-btn:hover { border-color: #a29bfe; }
    .theme-btn.active { border-color: #6c5ce7; background: #f0ecff; }
    .theme-icon { font-size: 28px; }
    .theme-label { font-size: 0.85rem; font-weight: 600; color: #334155; }

    /* Color Palette */
    .palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .palette-card {
      padding: 16px; border-radius: 14px; border: 2px solid #e2e8f0;
      background: #fff; cursor: pointer; display: flex; flex-direction: column;
      gap: 10px; transition: all 0.2s; position: relative;
    }
    .palette-card:hover { border-color: #a29bfe; transform: translateY(-2px); }
    .palette-card.active { border-color: #6c5ce7; box-shadow: 0 4px 16px rgba(108,92,231,0.18); }
    .palette-preview { display: flex; gap: 6px; }
    .color-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.6); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .palette-name { font-size: 0.88rem; font-weight: 600; color: #334155; }
    .check-mark { position: absolute; top: 10px; right: 12px; background: #6c5ce7; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }

    /* Icon Packs */
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
    .icon-card {
      padding: 20px 16px; border-radius: 14px; border: 2px solid #e2e8f0;
      background: #fff; cursor: pointer; display: flex; flex-direction: column;
      align-items: center; gap: 10px; transition: all 0.2s; position: relative;
    }
    .icon-card:hover { border-color: #a29bfe; transform: translateY(-2px); }
    .icon-card.active { border-color: #6c5ce7; box-shadow: 0 4px 16px rgba(108,92,231,0.18); }
    .icon-preview { font-size: 24px; letter-spacing: 4px; }
    .font-preview { display: flex; gap: 8px; letter-spacing: 0; }
    .msym {
      font-family: 'Material Symbols Rounded';
      font-size: 24px;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
      color: #5c6bc0;
      line-height: 1;
    }
    .msym-filled {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .msym-circle {
      color: #fff;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .msym-circle:nth-child(1) { background: #26a69a; }
    .msym-circle:nth-child(2) { background: #5c6bc0; }
    .msym-circle:nth-child(3) { background: #ef5350; }
    .msym-circle:nth-child(4) { background: #ffa726; }
    .msym-glass {
      font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
      color: transparent;
      background-clip: text;
      -webkit-background-clip: text;
      filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.15));
      line-height: 1.2;
    }
    .msym-glass:nth-child(1) { background-image: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); }
    .msym-glass:nth-child(2) { background-image: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
    .msym-glass:nth-child(3) { background-image: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
    .msym-glass:nth-child(4) { background-image: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
    .icon-name { font-size: 0.88rem; font-weight: 600; color: #334155; }

    /* Live Preview */
    .preview-box {
      display: flex; border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
      height: 260px;
    }
    .preview-sidebar {
      width: 200px; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px;
    }
    .preview-item {
      padding: 10px 14px; border-radius: 10px; font-size: 0.85rem;
      font-weight: 500; display: flex; align-items: center; gap: 10px;
      transition: all 0.15s;
    }
    .preview-item.active { font-weight: 700; border-radius: 10px; }
    .preview-content {
      flex: 1; padding: 24px; background: #fff; display: flex;
      flex-direction: column; gap: 16px; justify-content: center;
    }
    .preview-card {
      padding: 16px; border-left: 4px solid; border-radius: 8px;
      background: #f8fafc;
    }
    .preview-card strong { font-size: 0.95rem; }
    .preview-card p { font-size: 0.82rem; color: #64748b; margin: 4px 0 0; }
    .preview-btn {
      align-self: flex-start; padding: 10px 28px; border-radius: 10px;
      border: none; color: #fff; font-weight: 700; font-size: 0.88rem;
      cursor: default;
    }

    @media (max-width: 700px) {
      .appearance-page { padding: 20px 16px; }
      .theme-row { flex-direction: column; }
      .preview-box { flex-direction: column; height: auto; }
      .preview-sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; }
    }
  `]
})
export class AppearanceComponent {
  themeService = inject(ThemeService);
  palettes = COLOR_PALETTES;
  iconPacks = ICON_PACKS;
  previewKeys = ['home', 'analytics', 'goals', 'finance'];

  themeOptions: { value: AppTheme; icon: string; label: string }[] = [
    { value: 'light', icon: '☀️', label: 'Claro' },
    { value: 'dark', icon: '🌙', label: 'Oscuro' },
    { value: 'auto', icon: '🖥️', label: 'Automático' },
  ];

  textSizes: { value: AppTextSize; icon: string; label: string }[] = [
    { value: 'small', icon: 'Aa', label: 'Pequeño' },
    { value: 'medium', icon: 'Aa', label: 'Normal' },
    { value: 'large', icon: 'Aa', label: 'Grande' },
  ];

  get currentPalette() {
    return this.themeService.getCurrentPalette();
  }

  getIcon(key: string): string {
    return this.themeService.getIcon(key);
  }
}
