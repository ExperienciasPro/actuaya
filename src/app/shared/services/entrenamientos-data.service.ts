import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class EntrenamientosDataService {
    private http = inject(HttpClient);

    getRawData(): Observable<any> {
        let params: any = {};
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.role_id) params['role_id'] = user.role_id.toString();
            if (user.id) params['user_id'] = user.id.toString();
        } catch (e) { }

        return this.http.get<any>('/api/test/list', { params }).pipe(
            map(res => {
                // Filtrar tests de tipo entrenamiento/training
                const tests = res.data || res || [];
                const entrenamientos = (Array.isArray(tests) ? tests : []).map((t: any) => ({
                    id: t._id || t.id,
                    nombre: t.nombre || t.title || 'Sin nombre',
                    descripcion: t.descripcion || t.description || '',
                    tipo: t.tipo || 'Entrenamiento',
                    activo: t.activo !== false,
                    creado_por: t.creado_por || t.creadoPor || 'Sistema',
                    fechaAlta: t.createdAt || t.fechaCreacion || new Date().toISOString(),
                    totalPreguntas: t.totalPreguntas || t.preguntas?.length || 0,
                    totalEvaluados: t.totalEvaluados || 0
                })).filter((t: any) =>
                    t.tipo?.toLowerCase() === 'entrenamiento' ||
                    t.tipo?.toLowerCase() === 'training' ||
                    t.nombre?.toLowerCase().includes('entrenamiento') ||
                    t.nombre?.toLowerCase().includes('capacitación') ||
                    t.nombre?.toLowerCase().includes('training')
                );
                return { status: 'ok', data: entrenamientos };
            }),
            catchError(err => {
                console.error('Error fetching entrenamientos data. Using mock fallback.', err);
                return of({
                    status: 'ok',
                    data: []
                });
            })
        );
    }
}
