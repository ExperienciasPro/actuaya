import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductDataService } from '../../../../core/services/product.service';
import { ProductService, ProductCategory } from '../../../../core/models/product-service.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { RouterLink } from '@angular/router';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-products',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, ConfirmDialogComponent, RouterLink, UmIconComponent],
  template: `
    <div class="products-page">
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Productos y Servicios</h1>
          <p class="header-subtitle">Configura lo que vendes para asignarlo a tus embudos.</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="openCreate()">+ Nuevo Producto</button>
        </div>
      </div>

      @if (products().length) {
        <div class="products-grid animate-fadeInUp stagger-1">
          @for (product of products(); track product.id) {
            <div class="product-card" [class.inactive]="!product.isActive">
              <div class="card-header">
                <div class="product-icon" [style.background]="product.color">
                  {{ product.icon || '📦' }}
                </div>
                <div class="product-info">
                  <h3>{{ product.name }}</h3>
                  <span class="category-badge">{{ getCategoryLabel(product.category) }}</span>
                </div>
              </div>
              <div class="card-body">
                @if (product.description) {
                  <p class="description">{{ product.description }}</p>
                }
                <div class="price">
                  <span class="label">Precio Base:</span>
                  <span class="value">
                    {{ product.price ? (product.price | currency:product.currency:'symbol':'1.0-0') : 'Variable' }}
                  </span>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn-icon" title="Editar" (click)="openEdit(product)">✏️</button>
                <button class="btn-icon" [title]="product.isActive ? 'Desactivar' : 'Activar'" (click)="toggleActive(product)">
                  {{ product.isActive ? '⏸️' : '▶️' }}
                </button>
                <button class="btn-icon danger" title="Eliminar" (click)="confirmDelete(product)"><um-icon name="trash" [size]="16"></um-icon></button>
              </div>
            </div>
          }
        </div>
      } @else {
        <um-empty-state
          icon="📦"
          title="Sin productos configurados"
          subtitle="Crea tu primer producto o servicio para poder conectarlo a un embudo de ventas."
        >
          <button class="btn-primary" (click)="openCreate()">+ Crear producto</button>
        </um-empty-state>
      }

      <!-- Slide Panel for Form -->
      @if (panelMode() !== 'closed') {
        <div class="panel-backdrop" (click)="closePanel()"></div>
        <div class="slide-panel">
          <div class="panel-header">
            <h2>{{ panelMode() === 'create' ? 'Nuevo Producto' : 'Editar Producto' }}</h2>
            <button class="btn-close" (click)="closePanel()">✕</button>
          </div>
          
          <div class="panel-body">
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" [ngModel]="form().name" (ngModelChange)="form.update(f => ({...f, name: $event}))" placeholder="Ej: Consultoría Estratégica" />
            </div>
            
            <div class="form-group">
              <label>Descripción</label>
              <textarea [ngModel]="form().description" (ngModelChange)="form.update(f => ({...f, description: $event}))" placeholder="Descripción breve..." rows="3"></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Categoría</label>
                <select [ngModel]="form().category" (ngModelChange)="form.update(f => ({...f, category: $event}))">
                  <option value="producto">Producto Físico</option>
                  <option value="servicio">Servicio</option>
                  <option value="curso">Curso / Digital</option>
                  <option value="suscripcion">Suscripción</option>
                  <option value="consultoria">Consultoría</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div class="form-group">
                <label>Color</label>
                <input type="color" class="color-input" [ngModel]="form().color" (ngModelChange)="form.update(f => ({...f, color: $event}))" />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Precio Base (Opcional)</label>
                <input type="number" [ngModel]="form().price" (ngModelChange)="form.update(f => ({...f, price: $event}))" placeholder="Ej: 500000" />
              </div>
              <div class="form-group">
                <label>Moneda</label>
                <select [ngModel]="form().currency" (ngModelChange)="form.update(f => ({...f, currency: $event}))">
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Ícono (Emoji)</label>
              <input type="text" [ngModel]="form().icon" (ngModelChange)="form.update(f => ({...f, icon: $event}))" placeholder="Ej: 📦" maxlength="2" class="emoji-input" />
            </div>
          </div>
          
          <div class="panel-footer">
            <button class="btn-secondary" (click)="closePanel()">Cancelar</button>
            <button class="btn-primary" (click)="saveProduct()" [disabled]="!form().name.trim()">Guardar</button>
          </div>
        </div>
      }
      
      <um-confirm-dialog
        [open]="showDeleteDialog()"
        title="Eliminar producto"
        message="¿Estás seguro de eliminar este producto? Los embudos asociados quedarán sin producto."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDeleteDialog.set(false)"
      />
    </div>
  `,
  styles: [`
    .products-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
    .header-left h1 { margin: 0 0 8px 0; font-size: 28px; color: #1e293b; }
    .header-subtitle { margin: 0; color: #64748b; font-size: 15px; }
    
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .product-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
    .product-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.06); }
    .product-card.inactive { opacity: 0.6; filter: grayscale(0.5); }
    
    .card-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    .product-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; flex-shrink: 0; }
    .product-info h3 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; }
    .category-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 500; }
    
    .card-body { flex: 1; margin-bottom: 16px; }
    .description { margin: 0 0 12px 0; color: #64748b; font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price { display: flex; align-items: baseline; gap: 8px; }
    .price .label { color: #64748b; font-size: 13px; }
    .price .value { color: #0f172a; font-weight: 600; font-size: 16px; }
    
    .card-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: none; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn-icon:hover { background: #e2e8f0; }
    .btn-icon.danger:hover { background: #fee2e2; color: #ef4444; }
    
    /* Panel */
    .panel-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.3); backdrop-filter: blur(2px); z-index: 100; animation: fadeIn 0.2s; }
    .slide-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; background: white; z-index: 101; box-shadow: -4px 0 24px rgba(0,0,0,0.1); display: flex; flex-direction: column; animation: slideIn 0.3s cubic-bezier(0.16,1,0.3,1); }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid #f1f5f9; }
    .panel-header h2 { margin: 0; font-size: 20px; color: #0f172a; }
    .btn-close { background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px; }
    .panel-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .panel-footer { padding: 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; }
    
    /* Forms */
    .form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .form-row { display: flex; gap: 16px; }
    label { font-size: 13px; font-weight: 500; color: #475569; }
    input, select, textarea { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #0f172a; transition: border-color 0.2s; font-family: inherit; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .color-input { padding: 4px; height: 42px; width: 100%; cursor: pointer; }
    .emoji-input { font-size: 20px; text-align: center; }
    
    .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class ProductsComponent {
  private productService = inject(ProductDataService);

  products = this.productService.products;
  
  panelMode = signal<'closed' | 'create' | 'edit'>('closed');
  editingId = signal<string | null>(null);
  
  showDeleteDialog = signal(false);
  deletingId = signal<string | null>(null);

  form = signal({
    name: '',
    description: '',
    category: 'producto' as ProductCategory,
    price: null as number | null,
    currency: 'COP' as 'COP' | 'USD',
    icon: '📦',
    color: '#3b82f6'
  });

  getCategoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      producto: 'Producto Físico',
      servicio: 'Servicio',
      curso: 'Curso / Digital',
      suscripcion: 'Suscripción',
      consultoria: 'Consultoría',
      otro: 'Otro'
    };
    return labels[cat] || cat;
  }

  openCreate(): void {
    this.form.set({
      name: '',
      description: '',
      category: 'servicio',
      price: null,
      currency: 'COP',
      icon: '✨',
      color: '#6366f1'
    });
    this.editingId.set(null);
    this.panelMode.set('create');
  }

  openEdit(product: ProductService): void {
    this.form.set({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price || null,
      currency: product.currency,
      icon: product.icon || '📦',
      color: product.color
    });
    this.editingId.set(product.id);
    this.panelMode.set('edit');
  }

  closePanel(): void {
    this.panelMode.set('closed');
    this.editingId.set(null);
  }

  saveProduct(): void {
    const f = this.form();
    if (!f.name.trim()) return;

    const data = {
      name: f.name.trim(),
      description: f.description?.trim() || undefined,
      category: f.category,
      price: f.price ? Number(f.price) : undefined,
      currency: f.currency,
      icon: f.icon?.trim() || undefined,
      color: f.color,
      isActive: true
    };

    if (this.panelMode() === 'edit' && this.editingId()) {
      // Preserve current isActive state when editing
      const current = this.productService.getById(this.editingId()!);
      this.productService.update(this.editingId()!, { ...data, isActive: current?.isActive ?? true });
    } else {
      this.productService.create(data);
    }
    
    this.closePanel();
  }

  toggleActive(product: ProductService): void {
    this.productService.update(product.id, { isActive: !product.isActive });
  }

  confirmDelete(product: ProductService): void {
    this.deletingId.set(product.id);
    this.showDeleteDialog.set(true);
  }

  executeDelete(): void {
    const id = this.deletingId();
    if (id) {
      this.productService.delete(id);
    }
    this.showDeleteDialog.set(false);
    this.deletingId.set(null);
  }
}
