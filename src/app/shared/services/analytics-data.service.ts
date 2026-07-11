import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { catchError, map, retry, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';

// ─── Interfaces Tipadas ──────────────────────────────────────────────────────

export interface RespuestaDetalle {
    preguntaIndex: number;
    preguntaTexto: string;
    respuestaSeleccionada: string | null;
    puntajeObtenido: number;
    puntajeMaximo: number;
}

export interface ResultadoUnificado {
    id: string;
    fuente: 'mongodb' | 'xml_legacy';
    tipoInstrumento: string;
    testId: string;
    testNombre: string;
    candidatoNombre: string;
    candidatoEmail: string | null;
    puntaje: number;
    puntajeMaximo: number;
    fecha: string;
    estado: string;
    tiempoTranscurrido: number | null;
    genero: string | null;
    anioNacimiento: string | null;
    totalPreguntas: number;
    totalRespuestas: number;
    respuestasDetalle: RespuestaDetalle[];
    datosFormulario: any;
}

export interface UnifiedMeta {
    totalMongoDB: number;
    totalXMLLegacy: number;
    totalUnificado: number;
    filtros: {
        tipo: string;
        testId: string | null;
        from: string | null;
        to: string | null;
    };
    paginacion: {
        limit: number;
        skip: number;
    };
}

export interface UnifiedResponse {
    status: string;
    meta: UnifiedMeta;
    data: ResultadoUnificado[];
}

export interface Distribucion {
    excelente: number;
    bueno: number;
    regular: number;
    bajo: number;
}

export interface TendenciaTemporal {
    mes: string;
    totalEvaluados: number;
    promedioMes: number;
    minMes?: number;
    maxMes?: number;
}

export interface TendenciaSemanal {
    semana: string;
    totalEvaluados: number;
    promedioSemana: number;
}

export interface DistribucionGranular {
    rango0_25: number;
    rango26_50: number;
    rango51_75: number;
    rango76_100: number;
}

export interface DemografiaGenero {
    genero: string;
    count: number;
    promedio: number;
}

export interface RespuestaPregunta {
    pregunta: string;
    totalRespuestas?: number;
    respuestas: { opcion: string; conteo: number }[];
}

export interface StatsData {
    count: number;
    promedio: number;
    mediana: number;
    minimo: number;
    maximo: number;
    desviacionEstandar: number;
    percentil25: number;
    percentil75: number;
    tiempoPromedio: number | null;
    tiempoMinimo: number | null;
    tiempoMaximo: number | null;
    distribucion: Distribucion;
    distribucionGranular: DistribucionGranular;
    demografiaGenero: DemografiaGenero[];
    tendenciaTemporal: TendenciaTemporal[];
    tendenciaSemanal: TendenciaSemanal[];
    respuestasPorPregunta: RespuestaPregunta[];
}

export interface StatsResponse {
    status: string;
    data: StatsData;
}

// ─── Estado del Servicio ─────────────────────────────────────────────────────

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'empty';

// ─── Servicio Principal ──────────────────────────────────────────────────────

@Injectable({
    providedIn: 'root'
})
export class AnalyticsDataService {
    private readonly apiBase = '/api/analytics';
    private readonly TIMEOUT_MS = 15000;        // 15 segundos timeout
    private readonly RETRY_COUNT = 2;           // 2 reintentos con backoff
    private readonly CACHE_DURATION_MS = 60000; // 1 minuto de caché

    // Datos del usuario para filtrado de seguridad
    private currentRoleId: number = 0;
    private currentUserId: string = '';

    // ── Estado Observable ──
    private _state = new BehaviorSubject<LoadState>('idle');
    public state$ = this._state.asObservable();

    // ── Caché en memoria ──
    private _cachedResults = new BehaviorSubject<ResultadoUnificado[]>([]);
    public results$ = this._cachedResults.asObservable();

    private _cachedMeta = new BehaviorSubject<UnifiedMeta | null>(null);
    public meta$ = this._cachedMeta.asObservable();

    private _lastFetchKey: string = '';
    private _lastFetchTime: number = 0;

    // Caché de stats por testId
    private _statsCache = new Map<string, { data: StatsData; timestamp: number }>();

    constructor(private http: HttpClient) {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                this.currentRoleId = user?.role_id || 0;
                this.currentUserId = user?._id || user?.id || '';
            }
        } catch (e) { }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MÉTODO PRINCIPAL: Obtener resultados unificados
    // ─────────────────────────────────────────────────────────────────────────────

    getResultsByType(
        tipo?: string,
        options?: {
            testId?: string;
            from?: string;
            to?: string;
            limit?: number;
            skip?: number;
            sort?: 'asc' | 'desc';
            forceRefresh?: boolean;
        }
    ): Observable<ResultadoUnificado[]> {
        const opts = options || {};
        const cacheKey = JSON.stringify({ tipo, ...opts });

        // Verificar caché
        if (
            !opts.forceRefresh &&
            cacheKey === this._lastFetchKey &&
            Date.now() - this._lastFetchTime < this.CACHE_DURATION_MS &&
            this._cachedResults.value.length > 0
        ) {
            return of(this._cachedResults.value);
        }

        this._state.next('loading');

        let params = new HttpParams();
        if (tipo) params = params.set('tipo', tipo);
        if (opts.testId) params = params.set('testId', opts.testId);
        if (opts.from) params = params.set('from', opts.from);
        if (opts.to) params = params.set('to', opts.to);
        if (opts.limit) params = params.set('limit', opts.limit.toString());
        if (opts.skip) params = params.set('skip', opts.skip.toString());
        if (opts.sort) params = params.set('sort', opts.sort);
        // Seguridad: enviar rol y usuario para filtrado en backend
        if (this.currentRoleId) params = params.set('role_id', this.currentRoleId.toString());
        if (this.currentUserId) params = params.set('user_id', this.currentUserId);

        return this.http.get<UnifiedResponse>(`${this.apiBase}/unified`, { params }).pipe(
            timeout(this.TIMEOUT_MS),
            retry({
                count: this.RETRY_COUNT,
                delay: (error, retryCount) => {
                    const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.warn(`[AnalyticsService] Reintento ${retryCount}/${this.RETRY_COUNT} en ${delayMs}ms`);
                    return timer(delayMs);
                }
            }),
            tap(response => {
                this._cachedResults.next(response.data);
                this._cachedMeta.next(response.meta);
                this._lastFetchKey = cacheKey;
                this._lastFetchTime = Date.now();
                this._state.next(response.data.length === 0 ? 'empty' : 'loaded');
            }),
            map(response => response.data),
            catchError(err => {
                console.error('[AnalyticsService] Error obteniendo resultados:', err);
                this._state.next('error');
                this._cachedResults.next([]);
                this._cachedMeta.next(null);
                return of([]);
            })
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ESTADÍSTICAS AGREGADAS
    // ─────────────────────────────────────────────────────────────────────────────

    getStats(testId?: string): Observable<StatsData> {
        const cacheKey = testId || '__global__';

        // Verificar caché de stats
        const cached = this._statsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
            return of(cached.data);
        }

        let params = new HttpParams();
        if (testId) params = params.set('testId', testId);
        if (this.currentRoleId) params = params.set('role_id', this.currentRoleId.toString());
        if (this.currentUserId) params = params.set('user_id', this.currentUserId);

        return this.http.get<StatsResponse>(`${this.apiBase}/stats`, { params }).pipe(
            timeout(this.TIMEOUT_MS),
            retry({
                count: this.RETRY_COUNT,
                delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000)
            }),
            tap(response => {
                this._statsCache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });
            }),
            map(response => response.data),
            catchError(err => {
                console.error('[AnalyticsService] Error obteniendo stats:', err);
                return of(this.emptyStats());
            })
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TIMELINE: Datos agrupados temporalmente
    // ─────────────────────────────────────────────────────────────────────────────

    getTimeline(testId?: string): Observable<TendenciaTemporal[]> {
        return this.getStats(testId).pipe(
            map(stats => stats.tendenciaTemporal)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    /** Invalida toda la caché manualmente */
    invalidateCache(): void {
        this._lastFetchKey = '';
        this._lastFetchTime = 0;
        this._statsCache.clear();
        this._state.next('idle');
    }

    /** Devuelve el estado actual como valor, no como observable */
    get currentState(): LoadState {
        return this._state.value;
    }

    /** Devuelve los resultados cacheados sin hacer fetch */
    get cachedResults(): ResultadoUnificado[] {
        return this._cachedResults.value;
    }

    /** Estructura vacía de stats para fallback */
    private emptyStats(): StatsData {
        return {
            count: 0,
            promedio: 0,
            mediana: 0,
            minimo: 0,
            maximo: 0,
            desviacionEstandar: 0,
            percentil25: 0,
            percentil75: 0,
            tiempoPromedio: null,
            tiempoMinimo: null,
            tiempoMaximo: null,
            distribucion: { excelente: 0, bueno: 0, regular: 0, bajo: 0 },
            distribucionGranular: { rango0_25: 0, rango26_50: 0, rango51_75: 0, rango76_100: 0 },
            demografiaGenero: [],
            tendenciaTemporal: [],
            tendenciaSemanal: [],
            respuestasPorPregunta: []
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TRANSFORMADORES: Datos API → Formatos de Componentes Gráficos
    // ─────────────────────────────────────────────────────────────────────────────

    /** Transforma StatsData → NarrativeStats para DataNarrativeComponent */
    toNarrativeStats(stats: StatsData): any {
        return {
            count: stats.count,
            promedio: stats.promedio,
            mediana: stats.mediana,
            minimo: stats.minimo,
            maximo: stats.maximo,
            desviacionEstandar: stats.desviacionEstandar,
            percentil25: stats.percentil25,
            percentil75: stats.percentil75,
            distribucion: { ...stats.distribucion },
            tendenciaTemporal: stats.tendenciaTemporal.map(t => ({
                mes: t.mes,
                totalEvaluados: t.totalEvaluados,
                promedioMes: t.promedioMes
            }))
        };
    }

    /** Transforma respuestasPorPregunta → LikertPregunta[] para DivergentBarComponent */
    toLikertData(stats: StatsData): any[] {
        if (!stats.respuestasPorPregunta || stats.respuestasPorPregunta.length === 0) return [];

        return stats.respuestasPorPregunta.map(rpp => {
            // Organizar conteos en 5 niveles Likert (o los que haya, padding a 5)
            const conteos = rpp.respuestas.map(r => r.conteo);
            while (conteos.length < 5) conteos.push(0);
            return {
                pregunta: rpp.pregunta,
                conteos: conteos.slice(0, 5) // Max 5 opciones Likert
            };
        });
    }

    /** Transforma ResultadoUnificado[] → HeatmapEntry[] para CalendarHeatmapComponent */
    toHeatmapEntries(resultados: ResultadoUnificado[]): any[] {
        const dateMap = new Map<string, number>();
        resultados.forEach(r => {
            if (!r.fecha) return;
            const dateOnly = r.fecha.substring(0, 10); // YYYY-MM-DD
            dateMap.set(dateOnly, (dateMap.get(dateOnly) || 0) + 1);
        });
        return Array.from(dateMap.entries()).map(([date, value]) => ({ date, value }));
    }

    /** Transforma ResultadoUnificado[] → SentimentEntry[] (basado en puntajes normalizados) */
    toSentimentEntries(resultados: ResultadoUnificado[]): any[] {
        return resultados
            .filter(r => r.fecha && r.puntaje != null)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map(r => {
                // Normalizar puntaje (0-100) a sentimiento (-1 a +1)
                const normalized = r.puntajeMaximo > 0
                    ? ((r.puntaje / r.puntajeMaximo) * 2 - 1)
                    : 0;
                return {
                    date: r.fecha,
                    value: parseFloat(normalized.toFixed(2)),
                    text: `${r.candidatoNombre} — ${r.testNombre}: ${r.puntaje} pts`,
                    label: r.candidatoNombre
                };
            });
    }

    /** Transforma ResultadoUnificado[] → ScatterPoint[] para QuadrantScatterComponent
     *  X = puntaje %, Y = % de preguntas respondidas */
    toScatterPoints(resultados: ResultadoUnificado[]): any[] {
        return resultados
            .filter(r => r.puntaje != null && r.puntajeMaximo > 0)
            .map(r => {
                const xVal = r.puntajeMaximo > 0 ? Math.round((r.puntaje / r.puntajeMaximo) * 100) : 0;
                const yVal = r.totalPreguntas > 0 ? Math.round((r.totalRespuestas / r.totalPreguntas) * 100) : 100;
                return {
                    x: xVal,
                    y: yVal,
                    label: r.candidatoNombre,
                    group: r.testNombre || 'General'
                };
            });
    }

    /** Transforma TendenciaTemporal[] → datos para WaterfallChart
     *  Muestra delta de promedio mes a mes */
    toWaterfallSteps(tendencia: TendenciaTemporal[]): any[] {
        if (!tendencia || tendencia.length < 2) return [];

        const steps: any[] = [{
            label: tendencia[0].mes,
            delta: Math.round(tendencia[0].promedioMes),
            tipo: 'total'
        }];

        for (let i = 1; i < tendencia.length; i++) {
            const delta = Math.round(tendencia[i].promedioMes - tendencia[i - 1].promedioMes);
            steps.push({
                label: tendencia[i].mes,
                delta,
                tipo: delta >= 0 ? 'incremento' : 'decremento'
            });
        }

        steps.push({
            label: 'Final',
            delta: Math.round(tendencia[tendencia.length - 1].promedioMes),
            tipo: 'total'
        });

        return steps;
    }

    /** Transforma datos de distribución + demografía → RadarDataset[] */
    toRadarDatasets(stats: StatsData, label: string = 'General'): { datasets: any[], labels: string[] } {
        // Si hay datos de género, crear un dataset por género
        if (stats.demografiaGenero && stats.demografiaGenero.length > 1) {
            const labels = ['Promedio', 'P25', 'P75', 'Mediana', 'Count (norm)'];
            const maxCount = Math.max(...stats.demografiaGenero.map(g => g.count), 1);
            const colors = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6'];

            const datasets = stats.demografiaGenero.map((g, i) => ({
                label: g.genero || `Grupo ${i + 1}`,
                data: [
                    g.promedio,
                    stats.percentil25,
                    stats.percentil75,
                    stats.mediana,
                    Math.round((g.count / maxCount) * 100)
                ],
                color: colors[i % colors.length]
            }));

            return { datasets, labels };
        }

        // Fallback: un solo dataset de distribución
        const labels = ['Excelente', 'Bueno', 'Regular', 'Bajo'];
        const total = stats.distribucion.excelente + stats.distribucion.bueno +
            stats.distribucion.regular + stats.distribucion.bajo || 1;
        const datasets = [{
            label,
            data: [
                Math.round((stats.distribucion.excelente / total) * 100),
                Math.round((stats.distribucion.bueno / total) * 100),
                Math.round((stats.distribucion.regular / total) * 100),
                Math.round((stats.distribucion.bajo / total) * 100)
            ],
            color: '#6366f1'
        }];

        return { datasets, labels };
    }

    /** Obtiene stats y lo transforma automáticamente para todos los nuevos componentes */
    getTransformedData(testId?: string): Observable<{
        narrative: any;
        likert: any[];
        waterfall: any[];
        radar: { datasets: any[]; labels: string[] };
        raw: StatsData;
    }> {
        return this.getStats(testId).pipe(
            map(stats => ({
                narrative: this.toNarrativeStats(stats),
                likert: this.toLikertData(stats),
                waterfall: this.toWaterfallSteps(stats.tendenciaTemporal),
                radar: this.toRadarDatasets(stats),
                raw: stats
            }))
        );
    }

    /** Obtiene resultados y los transforma para componentes basados en datos individuales */
    getTransformedResults(tipo?: string): Observable<{
        heatmap: any[];
        sentiment: any[];
        scatter: any[];
        raw: ResultadoUnificado[];
    }> {
        return this.getResultsByType(tipo).pipe(
            map(results => ({
                heatmap: this.toHeatmapEntries(results),
                sentiment: this.toSentimentEntries(results),
                scatter: this.toScatterPoints(results),
                raw: results
            }))
        );
    }
}
