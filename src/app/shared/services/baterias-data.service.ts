import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class BateriasDataService {
    private http = inject(HttpClient);

    getRawData(): Observable<any> {
        let params: any = {};
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.role_id) params['role_id'] = user.role_id.toString();
            if (user.id) params['user_id'] = user.id.toString();
        } catch (e) { }

        return this.http.get('/api/baterias/raw', { params }).pipe(
            catchError(err => {
                console.error('Error fetching raw baterias data. Using mock data fallback.', err);
                return of({
                    status: 'ok',
                    data: [
                        { id: 'b_mock1', nombre: 'Batería Mock 1', descripcion: 'Mock Fallback', activo: true, creado_por: 'Admin_Juan', fechaAlta: new Date().toISOString() },
                        { id: 'b_mock2', nombre: 'Batería Mock 2', descripcion: 'Mock Fallback', activo: false, creado_por: 'Gestor Testea RH', fechaAlta: new Date().toISOString() }
                    ]
                });
            })
        );
    }
}
