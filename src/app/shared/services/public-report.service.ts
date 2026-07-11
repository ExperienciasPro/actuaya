import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface SharedReportConfig {
  token: string;
  instrumentId: string;
  instrumentName: string;
  instrumentType: 'test' | 'survey' | 'battery' | 'simulator';
  chartType: 'bar' | 'pie' | 'doughnut' | 'line';
  selectedMetrics: string[];
  generatedAt: string;
  createdAt: string;
  expiresAt: string;
  views: number;
  brandColor?: string;
  brandLogo?: string;
  brandName?: string;
}

export interface FichaTecnica {
  nombre: string;
  tipo: string;
  fechaCreacion: string | null;
  totalPreguntas: number;
  descripcion: string;
  creador: string;
}

export interface ChartItem {
  questionName: string;
  chartData: any;
}

export interface SharedReportData {
  config: SharedReportConfig;
  fichaTecnica: FichaTecnica;
  totalEncuestados: number;
  charts: ChartItem[];
  chartOptions: any;
}

export type VerifyResult =
  | { valid: true; data: SharedReportData }
  | { valid: false; reason: 'not_found' | 'expired' | 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class PublicReportService {

  constructor(private http: HttpClient) {}

  verifyToken(token: string): Observable<VerifyResult> {
    return this.http.get<any>(`/api/analytics/shared/${token}`).pipe(
      map(res => {
        if (res.status === 'ok' && res.data) {
          const d = res.data;
          const config: SharedReportConfig = {
            token: d.token,
            instrumentId: d.instrumentId,
            instrumentName: d.instrumentName || d.fichaTecnica?.nombre || 'Instrumento',
            instrumentType: d.instrumentType || 'test',
            chartType: d.chartType || 'bar',
            selectedMetrics: d.selectedMetrics || [],
            generatedAt: d.generatedAt || '',
            createdAt: d.createdAt || '',
            expiresAt: d.expiresAt || '',
            views: d.views || 0,
            brandColor: d.brandColor || undefined,
            brandLogo: d.brandLogo || undefined,
            brandName: d.brandName || undefined
          };

          const isPie = config.chartType === 'pie' || config.chartType === 'doughnut';
          const chartOptions = this.getChartOptions(isPie, 'Frecuencia');

          return {
            valid: true as const,
            data: {
              config,
              fichaTecnica: d.fichaTecnica || { nombre: config.instrumentName, tipo: config.instrumentType, fechaCreacion: null, totalPreguntas: 0, descripcion: '', creador: '' },
              totalEncuestados: d.totalEncuestados || 0,
              charts: d.charts || [],
              chartOptions
            }
          };
        }
        return { valid: false as const, reason: 'not_found' as const, message: 'Enlace no encontrado.' };
      }),
      catchError(err => {
        const status = err?.status;
        if (status === 404) {
          return of({ valid: false as const, reason: 'not_found' as const, message: 'Este enlace de reporte no existe o ya fue eliminado.' });
        }
        if (status === 410) {
          return of({ valid: false as const, reason: 'expired' as const, message: 'Este enlace ha expirado. Solicita uno nuevo al administrador.' });
        }
        return of({ valid: false as const, reason: 'error' as const, message: 'Error al verificar el enlace. Intenta nuevamente.' });
      })
    );
  }

  private getChartOptions(isPie: boolean, yLabel: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: isPie ? 'bottom' : 'top',
          labels: { font: { size: 11, family: "'Inter', sans-serif" }, padding: 14, color: '#64748b' }
        }
      },
      scales: isPie ? {} : {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
        y: { beginAtZero: true, title: { display: true, text: yLabel, font: { size: 11, weight: '600' }, color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8' } }
      }
    };
  }
}
