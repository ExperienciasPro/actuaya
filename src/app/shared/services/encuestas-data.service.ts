import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class EncuestasDataService {
    private http = inject(HttpClient);

    getRawData(): Observable<any> {
        let params: any = {};
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.role_id) params['role_id'] = user.role_id.toString();
            if (user.id) params['user_id'] = user.id.toString();
        } catch (e) { }

        return this.http.get('/api/encuestas/raw', { params }).pipe(
            catchError(err => {
                console.error('Error fetching raw encuestas data. Using mock data fallback.', err);
                return of({
                    status: 'ok',
                    data: [
                        { id: 'e_mock1', nombre: 'Clima Laboral 2026', descripcion: 'Mock Fallback', estado: 'Publicado', creado_por: 'Admin_Juan', fechaAlta: new Date().toISOString() },
                        { id: 'e_mock2', nombre: 'Mock Encuesta Bienestar', descripcion: 'Borrador Fallback', estado: 'Borrador', creado_por: 'Gestor Testea RH', fechaAlta: new Date().toISOString() }
                    ]
                });
            })
        );
    }
}
