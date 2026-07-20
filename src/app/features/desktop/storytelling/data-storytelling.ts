import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StorytellingService } from '../../../core/services/storytelling.service';
import { Storyboard, DataSource, DataVisual, ChartType } from '../../../core/models/storytelling.model';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-storytelling',
  standalone: true,
  imports: [FormsModule, DatePipe, UmIconComponent],
  template: `
    <div class="storytelling-container">
      <!-- Sidebar de Proyectos -->
      <aside class="story-sidebar">
        <div class="sidebar-header">
          <h2>📊 Storytelling</h2>
          <button class="btn-new" (click)="createNewStoryboard()">+ Nueva Historia</button>
        </div>
        
        <div class="story-list">
          @for (s of svc.storyboards(); track s.id) {
            <div class="story-item" [class.active]="selectedId() === s.id" (click)="selectStoryboard(s)">
              <div class="story-info">
                <span class="story-title">{{ s.title }}</span>
                <span class="story-meta">{{ s.visuals.length }} visuales · {{ s.updatedAt | date:'shortDate' }}</span>
              </div>
              <button class="btn-del" (click)="deleteStoryboard(s.id, $event)">×</button>
            </div>
          } @empty {
            <p class="empty-msg">No hay historias aún</p>
          }
        </div>

        <div class="sidebar-footer">
          <button class="btn-sources" (click)="showSources.set(true)">
            📂 Fuentes de Datos ({{ svc.dataSources().length }})
          </button>
        </div>
      </aside>

      <!-- Main Canvas -->
      <main class="story-canvas">
        @if (selectedStoryboard(); as story) {
          <div class="canvas-header">
            <div class="title-group">
              <input type="text" [(ngModel)]="story.title" (blur)="saveCurrent()" class="input-title" />
              <p class="subtitle">{{ story.description || 'Sin descripción' }}</p>
            </div>
            <div class="canvas-actions">
              <button class="btn-share" (click)="shareStory(story)">
                {{ story.isPublic ? '🔗 Compartido' : '📤 Compartir' }}
              </button>
              <button class="btn-add-visual" (click)="showAddVisual.set(true)">
                ➕ Añadir Gráfica
              </button>
              <button class="btn-save" (click)="saveCurrent()">💾 Guardar</button>
            </div>
          </div>

          <div class="visuals-grid">
            @for (v of story.visuals; track v.id) {
              <div class="visual-card" [style.grid-column]="'span ' + v.layout.w" [style.grid-row]="'span ' + v.layout.h">
                <div class="visual-header">
                  <h4>{{ v.title }}</h4>
                  <div class="visual-opts">
                    <button (click)="editVisual(v)">⚙️</button>
                    <button (click)="removeVisual(v.id)"><um-icon name="trash" [size]="16"></um-icon></button>
                  </div>
                </div>
                <div class="visual-content">
                  <!-- Mock Chart Render -->
                  <div class="chart-mock" [class]="v.type">
                    @if (v.type === 'kpi') {
                      <div class="kpi-value">{{ getKPIValue(v) }}</div>
                    } @else {
                      <div class="chart-bars">
                        <div class="bar" style="height: 60%"></div>
                        <div class="bar" style="height: 80%"></div>
                        <div class="bar" style="height: 40%"></div>
                        <div class="bar" style="height: 90%"></div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="canvas-empty">
                <div class="empty-icon">📈</div>
                <h3>Lienzo en blanco</h3>
                <p>Empieza añadiendo tu primera visualización de datos.</p>
                <button class="btn-add-visual" (click)="showAddVisual.set(true)">Añadir mi primera gráfica</button>
              </div>
            }
          </div>
        } @else {
          <div class="welcome-screen">
            <div class="welcome-card">
              <h1>Bienvenido a Data Storytelling</h1>
              <p>Importa tus tablas y crea presentaciones de datos impactantes en minutos.</p>
              <div class="welcome-actions">
                <button class="btn-primary" (click)="createNewStoryboard()">Crear mi primera historia</button>
                <button class="btn-secondary" (click)="showSources.set(true)">Gestionar fuentes de datos</button>
              </div>
            </div>
          </div>
        }
      </main>

      <!-- Modal: Fuentes de Datos -->
      @if (showSources()) {
        <div class="modal-overlay" (click)="showSources.set(false)">
          <div class="modal-content large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>📂 Fuentes de Datos</h3>
              <button (click)="showSources.set(false)">×</button>
            </div>
            <div class="sources-list">
              @for (src of svc.dataSources(); track src.id) {
                <div class="source-card">
                  <div class="source-info">
                    <strong>{{ src.name }}</strong>
                    <span>{{ src.data.length }} filas · {{ src.columns.join(', ') }}</span>
                  </div>
                  <button class="btn-del-src" (click)="svc.deleteDataSource(src.id)"><um-icon name="trash" [size]="16"></um-icon></button>
                </div>
              }
            </div>
            <div class="import-section">
              <h4>Importar nueva tabla (JSON)</h4>
              <textarea [(ngModel)]="importDataJson" placeholder='[{"mes": "Ene", "ventas": 1200}, ...]' rows="5"></textarea>
              <input type="text" [(ngModel)]="importDataName" placeholder="Nombre de la fuente (ej: Ventas 2026)" class="form-input" />
              <button class="btn-import" (click)="importTable()" [disabled]="!importDataJson || !importDataName">Importar Tabla</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Añadir Visual -->
      @if (showAddVisual()) {
        <div class="modal-overlay" (click)="showAddVisual.set(false)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>➕ Configurar Nueva Gráfica</h3>
              <button (click)="showAddVisual.set(false)">×</button>
            </div>
            <div class="visual-form">
              <label>Título de la gráfica</label>
              <input type="text" [(ngModel)]="newVisual.title" placeholder="Ej: Ventas por Sector" class="form-input" />
              
              <label>Tipo</label>
              <select [(ngModel)]="newVisual.type" class="form-input">
                <option value="bar">📊 Barras</option>
                <option value="line">📈 Líneas</option>
                <option value="pie">🍕 Pastel</option>
                <option value="kpi">🔢 Valor KPI</option>
              </select>

              <label>Fuente de Datos</label>
              <select [(ngModel)]="newVisual.dataSourceId" class="form-input">
                <option value="">Selecciona fuente...</option>
                @for (src of svc.dataSources(); track src.id) {
                  <option [value]="src.id">{{ src.name }}</option>
                }
              </select>

              @if (selectedSourceForVisual(); as src) {
                <label>Eje X (Categorías)</label>
                <select [(ngModel)]="newVisual.config.xAxis" class="form-input">
                  @for (col of src.columns; track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>

                <label>Eje Y (Valores)</label>
                <select [(ngModel)]="newVisual.config.yAxis" class="form-input">
                  @for (col of src.columns; track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
              }

              <div class="modal-footer">
                <button class="btn-primary" (click)="addVisualToStory()">Añadir al lienzo</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './data-storytelling.scss'
})
export class DataStorytellingComponent {
  svc = inject(StorytellingService);

  selectedId = signal<string | null>(null);
  selectedStoryboard = computed(() => this.svc.storyboards().find(s => s.id === this.selectedId()) || null);
  
  showSources = signal(false);
  showAddVisual = signal(false);

  // Import
  importDataJson = '';
  importDataName = '';

  // New Visual State
  newVisual: any = {
    title: '',
    type: 'bar',
    dataSourceId: '',
    config: { xAxis: '', yAxis: '' },
    layout: { x: 0, y: 0, w: 2, h: 2 }
  };

  selectedSourceForVisual = computed(() => 
    this.svc.dataSources().find(s => s.id === this.newVisual.dataSourceId) || null
  );

  createNewStoryboard(): void {
    const id = crypto.randomUUID();
    const newStory: Storyboard = {
      id,
      title: 'Nueva Historia de Datos',
      description: 'Panel personalizado para análisis estratégico.',
      visuals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false
    };
    this.svc.saveStoryboard(newStory);
    this.selectedId.set(id);
  }

  selectStoryboard(s: Storyboard): void {
    this.selectedId.set(s.id);
  }

  deleteStoryboard(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Borrar esta historia?')) {
      this.svc.deleteStoryboard(id);
      if (this.selectedId() === id) this.selectedId.set(null);
    }
  }

  saveCurrent(): void {
    const current = this.selectedStoryboard();
    if (current) this.svc.saveStoryboard(current);
  }

  importTable(): void {
    try {
      const data = JSON.parse(this.importDataJson);
      if (!Array.isArray(data)) throw new Error('Debe ser un array');
      
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      const source: DataSource = {
        id: crypto.randomUUID(),
        name: this.importDataName,
        type: 'json',
        data,
        columns,
        updatedAt: new Date().toISOString()
      };
      
      this.svc.addDataSource(source);
      this.importDataJson = '';
      this.importDataName = '';
    } catch (e) {
      alert('Error al importar: JSON inválido o no es un array de objetos.');
    }
  }

  addVisualToStory(): void {
    const story = this.selectedStoryboard();
    if (!story) return;

    const visual: DataVisual = {
      ...this.newVisual,
      id: crypto.randomUUID()
    };

    story.visuals.push(visual);
    this.saveCurrent();
    this.showAddVisual.set(false);
    
    // Reset form
    this.newVisual = {
      title: '', type: 'bar', dataSourceId: '',
      config: { xAxis: '', yAxis: '' },
      layout: { x: 0, y: 0, w: 2, h: 2 }
    };
  }

  removeVisual(id: string): void {
    const story = this.selectedStoryboard();
    if (story) {
      story.visuals = story.visuals.filter(v => v.id !== id);
      this.saveCurrent();
    }
  }

  editVisual(v: DataVisual): void {
    // Basic edit: toggle type for demo
    const types: ChartType[] = ['bar', 'line', 'pie', 'kpi'];
    const idx = types.indexOf(v.type);
    v.type = types[(idx + 1) % types.length];
    this.saveCurrent();
  }

  getKPIValue(v: DataVisual): string {
    const src = this.svc.dataSources().find(s => s.id === v.dataSourceId);
    if (!src || !v.config.yAxis) return '0';
    
    const sum = src.data.reduce((acc, current) => acc + (Number(current[v.config.yAxis]) || 0), 0);
    return sum.toLocaleString();
  }

  shareStory(story: Storyboard): void {
    story.isPublic = !story.isPublic;
    if (story.isPublic && !story.shareId) {
      story.shareId = this.svc.generateShareId();
    }
    this.saveCurrent();
    if (story.isPublic) {
      alert(`¡Historia compartida! Link: actuaya.com/share/${story.shareId}`);
    }
  }
}
