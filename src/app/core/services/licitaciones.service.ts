import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Licitacion, LicitacionBatch, SECTORES_LICITACION,
} from '../models/licitacion.model';
import { environment } from '../../../environments/environment';

// ═══════════════════════════════════════════
// ActuaYa — Servicio de Licitaciones
// ═══════════════════════════════════════════
// Maneja batches semanales de resultados de
// búsqueda de Gemini vía n8n webhook.
// Ahora sincroniza con backend PHP en Hostinger.
// ═══════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class LicitacionesService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_licitaciones';
  private readonly WEBHOOK_KEY = 'um_licitaciones_webhook';

  /** URL del backend Express */
  private readonly backendUrl = '/api/licitaciones';

  // — Signals —
  batches = signal<LicitacionBatch[]>(
    this.storage.get<LicitacionBatch[]>(this.STORAGE_KEY) || []
  );

  // — Computed —
  /** Batch más reciente */
  latestBatch = computed(() => {
    const all = this.batches();
    return all.length > 0 ? all[0] : null;
  });

  /** Total de licitaciones activas (no descartadas) */
  totalActivas = computed(() =>
    this.batches()
      .flatMap(b => b.resultados)
      .filter(l => l.estado !== 'descartada').length
  );

  /** Licitaciones de alta relevancia */
  altaRelevancia = computed(() =>
    this.batches()
      .flatMap(b => b.resultados)
      .filter(l => l.relevancia === 'alta' && l.estado !== 'descartada')
  );

  /** Licitaciones por sector */
  porSector = computed(() => {
    const map = new Map<string, number>();
    for (const lic of this.batches().flatMap(b => b.resultados)) {
      if (lic.estado !== 'descartada') {
        map.set(lic.sector, (map.get(lic.sector) || 0) + 1);
      }
    }
    return map;
  });

  // — Webhook URL config —
  getWebhookUrl(): string {
    return this.storage.get<string>(this.WEBHOOK_KEY) || '';
  }

  setWebhookUrl(url: string): void {
    this.storage.set(this.WEBHOOK_KEY, url);
  }

  // ═══════════════════════════════════════
  //  Sincronización con Backend
  // ═══════════════════════════════════════

  /** Carga batches desde el backend PHP (los que n8n envió automáticamente) */
  async syncFromBackend(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(this.backendUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remoteBatches: LicitacionBatch[] = await res.json();

      if (!Array.isArray(remoteBatches) || remoteBatches.length === 0) {
        return { success: true, message: 'Sin nuevos resultados del servidor.' };
      }

      // Merge: agregar batches remotos que no existan localmente
      const localIds = new Set(this.batches().map(b => b.id));
      const newBatches = remoteBatches.filter(b => !localIds.has(b.id));

      if (newBatches.length > 0) {
        const merged = [...newBatches, ...this.batches()];
        this.batches.set(merged);
        this.persist();
        return { success: true, message: `${newBatches.length} nuevos resultados sincronizados del servidor.` };
      }

      return { success: true, message: 'Todo actualizado, sin datos nuevos.' };
    } catch (e) {
      return { success: false, message: `Error al sincronizar: ${(e as Error).message}` };
    }
  }

  // — Batch CRUD —

  /** Agrega un batch completo (viene del webhook n8n) */
  addBatch(batch: LicitacionBatch): void {
    const updated = [batch, ...this.batches()];
    this.batches.set(updated);
    this.persist();
  }

  /** Importa resultados JSON (pegado manual o fetch) */
  importFromJson(json: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(json);

      // Soporta formato batch completo o array de licitaciones
      if (data.resultados && Array.isArray(data.resultados)) {
        const batch: LicitacionBatch = {
          id: data.id || crypto.randomUUID(),
          fechaBusqueda: data.fechaBusqueda || new Date().toISOString(),
          semana: data.semana || this.getCurrentWeekLabel(),
          query: data.query || 'Importación manual',
          resultados: this.normalizeLicitaciones(data.resultados),
          totalResultados: data.resultados.length,
        };
        this.addBatch(batch);
        return { success: true, message: `${batch.totalResultados} licitaciones importadas.` };
      }

      if (Array.isArray(data)) {
        const batch: LicitacionBatch = {
          id: crypto.randomUUID(),
          fechaBusqueda: new Date().toISOString(),
          semana: this.getCurrentWeekLabel(),
          query: 'Importación manual',
          resultados: this.normalizeLicitaciones(data),
          totalResultados: data.length,
        };
        this.addBatch(batch);
        return { success: true, message: `${batch.totalResultados} licitaciones importadas.` };
      }

      return { success: false, message: 'Formato JSON no válido.' };
    } catch (e) {
      return { success: false, message: 'Error al parsear JSON.' };
    }
  }

  /** Busca resultados desde el endpoint configurado */
  async fetchFromWebhook(query?: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = this.getWebhookUrl();
    if (!baseUrl) return { success: false, message: 'No hay webhook configurado.' };

    try {
      // Si hay query, la enviamos como parámetro q
      const url = query ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}` : baseUrl;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.text();
      return this.importFromJson(json);
    } catch (e) {
      return { success: false, message: `Error al conectar: ${(e as Error).message}` };
    }
  }

  /** Actualiza estado de una licitación */
  updateEstado(batchId: string, licId: string, estado: Licitacion['estado']): void {
    const updated = this.batches().map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        resultados: b.resultados.map(l =>
          l.id === licId ? { ...l, estado } : l
        ),
      };
    });
    this.batches.set(updated);
    this.persist();
  }

  /** Actualiza notas de una licitación */
  updateNotas(batchId: string, licId: string, notas: string): void {
    const updated = this.batches().map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        resultados: b.resultados.map(l =>
          l.id === licId ? { ...l, notas } : l
        ),
      };
    });
    this.batches.set(updated);
    this.persist();
  }

  /** Elimina un batch completo */
  deleteBatch(id: string): void {
    const updated = this.batches().filter(b => b.id !== id);
    this.batches.set(updated);
    this.persist();
  }

  // — Helpers —
  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this.batches());
  }

  private getCurrentWeekLabel(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `Semana ${weekNum} - ${now.getFullYear()}`;
  }

  private normalizeLicitaciones(items: any[]): Licitacion[] {
    return items.map(item => ({
      id: item.id || crypto.randomUUID(),
      titulo: item.titulo || item.title || 'Sin título',
      entidad: item.entidad || item.entity || 'Sin entidad',
      descripcion: item.descripcion || item.description || '',
      presupuesto: item.presupuesto || item.budget || 'No especificado',
      fechaCierre: item.fechaCierre || item.deadline || '',
      ubicacion: item.ubicacion || item.location || '',
      sector: item.sector || 'Otros',
      fuente: item.fuente || item.url || item.source || '',
      relevancia: item.relevancia || item.relevance || 'media',
      estado: 'nueva',
      notas: '',
    }));
  }
}
