import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class SimuladorDataService {
    private http = inject(HttpClient);

    getRawData(): Observable<any> {
        let params: any = { tipo: 'Simulador de Decisiones' };
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.role_id) params['role_id'] = user.role_id.toString();
            if (user.id) params['user_id'] = user.id.toString();
        } catch (e) { }

        return this.http.get('/api/test/raw', { params }).pipe(
            catchError(err => {
                console.error('Error fetching raw simulador data. Using mock data fallback.', err);
                return of({
                    status: 'ok',
                    data: []
                });
            })
        );
    }
}
