import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MenuService } from '../../core/services/menu.service';
import { MenuConfig, MenuItem, MenuCategory, DEFAULT_MENU_CONFIG } from '../../core/models/menu.model';

@Component({
  selector: 'um-menu-public',
  standalone: true,
  template: `
    <div class="menu-public"
         [style.--brand]="cfg().primaryColor"
         [style.--brand-sec]="cfg().secondaryColor"
         [style.--font]="fontFamily()"
         [style.--radius]="radiusVal()"
         [style.--font-base]="fontBase()"
         [class.theme-dark]="isDark()"
         [class.layout-grid]="cfg().layout === 'grid'"
         [class.layout-compact]="cfg().layout === 'compact'"
         [class.layout-list]="cfg().layout === 'list'">

      <!-- Cover Image (responsive) -->
      @if (cfg().coverImageDataUrl) {
        <div class="cover-hero">
          <img class="cover-hero-img" [src]="cfg().coverImageDataUrl" [alt]="cfg().businessName + ' portada'" loading="eager" />
          <div class="cover-hero-overlay">
            @if (cfg().logoDataUrl) {
              <img class="menu-logo" [src]="cfg().logoDataUrl" [alt]="cfg().businessName" />
            }
            <h1 class="menu-title">{{ cfg().businessName }}</h1>
            <p class="menu-tagline">{{ cfg().tagline }}</p>
          </div>
        </div>
      } @else {
        <!-- Header without cover -->
        <header class="menu-header"
                [class.header-gradient]="cfg().headerStyle === 'gradient'"
                [class.header-minimal]="cfg().headerStyle === 'minimal'">
          @if (cfg().logoDataUrl) {
            <img class="menu-logo" [src]="cfg().logoDataUrl" [alt]="cfg().businessName" />
          }
          <h1 class="menu-title">{{ cfg().businessName }}</h1>
          <p class="menu-tagline">{{ cfg().tagline }}</p>
        </header>
      }

      <!-- Info bar (wifi, schedule, socials) -->
      @if (hasInfoBar()) {
        <div class="info-bar">
          @if (cfg().schedule) {
            <span class="info-item">🕐 {{ cfg().schedule }}</span>
          }
          @if (cfg().wifiName) {
            <span class="info-item">📶 {{ cfg().wifiName }}@if (cfg().wifiPassword) { · 🔑 {{ cfg().wifiPassword }} }</span>
          }
          @if (cfg().socialInstagram) {
            <a class="info-item info-link" [href]="'https://instagram.com/' + cfg().socialInstagram.replace('@','')" target="_blank" rel="noopener">
              📸 {{ cfg().socialInstagram }}
            </a>
          }
          @if (cfg().socialWhatsapp) {
            <a class="info-item info-link" [href]="'https://wa.me/' + cfg().socialWhatsapp.replace(/[^0-9]/g, '')" target="_blank" rel="noopener">
              📱 WhatsApp
            </a>
          }
        </div>
      }

      <!-- Category navigation pills -->
      @if (sortedCategories().length > 1 && !loading() && !error()) {
        <nav class="cat-nav">
          @for (cat of sortedCategories(); track cat.id) {
            @if (hasCatItems(cat.id)) {
              <a class="cat-pill" [href]="'#cat-' + cat.id">{{ cat.emoji }} {{ cat.name }}</a>
            }
          }
        </nav>
      }

      <!-- Categories and items -->
      @if (loading()) {
        <div class="loading-state">
          <p>Cargando menú...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>⚠️ No se pudo cargar el menú. Asegúrate de que el enlace sea correcto.</p>
        </div>
      } @else {
        <main class="menu-body">
          @for (cat of sortedCategories(); track cat.id) {
            @if (hasCatItems(cat.id)) {
              <section class="menu-section" [id]="'cat-' + cat.id">
                <h2 class="section-title">{{ cat.emoji }} {{ cat.name }}</h2>
                <div class="items-container" [class.with-images]="cfg().showImages">
                  @for (item of itemsForCat(cat.id); track item.id) {
                  <div class="menu-item-card">
                    @if (cfg().showImages && item.imageDataUrl) {
                      <img class="item-photo" [src]="item.imageDataUrl" [alt]="item.name" loading="lazy" />
                    }
                    <div class="item-body">
                      <div class="item-top">
                        <span class="item-name">{{ item.name }}</span>
                        @if (cfg().showPrices) {
                          <span class="item-price">{{ fmt(item.price) }}</span>
                        }
                      </div>
                      @if (item.description) {
                        <p class="item-desc">{{ item.description }}</p>
                      }
                      @if (item.tags?.length) {
                        <div class="item-tags">
                          @for (t of item.tags; track t) {
                            <span class="item-tag">{{ t }}</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        }

          @if (!availableItems().length) {
            <div class="empty-menu">
              <p>🍽️ La carta estará disponible pronto.</p>
            </div>
          }
        </main>
      }

      <!-- Footer -->
      @if (cfg().footerNote) {
        <footer class="menu-footer">{{ cfg().footerNote }}</footer>
      }

      @if (cfg().showPoweredBy) {
        <div class="powered-by">
          Menú digital por <strong>ActuaYa</strong>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Poppins:wght@400;600;700;900&family=Outfit:wght@400;600;700;900&family=Lora:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap');

    :host { display: block; }

    .menu-public {
      --brand: #e67e22;
      --brand-sec: #2d3436;
      --font: 'Inter', system-ui, sans-serif;
      --radius: 14px;
      --font-base: 1rem;
      --bg: #fafaf9;
      --text: #1c1917;
      --text-sec: #78716c;
      --card-bg: white;
      --border: #e7e5e4;
      --tag-bg: #fef3c7;
      --tag-text: #92400e;
      font-family: var(--font);
      background: var(--bg);
      min-height: 100vh;
      color: var(--text);
      font-size: var(--font-base);
    }

    /* Dark theme */
    .theme-dark {
      --bg: #18181b;
      --text: #f4f4f5;
      --text-sec: #a1a1aa;
      --card-bg: #27272a;
      --border: #3f3f46;
      --tag-bg: rgba(255,200,80,0.15);
      --tag-text: #fbbf24;
    }

    /* ── Header ── */
    .menu-header {
      background: var(--brand);
      color: white;
      text-align: center;
      padding: 36px 24px 28px;
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .menu-header.header-gradient {
      background: linear-gradient(135deg, var(--brand), var(--brand-sec));
    }

    .menu-header.header-minimal {
      background: var(--card-bg);
      color: var(--text);
      border-bottom: 2px solid var(--brand);
    }

    /* ── Cover Hero (responsive image) ── */
    .cover-hero {
      position: relative;
      width: 100%;
      overflow: hidden;
    }

    .cover-hero-img {
      display: block;
      width: 100%;
      height: auto;
      min-height: 180px;
      max-height: 360px;
      object-fit: cover;
    }

    .cover-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.25) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding: 24px 20px;
      text-align: center;
      color: white;
    }

    .cover-hero-overlay .menu-logo {
      max-height: 60px;
      max-width: 140px;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 10px;
      display: block;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
    }

    .cover-hero-overlay .menu-title {
      margin: 0 0 4px;
      font-size: 1.8rem;
      font-weight: 800;
      text-shadow: 0 2px 12px rgba(0,0,0,0.4);
    }

    .cover-hero-overlay .menu-tagline {
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.92;
      text-shadow: 0 1px 6px rgba(0,0,0,0.35);
    }

    @media (max-width: 480px) {
      .cover-hero-img {
        min-height: 150px;
        max-height: 240px;
      }
      .cover-hero-overlay {
        padding: 16px 14px;
      }
      .cover-hero-overlay .menu-title {
        font-size: 1.4rem;
      }
      .cover-hero-overlay .menu-logo {
        max-height: 44px;
      }
    }

    .menu-logo {
      max-height: 70px;
      max-width: 160px;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 12px;
      display: block;
      margin-inline: auto;
    }

    .menu-title {
      margin: 0 0 6px;
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.03em;
    }

    .menu-tagline {
      margin: 0;
      font-size: 1rem;
      opacity: 0.88;
    }

    /* ── Info bar ── */
    .info-bar {
      display: flex;
      gap: 16px;
      padding: 12px 20px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      font-size: 0.82rem;
      color: var(--text-sec);
      flex-wrap: wrap;
      justify-content: center;
    }

    .info-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .info-link {
      color: var(--brand);
      text-decoration: none;
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }

    /* ── Category nav pills ── */
    .cat-nav {
      display: flex;
      gap: 8px;
      padding: 14px 20px;
      overflow-x: auto;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .cat-pill {
      flex-shrink: 0;
      padding: 8px 16px;
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text-sec);
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.18s;
      &:hover {
        background: var(--brand);
        color: white;
      }
    }

    /* ── Menu body ── */
    .menu-body {
      padding: 0 0 40px;
    }

    .menu-section {
      padding: 28px 20px 0;
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 800;
      margin: 0 0 18px;
      color: var(--brand);
      border-bottom: 2px solid var(--brand);
      padding-bottom: 8px;
    }

    /* ── Items container — layout modes ── */
    .items-container {
      display: flex;
      flex-direction: column;
      gap: 12px;

      &.with-images {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
    }

    /* Grid layout override */
    .layout-grid .items-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    /* Compact layout */
    .layout-compact .items-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .layout-compact .menu-item-card {
      border-radius: 0;
      box-shadow: none;
      border-bottom: 1px solid var(--border);
      .item-photo { display: none; }
    }

    .menu-item-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      overflow: hidden;
      transition: box-shadow 0.18s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    }

    .item-photo {
      width: 100%;
      height: 180px;
      object-fit: cover;
    }

    .item-body {
      padding: 14px 16px;
    }

    .item-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }

    .item-name {
      font-size: calc(var(--font-base) * 1.05);
      font-weight: 800;
      color: var(--text);
    }

    .item-price {
      font-size: var(--font-base);
      font-weight: 800;
      color: var(--brand);
      white-space: nowrap;
    }

    .item-desc {
      margin: 4px 0 0;
      font-size: calc(var(--font-base) * 0.85);
      color: var(--text-sec);
      line-height: 1.4;
    }

    .item-tags {
      margin-top: 8px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .item-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--tag-bg);
      color: var(--tag-text);
      text-transform: lowercase;
    }

    .empty-menu {
      text-align: center;
      padding: 60px 24px;
      font-size: 1.1rem;
      color: var(--text-sec);
    }

    .menu-footer {
      text-align: center;
      padding: 20px 24px;
      font-size: 0.8rem;
      color: var(--text-sec);
      border-top: 1px solid var(--border);
    }

    .powered-by {
      text-align: center;
      padding: 12px 16px 20px;
      font-size: 0.72rem;
      color: var(--text-sec);
      opacity: 0.6;
      strong { color: var(--brand); }
    }
    
    .loading-state, .error-state {
      text-align: center;
      padding: 60px 24px;
      font-size: 1.1rem;
      color: var(--text-sec);
    }
  `],
})
export class MenuPublicComponent implements OnInit {
  menu = inject(MenuService);
  route = inject(ActivatedRoute);
  http = inject(HttpClient);

  // Local state for fetched data
  fetchedCfg = signal<MenuConfig | null>(null);
  fetchedItems = signal<MenuItem[] | null>(null);
  fetchedCats = signal<MenuCategory[] | null>(null);

  loading = signal(true);
  error = signal(false);

  // Computed signals that fallback to local MenuService for preview
  cfg = computed(() => this.fetchedCfg() || this.menu.config());
  availableItems = computed(() => this.fetchedItems() || this.menu.availableItems());
  sortedCategories = computed(() => this.fetchedCats() || this.menu.sortedCategories());

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.fetchMenu(slug);
    } else {
      // Preview mode (no slug in URL)
      this.loading.set(false);
    }
  }

  fetchMenu(slug: string) {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/menu/${slug}`).subscribe({
      next: (data) => {
        this.fetchedCfg.set(data.config || DEFAULT_MENU_CONFIG);
        // We only care about available items for the public view
        const items: MenuItem[] = data.items || [];
        this.fetchedItems.set(items.filter(i => i.available !== false));
        
        const cats: MenuCategory[] = data.categories || [];
        this.fetchedCats.set(cats.sort((a, b) => (a.order || 0) - (b.order || 0)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  fontFamily = computed(() => {
    const ff = this.cfg().fontFamily || 'Inter';
    return `'${ff}', system-ui, sans-serif`;
  });

  radiusVal = computed(() => {
    const r = this.cfg().borderRadius || 'rounded';
    if (r === 'sharp') return '4px';
    if (r === 'pill') return '999px';
    return '14px';
  });

  fontBase = computed(() => {
    const fs = this.cfg().fontSize || 'normal';
    if (fs === 'large') return '1.1rem';
    if (fs === 'xlarge') return '1.25rem';
    return '1rem';
  });

  isDark = computed(() => {
    const t = this.cfg().theme || 'light';
    if (t === 'dark') return true;
    if (t === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
  });

  coverBg = computed(() => {
    const url = this.cfg().coverImageDataUrl;
    return url ? `url(${url})` : 'none';
  });

  hasInfoBar(): boolean {
    const c = this.cfg();
    return !!(c.schedule || c.wifiName || c.socialInstagram || c.socialWhatsapp);
  }

  hasCatItems(catId: string): boolean {
    return this.availableItems().some(i => i.category === catId);
  }

  itemsForCat(catId: string) {
    return this.availableItems().filter(i => i.category === catId);
  }

  fmt(price: number): string {
    const cur = this.cfg().currency;
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(price);
    } catch {
      return `${cur} ${price.toLocaleString()}`;
    }
  }
}
