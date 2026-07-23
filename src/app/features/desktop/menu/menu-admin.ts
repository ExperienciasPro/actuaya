import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../core/services/menu.service';
import { DataSyncService } from '../../../core/services/data-sync.service';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

import {
  MenuItem, MenuCategory,
  FONT_FAMILIES, THEME_OPTIONS, LAYOUT_OPTIONS, RADIUS_OPTIONS, HEADER_STYLES, FONT_SIZE_OPTIONS,
} from '../../../core/models/menu.model';

type AdminView = 'items' | 'categories' | 'config';

@Component({
  selector: 'um-menu-admin',
  standalone: true,
  imports: [FormsModule, UmIconComponent, NgClass],
  template: `
    <div class="menu-admin-page">
      <div class="page-header animate-fadeInUp">
        <div>
          <h1>🍽️ Menú Digital</h1>
          <p class="subtitle">Gestiona la carta de tu negocio. Los cambios se reflejan de inmediato.</p>
        </div>
        <div class="header-actions">
          <a class="btn-preview" [href]="publicUrl" target="_blank">👁️ Ver menú público</a>
        </div>
      </div>

      <!-- Tabs -->
      <div class="menu-tabs animate-fadeInUp stagger-1">
        <button class="tab-btn" [class.active]="currentView() === 'categories'" (click)="currentView.set('categories')">📂 Categorías</button>
        <button class="tab-btn" [class.active]="currentView() === 'items'" (click)="currentView.set('items')">🍴 Platillos</button>
        <button class="tab-btn" [class.active]="currentView() === 'config'" (click)="currentView.set('config')">⚙️ Apariencia</button>
      </div>

      <!-- ── ITEMS VIEW ──────────────────────────── -->
      @if (currentView() === 'items') {
        <div class="card animate-fadeInUp stagger-2">
          <h3>{{ editingItem() ? '✏️ Editar platillo' : '➕ Nuevo platillo' }}</h3>
          <form class="item-form" (ngSubmit)="saveItem()">
            <div class="form-row-2">
              <div class="form-field">
                <label>Nombre *</label>
                <input type="text" [(ngModel)]="f.name" name="name" placeholder="Ej. Bandeja Paisa" />
              </div>
              <div class="form-field">
                <label>Categoría *</label>
                <select [(ngModel)]="f.category" name="category">
                  <option value="">Seleccionar...</option>
                  @for (c of menu.sortedCategories(); track c.id) {
                    <option [value]="c.id">{{ c.emoji }} {{ c.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-field">
              <label>Descripción</label>
              <input type="text" [(ngModel)]="f.description" name="desc" placeholder="Ingredientes y descripción breve" />
            </div>
            <div class="form-row-3">
              <div class="form-field">
                <label>Precio *</label>
                <input type="number" [(ngModel)]="f.price" name="price" placeholder="0" min="0" />
              </div>
              <div class="form-field">
                <label>Etiquetas (coma)</label>
                <input type="text" [(ngModel)]="f.tags" name="tags" placeholder="vegano, sin gluten" />
              </div>
              <div class="form-field toggle-field">
                <label>Disponible</label>
                <label class="toggle">
                  <input type="checkbox" [(ngModel)]="f.available" name="available" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <!-- Photo upload -->
            <div class="form-field">
              <label>Foto (opcional)</label>
              <div class="photo-row">
                @if (f.imageDataUrl) {
                  <img class="photo-thumb" [src]="f.imageDataUrl" alt="foto" />
                  <button type="button" class="btn-remove-photo" (click)="f.imageDataUrl = ''">✕ Quitar</button>
                } @else {
                  <label class="btn-upload-photo" for="photo-input">📷 Subir foto</label>
                  <input id="photo-input" type="file" accept="image/*" class="hidden-file" (change)="onPhoto($event)" />
                }
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-save" [disabled]="!canSaveItem()">{{ editingItem() ? 'Actualizar' : '+ Agregar' }}</button>
              @if (editingItem()) {
                <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancelar</button>
              }
            </div>
          </form>
        </div>

        <!-- Items list -->
        @for (cat of menu.sortedCategories(); track cat.id) {
          @if (itemsInCat(cat.id).length) {
            <div class="card animate-fadeInUp stagger-3">
              <h4 class="cat-heading">{{ cat.emoji }} {{ cat.name }}</h4>
              @for (item of itemsInCat(cat.id); track item.id) {
                <div class="item-row" [class.unavailable]="!item.available">
                  @if (item.imageDataUrl) {
                    <img class="item-img" [src]="item.imageDataUrl" [alt]="item.name" />
                  }
                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-desc">{{ item.description }}</span>
                    @if (item.tags?.length) {
                      <div class="item-tags">
                        @for (t of item.tags; track t) { <span class="tag">{{ t }}</span> }
                      </div>
                    }
                  </div>
                  <span class="item-price">{{ fmt(item.price) }}</span>
                  <div class="item-actions">
                    <button class="btn-avail" (click)="toggleAvailable(item.id)" [title]="item.available ? 'Deshabilitar' : 'Habilitar'">
                      {{ item.available ? '✅' : '❌' }}
                    </button>
                    <button class="btn-edit-item" (click)="startEdit(item)">✏️</button>
                    <button class="btn-delete-item" (click)="deleteItem(item.id)"><um-icon name="trash" [size]="16"></um-icon></button>
                  </div>
                </div>
              }
            </div>
          }
        }

        @if (!menu.items().length) {
          <div class="empty-state">
            <span class="empty-icon">🍽️</span>
            <p>Sin platillos aún. Agrega el primero arriba.</p>
          </div>
        }
      }

      <!-- ── CATEGORIES VIEW ─────────────────────── -->
      @if (currentView() === 'categories') {
        <div class="card animate-fadeInUp stagger-2">
          <h3>➕ Nueva categoría</h3>
          <form class="cat-form" (ngSubmit)="addCategory()">
            <div class="form-row-3">
              <div class="form-field">
                <label>Emoji</label>
                <input type="text" [(ngModel)]="cForm.emoji" name="emoji" placeholder="🍕" maxlength="4" />
              </div>
              <div class="form-field">
                <label>Nombre *</label>
                <input type="text" [(ngModel)]="cForm.name" name="catName" placeholder="Ej. Pizzas" />
              </div>
              <div class="form-field">
                <label>Orden</label>
                <input type="number" [(ngModel)]="cForm.order" name="order" min="1" />
              </div>
            </div>
            <button type="submit" class="btn-save" [disabled]="!cForm.name.trim()">+ Agregar</button>
          </form>
        </div>

        <div class="card animate-fadeInUp stagger-3">
          <h3>📂 Categorías</h3>
          @for (cat of menu.sortedCategories(); track cat.id) {
            <div class="cat-row">
              <span class="cat-badge">{{ cat.emoji }} {{ cat.name }}</span>
              <span class="cat-count">{{ countInCat(cat.id) }} platillos</span>
              <button class="btn-delete-item" (click)="deleteCategory(cat.id)"><um-icon name="trash" [size]="16"></um-icon></button>
            </div>
          }
        </div>
      }

      <!-- ── CONFIG VIEW ────────────────────────── -->
      @if (currentView() === 'config') {

        <!-- Share link (Moved to top) -->
        <div class="card animate-fadeInUp stagger-1" style="background: #f8fafc; border-color: #cbd5e1;">
          <div class="config-preview-link" style="margin-top: 0; padding-top: 0; border-top: none;">
            <p class="hint" style="margin-top: 0;">Puedes compartir este enlace con tus clientes:</p>
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
              <a [href]="publicUrl" target="_blank" class="pub-link" style="font-size: 1rem;">{{ publicUrl }}</a>
              
              <button class="btn-save-publish" 
                      [ngClass]="{
                        'state-saving': isSaving(),
                        'state-unsaved': hasUnsavedChanges() && !isSaving(),
                        'state-saved': !hasUnsavedChanges() && !isSaving()
                      }"
                      (click)="saveAndPublish()" 
                      [disabled]="!hasUnsavedChanges() || isSaving()">
                @if (isSaving()) {
                  ⏳ Guardando...
                } @else if (hasUnsavedChanges()) {
                  💾 Guardar cambios
                } @else {
                  <um-icon name="check-circle" [size]="16" color="#64748b"></um-icon> Cambios guardados
                }
              </button>

              <button class="btn-copy-link" (click)="copyLink()" [disabled]="hasUnsavedChanges() || isSaving()">
                {{ copiedLink() ? '✅ Copiado' : '📋 Copiar enlace' }}
              </button>
            </div>
            @if (hasUnsavedChanges()) {
              <p style="color: #ea580c; font-size: 0.85rem; margin-top: 12px; margin-bottom: 0;">⚠️ Tienes cambios sin publicar. Haz clic en "Guardar cambios" para que tus clientes puedan verlos y para habilitar el enlace.</p>
            }
          </div>
        </div>

        <!-- Section: Identidad -->
        <div class="card animate-fadeInUp stagger-2">
          <h3>🏪 Identidad del negocio</h3>
          <div class="form-row-2">
            <div class="form-field">
              <label>Nombre del negocio</label>
              <input type="text" [(ngModel)]="cfg.businessName" name="bizName" (ngModelChange)="onBusinessNameChange()" />
            </div>
            <div class="form-field">
              <label>Enlace personalizado</label>
              <input type="text" [(ngModel)]="cfg.slug" name="slug" (ngModelChange)="onSlugChange()" placeholder="ej-mi-negocio" />
            </div>
          </div>
          <div class="form-field">
            <label>Eslogan</label>
            <input type="text" [(ngModel)]="cfg.tagline" name="tagline" (ngModelChange)="saveConfig()" />
          </div>
          <div class="form-row-2">
            <div class="form-field">
              <label>Logo (opcional)</label>
              <div class="photo-row">
                @if (cfg.logoDataUrl) {
                  <img class="photo-thumb" [src]="cfg.logoDataUrl" alt="logo" />
                  <button type="button" class="btn-remove-photo" (click)="cfg.logoDataUrl = ''; saveConfig()">✕ Quitar</button>
                } @else {
                  <label class="btn-upload-photo" for="logo-input">📷 Subir logo</label>
                  <input id="logo-input" type="file" accept="image/*" class="hidden-file" (change)="onLogo($event)" />
                }
              </div>
            </div>
            <div class="form-field">
              <label>Imagen de portada (header)</label>
              <div class="cover-preview-wrap">
                @if (cfg.coverImageDataUrl) {
                  <div class="cover-preview">
                    <img class="cover-preview-img" [src]="cfg.coverImageDataUrl" alt="Portada del menú" />
                    <div class="cover-preview-overlay">
                      <label class="btn-cover-change" for="cover-input">📷 Cambiar portada</label>
                      <button type="button" class="btn-cover-remove" (click)="cfg.coverImageDataUrl = ''; saveConfig()"><um-icon name="trash" [size]="16"></um-icon> Quitar</button>
                    </div>
                  </div>
                  <input id="cover-input" type="file" accept="image/*" class="hidden-file" (change)="onCover($event)" />
                  <p class="cover-hint">📐 Recomendado: 1200×400px o más ancha. Se ajusta automáticamente.</p>
                } @else {
                  <label class="cover-dropzone" for="cover-input">
                    <span class="dropzone-icon">🖼️</span>
                    <span class="dropzone-title">Subir imagen de portada</span>
                    <span class="dropzone-hint">JPG, PNG o WebP · Recomendado: 1200×400px</span>
                  </label>
                  <input id="cover-input" type="file" accept="image/*" class="hidden-file" (change)="onCover($event)" />
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Colores y Estilo -->
        <div class="card animate-fadeInUp stagger-2">
          <h3>🎨 Colores y estilo visual</h3>
          <div class="form-row-3">
            <div class="form-field">
              <label>Color principal</label>
              <div class="color-field">
                <input type="color" [(ngModel)]="cfg.primaryColor" name="color" (ngModelChange)="saveConfig()" class="color-picker" />
                <span class="color-hex">{{ cfg.primaryColor }}</span>
              </div>
            </div>
            <div class="form-field">
              <label>Color secundario</label>
              <div class="color-field">
                <input type="color" [(ngModel)]="cfg.secondaryColor" name="colorSec" (ngModelChange)="saveConfig()" class="color-picker" />
                <span class="color-hex">{{ cfg.secondaryColor }}</span>
              </div>
            </div>
            <div class="form-field">
              <label>Estilo del header</label>
              <div class="option-pills">
                @for (hs of headerStyles; track hs.value) {
                  <button type="button" class="option-pill" [class.active]="cfg.headerStyle === hs.value"
                    (click)="cfg.headerStyle = hs.value; saveConfig()">
                    {{ hs.icon }} {{ hs.label }}
                  </button>
                }
              </div>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-field">
              <label>Tema</label>
              <div class="option-pills">
                @for (t of themes; track t.value) {
                  <button type="button" class="option-pill" [class.active]="cfg.theme === t.value"
                    (click)="cfg.theme = t.value; saveConfig()">
                    {{ t.icon }} {{ t.label }}
                  </button>
                }
              </div>
            </div>
            <div class="form-field">
              <label>Bordes</label>
              <div class="option-pills">
                @for (r of radiusOptions; track r.value) {
                  <button type="button" class="option-pill" [class.active]="cfg.borderRadius === r.value"
                    (click)="cfg.borderRadius = r.value; saveConfig()">
                    {{ r.label }}
                  </button>
                }
              </div>
            </div>
            <div class="form-field">
              <label>Tamaño de texto</label>
              <div class="option-pills">
                @for (fs of fontSizes; track fs.value) {
                  <button type="button" class="option-pill" [class.active]="cfg.fontSize === fs.value"
                    (click)="cfg.fontSize = fs.value; saveConfig()">
                    {{ fs.label }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Tipografía y Layout -->
        <div class="card animate-fadeInUp stagger-3">
          <h3>🔤 Tipografía y disposición</h3>
          <div class="form-row-2">
            <div class="form-field">
              <label>Tipografía</label>
              <select [(ngModel)]="cfg.fontFamily" name="font" (ngModelChange)="saveConfig()">
                @for (ff of fonts; track ff.value) {
                  <option [value]="ff.value">{{ ff.label }}</option>
                }
              </select>
            </div>
            <div class="form-field">
              <label>Disposición de platillos</label>
              <div class="option-pills">
                @for (lo of layouts; track lo.value) {
                  <button type="button" class="option-pill" [class.active]="cfg.layout === lo.value"
                    (click)="cfg.layout = lo.value; saveConfig()">
                    {{ lo.icon }} {{ lo.label }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Contenido y Elementos -->
        <div class="card animate-fadeInUp stagger-3">
          <h3>📋 Contenido visible</h3>
          <div class="form-row-3">
            <div class="form-field">
              <label>Moneda</label>
              <select [(ngModel)]="cfg.currency" name="currency" (ngModelChange)="saveConfig()">
                <option>COP</option><option>USD</option><option>MXN</option><option>EUR</option>
                <option>ARS</option><option>BRL</option><option>CLP</option><option>PEN</option>
              </select>
            </div>
            <div class="form-field toggle-field">
              <label>Mostrar fotos</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="cfg.showImages" name="showImages" (ngModelChange)="saveConfig()" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="form-field toggle-field">
              <label>Mostrar precios</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="cfg.showPrices" name="showPrices" (ngModelChange)="saveConfig()" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-field toggle-field">
              <label>Mostrar "Powered by"</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="cfg.showPoweredBy" name="powered" (ngModelChange)="saveConfig()" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="form-field">
            <label>Nota de pie de página</label>
            <input type="text" [(ngModel)]="cfg.footerNote" name="footer" (ngModelChange)="saveConfig()" />
          </div>
        </div>

        <!-- Section: Info del Negocio -->
        <div class="card animate-fadeInUp stagger-3">
          <h3>📍 Información adicional</h3>
          <div class="form-row-2">
            <div class="form-field">
              <label>🌐 WiFi — nombre de la red</label>
              <input type="text" [(ngModel)]="cfg.wifiName" name="wifi" placeholder="MiRestaurante_WiFi" (ngModelChange)="saveConfig()" />
            </div>
            <div class="form-field">
              <label>🔑 WiFi — contraseña</label>
              <input type="text" [(ngModel)]="cfg.wifiPassword" name="wifiPw" placeholder="clave1234" (ngModelChange)="saveConfig()" />
            </div>
          </div>
          <div class="form-field">
            <label>🕐 Horario de atención</label>
            <input type="text" [(ngModel)]="cfg.schedule" name="schedule" placeholder="Lun–Sáb 11am–10pm, Dom 12pm–8pm" (ngModelChange)="saveConfig()" />
          </div>
          <div class="form-row-2">
            <div class="form-field">
              <label>📸 Instagram</label>
              <input type="text" [(ngModel)]="cfg.socialInstagram" name="ig" placeholder="@mirestaurante" (ngModelChange)="saveConfig()" />
            </div>
            <div class="form-field">
              <label>📱 WhatsApp</label>
              <input type="text" [(ngModel)]="cfg.socialWhatsapp" name="wa" placeholder="+573001234567" (ngModelChange)="saveConfig()" />
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'menu-admin.scss',
})
export class MenuAdminComponent {
  menu = inject(MenuService);
  dataSync = inject(DataSyncService);

  currentView = signal<AdminView>('categories');
  editingItem = signal<MenuItem | null>(null);
  copiedLink = signal(false);
  hasUnsavedChanges = signal(false);
  isSaving = signal(false);

  // Constants for template
  fonts = FONT_FAMILIES;
  themes = THEME_OPTIONS;
  layouts = LAYOUT_OPTIONS;
  radiusOptions = RADIUS_OPTIONS;
  headerStyles = HEADER_STYLES;
  fontSizes = FONT_SIZE_OPTIONS;

  // Item form
  f = this.blankItem();
  // Category form
  cForm = { name: '', emoji: '🍽️', order: this.menu.categories().length + 1 };
  // Config form (clone to allow live editing)
  cfg = { ...this.menu.config() };
  slugManuallyEdited = !!this.cfg.slug;

  get publicUrl() {
    return this.cfg.slug 
      ? `${window.location.origin}/menu/${this.cfg.slug}`
      : `${window.location.origin}/menu`;
  }

  copyLink() {
    navigator.clipboard.writeText(this.publicUrl);
    this.copiedLink.set(true);
    setTimeout(() => this.copiedLink.set(false), 2000);
  }

  onBusinessNameChange(): void {
    if (!this.slugManuallyEdited) {
      this.cfg.slug = this.formatSlug(this.cfg.businessName);
    }
    this.saveConfig();
  }

  onSlugChange(): void {
    this.slugManuallyEdited = true;
    this.cfg.slug = this.formatSlug(this.cfg.slug || '');
    this.saveConfig();
  }

  private formatSlug(val: string): string {
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
  }

  // ── Item helpers ─────────────────────────
  blankItem() {
    return { name: '', description: '', price: null as number | null, category: '', available: true, imageDataUrl: '', tags: '' };
  }

  canSaveItem(): boolean {
    return !!this.f.name.trim() && !!this.f.category && (this.f.price ?? 0) >= 0;
  }

  startEdit(item: MenuItem): void {
    this.editingItem.set(item);
    this.f = {
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: item.available,
      imageDataUrl: item.imageDataUrl ?? '',
      tags: (item.tags ?? []).join(', '),
    };
    this.currentView.set('items');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingItem.set(null);
    this.f = this.blankItem();
  }

  saveItem(): void {
    if (!this.canSaveItem()) return;
    const tags = this.f.tags ? (this.f.tags as string).split(',').map(t => t.trim()).filter(Boolean) : [];
    const data = {
      name: this.f.name.trim(),
      description: this.f.description.trim(),
      price: this.f.price ?? 0,
      category: this.f.category,
      available: this.f.available,
      imageDataUrl: this.f.imageDataUrl,
    };
    const editing = this.editingItem();
    if (editing) {
      this.menu.updateItem(editing.id, data);
      this.editingItem.set(null);
    } else {
      this.menu.addItem(data);
    }
    this.hasUnsavedChanges.set(true);
    this.f = this.blankItem();
  }

  onPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 600;
        let { width, height } = img;
        if (width > max) { height = (height * max) / width; width = max; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        this.f.imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ── Category helpers ─────────────────────
  addCategory(): void {
    if (!this.cForm.name.trim()) return;
    this.menu.addCategory({ name: this.cForm.name.trim(), emoji: this.cForm.emoji || '🍽️', order: this.cForm.order });
    this.cForm = { name: '', emoji: '🍽️', order: this.menu.categories().length + 1 };
    this.hasUnsavedChanges.set(true);
  }

  deleteCategory(id: string): void {
    if (this.menu.items().some(i => i.category === id)) {
      alert('No puedes eliminar una categoría que tiene platillos asignados.');
      return;
    }
    this.menu.deleteCategory(id);
    this.hasUnsavedChanges.set(true);
  }

  deleteItem(id: string): void {
    this.menu.deleteItem(id);
    this.hasUnsavedChanges.set(true);
  }

  toggleAvailable(id: string): void {
    this.menu.toggleAvailable(id);
    this.hasUnsavedChanges.set(true);
  }

  itemsInCat(catId: string): MenuItem[] {
    return this.menu.items().filter(i => i.category === catId);
  }

  countInCat(catId: string): number {
    return this.itemsInCat(catId).length;
  }

  fmt(price: number): string {
    const cur = this.menu.config().currency;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(price);
  }

  // ── Config helpers ───────────────────────
  saveConfig(): void {
    this.menu.saveConfig(this.cfg);
    this.hasUnsavedChanges.set(true);
  }

  async saveAndPublish(): Promise<void> {
    this.isSaving.set(true);
    this.menu.saveConfig(this.cfg);
    try {
      await this.dataSync.saveToServer();
      this.hasUnsavedChanges.set(false);
    } catch (e) {
      alert('Hubo un problema al subir los datos.');
    } finally {
      this.isSaving.set(false);
    }
  }

  onLogo(event: Event): void {
    this.handleImageUpload(event, 300, url => { this.cfg.logoDataUrl = url; this.saveConfig(); });
  }

  onCover(event: Event): void {
    this.handleImageUpload(event, 1200, url => { this.cfg.coverImageDataUrl = url; this.saveConfig(); });
  }

  private handleImageUpload(event: Event, maxWidth: number, callback: (url: string) => void): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }
}
