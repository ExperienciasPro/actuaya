import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface TerritoryDB {
    [pais: string]: {
        [departamento: string]: string[];
    };
}

export interface PoblacionesDB {
    [enfoque: string]: string[];
}

@Injectable({
    providedIn: 'root'
})
export class TerritoryService {
    private http = inject(HttpClient);

    private _territories = new BehaviorSubject<TerritoryDB>({});
    private _poblaciones = new BehaviorSubject<PoblacionesDB>({});
    private loaded = false;

    /** Load territory data from JSON (lazy, only when needed) */
    loadTerritories(): Observable<TerritoryDB> {
        if (this.loaded) {
            return of(this._territories.value);
        }

        return this.http.get<TerritoryDB>('/assets/data/colombia-territories.json').pipe(
            tap(data => {
                this._territories.next(data);
                this.loaded = true;
            }),
            catchError(err => {
                console.error('Error loading territories:', err);
                return of({});
            })
        );
    }

    /** Load population categories from JSON */
    loadPoblaciones(): Observable<PoblacionesDB> {
        return this.http.get<PoblacionesDB>('/assets/data/poblaciones.json').pipe(
            tap(data => this._poblaciones.next(data)),
            catchError(err => {
                console.error('Error loading poblaciones:', err);
                return of({});
            })
        );
    }

    /** Get available countries */
    getPaises(db: TerritoryDB): string[] {
        return Object.keys(db);
    }

    /** Get departments for a country */
    getDepartamentos(db: TerritoryDB, pais: string): string[] {
        return db[pais] ? Object.keys(db[pais]) : [];
    }

    /** Get municipalities for a department */
    getMunicipios(db: TerritoryDB, pais: string, departamento: string): string[] {
        return db[pais]?.[departamento] || [];
    }

    /** Get population approach categories */
    getEnfoques(db: PoblacionesDB): string[] {
        return Object.keys(db);
    }

    /** Get specific populations for an approach */
    getPoblaciones(db: PoblacionesDB, enfoque: string): string[] {
        return db[enfoque] || [];
    }
}
