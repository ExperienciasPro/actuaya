import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ResultadoBackend {
    id_resultado?: string;
    testId: string;
    testNombre: string;
    tipo?: string;
    usuarioId: string;
    usuarioNombre: string;
    usuarioRol?: string;
    fecha: string;
    puntajeGlobal: number;
    competencias?: number[];
    labelsCompetencias?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ResultadosService {
    private apiUrl = '/api/resultados';

    constructor(private http: HttpClient) { }

    obtenerTodosLosResultados(): Observable<ResultadoBackend[]> {
        return this.http.get<ResultadoBackend[]>(this.apiUrl).pipe(
            catchError(err => {
                console.error('Error al obtener resultados del backend:', err);
                // Retornamos un arreglo vacío para gestionar el Empty State visualmente
                return of([]);
            })
        );
    }
}
