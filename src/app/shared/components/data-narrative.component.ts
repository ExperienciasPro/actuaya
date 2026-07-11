import {
    Component,
    Input,
    OnChanges,
    SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface NarrativeStats {
    count: number;
    promedio: number;
    mediana: number;
    minimo: number;
    maximo: number;
    desviacionEstandar: number;
    percentil25?: number;
    percentil75?: number;
    distribucion: {
        excelente: number;
        bueno: number;
        regular: number;
        bajo: number;
    };
    tendenciaTemporal?: {
        mes: string;
        totalEvaluados: number;
        promedioMes: number;
    }[];
}

export interface NarrativePreviousStats {
    count: number;
    promedio: number;
    mediana: number;
}

export type NarrativeType = 'test' | 'bateria' | 'encuesta' | 'simulador' | 'bitacora' | 'general';

interface NarrativeBlock {
    icon: string;
    title: string;
    body: string;        // HTML seguro generado internamente
    type: 'insight' | 'trend' | 'alert' | 'comparison' | 'distribution';
    priority: number;     // Para ordenar (mayor = más relevante)
}

// ─── Componente ──────────────────────────────────────────────────────────────

@Component({
    selector: 'app-data-narrative',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="dn-empty" *ngIf="!stats || stats.count === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      <p>Sin datos suficientes para generar narrativa</p>
    </div>

    <div class="dn-wrapper" *ngIf="stats && stats.count > 0">
      <!-- Header -->
      <div class="dn-header" *ngIf="showHeader">
        <div class="dn-header-icon">📊</div>
        <div class="dn-header-text">
          <h4 class="dn-title">{{ title || defaultTitle }}</h4>
          <p class="dn-subtitle">Análisis automático basado en {{ stats.count }} registros</p>
        </div>
      </div>

      <!-- Narrative Blocks -->
      <div class="dn-blocks">
        <div
          *ngFor="let block of narrativeBlocks"
          class="dn-block"
          [class.dn-block-insight]="block.type === 'insight'"
          [class.dn-block-trend]="block.type === 'trend'"
          [class.dn-block-alert]="block.type === 'alert'"
          [class.dn-block-comparison]="block.type === 'comparison'"
          [class.dn-block-distribution]="block.type === 'distribution'"
        >
          <span class="dn-block-icon">{{ block.icon }}</span>
          <div class="dn-block-content">
            <span class="dn-block-title">{{ block.title }}</span>
            <p class="dn-block-body" [innerHTML]="block.body"></p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="dn-footer" *ngIf="showFooter">
        <span class="dn-footer-text">
          Generado automáticamente · {{ generatedAt }}
        </span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .dn-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 36px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .dn-empty svg { width: 36px; height: 36px; color: #cbd5e1; margin-bottom: 10px; }
    .dn-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .dn-wrapper {
      width: 100%;
      background: linear-gradient(135deg, rgba(248,250,252,0.8), rgba(241,245,249,0.4));
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      padding: 20px;
    }

    .dn-header {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 18px; padding-bottom: 14px;
      border-bottom: 1px solid rgba(226,232,240,0.5);
    }
    .dn-header-icon { font-size: 28px; }
    .dn-title {
      margin: 0; font-size: 15px; font-weight: 800; color: #1e293b;
      letter-spacing: -0.3px;
    }
    .dn-subtitle { margin: 2px 0 0; font-size: 11px; color: #94a3b8; font-weight: 500; }

    .dn-blocks {
      display: flex; flex-direction: column; gap: 10px;
    }

    .dn-block {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 14px; border-radius: 12px;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(226,232,240,0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .dn-block:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .dn-block-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .dn-block-content { flex: 1; min-width: 0; }
    .dn-block-title {
      display: block; font-size: 11px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px;
    }
    .dn-block-body {
      margin: 0; font-size: 13px; color: #334155; line-height: 1.5;
      font-weight: 500;
    }

    /* Type-specific accents */
    .dn-block-alert { border-left: 3px solid #f59e0b; background: rgba(255,251,235,0.5); }
    .dn-block-trend { border-left: 3px solid #6366f1; }
    .dn-block-comparison { border-left: 3px solid #3b82f6; }
    .dn-block-distribution { border-left: 3px solid #8b5cf6; }

    .dn-footer {
      margin-top: 14px; padding-top: 10px;
      border-top: 1px solid rgba(226,232,240,0.4);
      text-align: right;
    }
    .dn-footer-text {
      font-size: 10px; color: #cbd5e1; font-weight: 500;
    }
  `]
})
export class DataNarrativeComponent implements OnChanges {

    // ── Inputs ──
    @Input() stats: NarrativeStats | null = null;
    @Input() previousStats: NarrativePreviousStats | null = null;
    @Input() type: NarrativeType = 'general';
    @Input() title: string = '';
    @Input() instrumentName: string = '';
    @Input() showHeader: boolean = true;
    @Input() showFooter: boolean = true;
    @Input() maxBlocks: number = 6;

    // ── State ──
    narrativeBlocks: NarrativeBlock[] = [];
    generatedAt = '';
    defaultTitle = 'Resumen Narrativo';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['stats'] || changes['previousStats'] || changes['type']) {
            this.generateNarrative();
            this.generatedAt = new Date().toLocaleString('es-ES', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        }
    }

    // ─── Generador de Narrativa ────────────────────────────────────────────────

    private generateNarrative(): void {
        if (!this.stats || this.stats.count === 0) {
            this.narrativeBlocks = [];
            return;
        }

        const blocks: NarrativeBlock[] = [];
        const s = this.stats;
        const name = this.instrumentName || this.getTypeName();

        // 1. Resumen general
        blocks.push(this.buildOverview(s, name));

        // 2. Distribución
        blocks.push(this.buildDistribution(s));

        // 3. Dispersión / consistencia
        blocks.push(this.buildConsistency(s));

        // 4. Tendencia temporal
        if (s.tendenciaTemporal && s.tendenciaTemporal.length >= 2) {
            blocks.push(this.buildTrend(s));
        }

        // 5. Percentiles (si disponibles)
        if (s.percentil25 != null && s.percentil75 != null) {
            blocks.push(this.buildPercentiles(s));
        }

        // 6. Comparación con período anterior
        if (this.previousStats) {
            blocks.push(this.buildComparison(s, this.previousStats));
        }

        // 7. Alertas contextuales
        const alerts = this.buildAlerts(s);
        blocks.push(...alerts);

        // Ordenar por prioridad y limitar
        blocks.sort((a, b) => b.priority - a.priority);
        this.narrativeBlocks = blocks.slice(0, this.maxBlocks);
    }

    // ── Builders ──

    private buildOverview(s: NarrativeStats, name: string): NarrativeBlock {
        const performance = s.promedio >= 80 ? 'destacado' :
            s.promedio >= 60 ? 'adecuado' :
                s.promedio >= 40 ? 'mejorable' : 'bajo';

        return {
            icon: '📋',
            title: 'Resumen General',
            body: `Se han registrado <strong>${s.count}</strong> evaluaciones en ${name}. ` +
                `El puntaje promedio es <strong>${s.promedio}</strong> con una mediana de <strong>${s.mediana}</strong>, ` +
                `lo que indica un rendimiento <strong>${performance}</strong>. ` +
                `Los puntajes oscilan entre <strong>${s.minimo}</strong> y <strong>${s.maximo}</strong>.`,
            type: 'insight',
            priority: 10
        };
    }

    private buildDistribution(s: NarrativeStats): NarrativeBlock {
        const d = s.distribucion;
        const total = d.excelente + d.bueno + d.regular + d.bajo;
        if (total === 0) {
            return { icon: '📊', title: 'Distribución', body: 'Sin datos de distribución.', type: 'distribution', priority: 1 };
        }

        const pExc = Math.round((d.excelente / total) * 100);
        const pBueno = Math.round((d.bueno / total) * 100);
        const pReg = Math.round((d.regular / total) * 100);
        const pBajo = Math.round((d.bajo / total) * 100);

        // Identificar categoría dominante
        const categories = [
            { name: 'Excelente (90+)', value: d.excelente, pct: pExc, color: '#16a34a' },
            { name: 'Bueno (70-89)', value: d.bueno, pct: pBueno, color: '#3b82f6' },
            { name: 'Regular (50-69)', value: d.regular, pct: pReg, color: '#f59e0b' },
            { name: 'Bajo (<50)', value: d.bajo, pct: pBajo, color: '#ef4444' }
        ];
        const dominant = categories.reduce((a, b) => a.value > b.value ? a : b);

        return {
            icon: '📊',
            title: 'Distribución de Resultados',
            body: `La mayoría de evaluados (<strong>${dominant.pct}%</strong>) se ubica en la categoría ` +
                `<strong>${dominant.name}</strong>. ` +
                `Un <strong>${pExc + pBueno}%</strong> alcanza niveles de Bueno o superior, ` +
                `mientras que <strong>${pBajo}%</strong> se encuentra en nivel Bajo.`,
            type: 'distribution',
            priority: 8
        };
    }

    private buildConsistency(s: NarrativeStats): NarrativeBlock {
        const cv = s.promedio > 0 ? (s.desviacionEstandar / s.promedio) * 100 : 0;
        const range = s.maximo - s.minimo;

        let consistency: string;
        let icon: string;
        if (cv < 15) {
            consistency = 'muy consistentes';
            icon = '🎯';
        } else if (cv < 30) {
            consistency = 'moderadamente consistentes';
            icon = '📐';
        } else {
            consistency = 'altamente dispersos';
            icon = '🔀';
        }

        return {
            icon,
            title: 'Consistencia',
            body: `Los resultados son <strong>${consistency}</strong> (DE: ${s.desviacionEstandar}). ` +
                `El rango entre el menor y mayor puntaje es de <strong>${range} puntos</strong>. ` +
                (cv > 30 ? 'Esto sugiere diferencias significativas entre los evaluados.' :
                    'Esto indica homogeneidad en el grupo evaluado.'),
            type: 'insight',
            priority: 6
        };
    }

    private buildTrend(s: NarrativeStats): NarrativeBlock {
        const t = s.tendenciaTemporal!;
        const first = t[0];
        const last = t[t.length - 1];
        const diff = last.promedioMes - first.promedioMes;
        const absDiff = Math.abs(diff);

        let arrow: string, direction: string, icon: string;
        if (diff > 2) {
            arrow = '<span style="color:#16a34a;font-weight:800">↑</span>';
            direction = 'al alza';
            icon = '📈';
        } else if (diff < -2) {
            arrow = '<span style="color:#dc2626;font-weight:800">↓</span>';
            direction = 'a la baja';
            icon = '📉';
        } else {
            arrow = '<span style="color:#94a3b8;font-weight:800">→</span>';
            direction = 'estable';
            icon = '➡️';
        }

        // Mes con mayor actividad
        const busiest = t.reduce((a, b) => a.totalEvaluados > b.totalEvaluados ? a : b);

        return {
            icon,
            title: 'Tendencia Temporal',
            body: `${arrow} La tendencia ha sido <strong>${direction}</strong> ` +
                `con una variación de <strong>${diff >= 0 ? '+' : ''}${absDiff.toFixed(1)} puntos</strong> ` +
                `entre ${first.mes} y ${last.mes}. ` +
                `El período con mayor actividad fue <strong>${busiest.mes}</strong> con ${busiest.totalEvaluados} evaluaciones.`,
            type: 'trend',
            priority: 9
        };
    }

    private buildPercentiles(s: NarrativeStats): NarrativeBlock {
        const iqr = (s.percentil75 || 0) - (s.percentil25 || 0);

        return {
            icon: '📏',
            title: 'Rangos Intercuartílicos',
            body: `El 50% central de los evaluados obtuvo entre <strong>${s.percentil25}</strong> y ` +
                `<strong>${s.percentil75}</strong> puntos (IQR: ${iqr.toFixed(1)}). ` +
                (iqr < 15 ? 'Esto refleja un grupo bastante homogéneo.' :
                    iqr < 30 ? 'Existe una dispersión moderada dentro del grupo.' :
                        'La dispersión es amplia, indicando perfiles muy variados.'),
            type: 'insight',
            priority: 5
        };
    }

    private buildComparison(s: NarrativeStats, prev: NarrativePreviousStats): NarrativeBlock {
        const countDiff = s.count - prev.count;
        const avgDiff = s.promedio - prev.promedio;
        const medDiff = s.mediana - prev.mediana;

        const countArrow = countDiff > 0 ? '↑' : countDiff < 0 ? '↓' : '→';
        const avgArrow = avgDiff > 0 ? '<span style="color:#16a34a">↑</span>' :
            avgDiff < 0 ? '<span style="color:#dc2626">↓</span>' : '→';

        return {
            icon: '🔄',
            title: 'Comparación con Período Anterior',
            body: `Respecto al período anterior: evaluaciones ${countArrow} ` +
                `(<strong>${countDiff >= 0 ? '+' : ''}${countDiff}</strong>), ` +
                `promedio ${avgArrow} (<strong>${avgDiff >= 0 ? '+' : ''}${avgDiff.toFixed(1)}</strong>), ` +
                `mediana ${medDiff >= 0 ? '↑' : '↓'} (<strong>${medDiff >= 0 ? '+' : ''}${medDiff.toFixed(1)}</strong>).`,
            type: 'comparison',
            priority: 7
        };
    }

    private buildAlerts(s: NarrativeStats): NarrativeBlock[] {
        const alerts: NarrativeBlock[] = [];

        // Alerta: bajo promedio
        if (s.promedio < 50) {
            alerts.push({
                icon: '⚠️',
                title: 'Alerta: Rendimiento Bajo',
                body: `El promedio general (<strong>${s.promedio}</strong>) está por debajo del umbral mínimo aceptable (50). ` +
                    `Se recomienda revisar el contenido del instrumento o las condiciones de aplicación.`,
                type: 'alert',
                priority: 10
            });
        }

        // Alerta: alta tasa de bajo rendimiento
        const total = s.distribucion.excelente + s.distribucion.bueno + s.distribucion.regular + s.distribucion.bajo;
        if (total > 0) {
            const lowRate = s.distribucion.bajo / total;
            if (lowRate > 0.4) {
                alerts.push({
                    icon: '🚨',
                    title: 'Alerta: Alta Tasa de Bajo Rendimiento',
                    body: `El <strong>${Math.round(lowRate * 100)}%</strong> de los evaluados obtuvo puntaje Bajo (<50). ` +
                        `Esto puede indicar dificultad excesiva del instrumento o falta de preparación del grupo.`,
                    type: 'alert',
                    priority: 9
                });
            }
        }

        // Alerta: muestra pequeña
        if (s.count < 10) {
            alerts.push({
                icon: 'ℹ️',
                title: 'Nota: Muestra Pequeña',
                body: `Con solo <strong>${s.count}</strong> evaluaciones, las estadísticas pueden no ser representativas. ` +
                    `Se recomienda esperar al menos 30 registros para conclusiones más confiables.`,
                type: 'alert',
                priority: 4
            });
        }

        return alerts;
    }

    // ── Helpers ──

    private getTypeName(): string {
        const names: Record<NarrativeType, string> = {
            test: 'este test',
            bateria: 'esta batería',
            encuesta: 'esta encuesta',
            simulador: 'este simulador',
            bitacora: 'esta bitácora',
            general: 'este instrumento'
        };
        return names[this.type] || names.general;
    }
}
