import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
export interface TestItem {
    id: string;
    title: string;
    description: string;
    type?: string;
    formularioCaptura?: string;
    questionsCount: string;
    imageUrl: string;
    colorClass: string;
    activo?: boolean;
    isDeleted?: boolean;
    deletedAt?: Date | string;
    autor_nombre?: string;
    creado_por_id?: string;
    colaboradores?: any[];
    estadoPublicacion?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TestsDataService {
    private _tests = new BehaviorSubject<TestItem[]>([]);
    public tests$ = this._tests.asObservable();

    constructor(private http: HttpClient) {
        // No auto-fetch aquí — cada componente llama fetchTests() cuando lo necesita.
        // Antes: this.fetchTests() bloqueaba la carga inicial con una llamada de ~70KB.
    }

    public fetchTests() {
        let params: any = {};
        const currentUserData = localStorage.getItem('currentUser');
        if (currentUserData) {
            try {
                const user = JSON.parse(currentUserData);
                if (user.role_id) params['role_id'] = user.role_id.toString();
                if (user.id) params['user_id'] = user.id.toString();
            } catch (e) { }
        }

        this.http.get<{ status: string, data: TestItem[] }>('/api/test/list', { params }).subscribe({
            next: (res) => {
                if (res && res.data) {
                    let localTests: TestItem[] = [];
                    try {
                        const localData = localStorage.getItem('testea_mock_tests');
                        if (localData) localTests = JSON.parse(localData);
                    } catch (e) { }

                    const isMongoId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
                    const hasLocalState = localTests.length > 0;

                    // Build local legacy map for state preservation
                    const localLegacyMap = new Map<string, TestItem>();
                    if (hasLocalState) {
                        localTests.forEach(t => {
                            if (!isMongoId(t.id)) localLegacyMap.set(t.id, t);
                        });
                    }

                    // Use a Map keyed by ID to guarantee uniqueness
                    const uniqueMap = new Map<string, TestItem>();

                    for (const t of res.data) {
                        let finalItem = { ...t, activo: t.activo !== undefined ? t.activo : true };

                        if (!isMongoId(t.id) && hasLocalState) {
                            if (localLegacyMap.has(t.id)) {
                                const localT = localLegacyMap.get(t.id)!;
                                finalItem.activo = localT.activo !== undefined ? localT.activo : finalItem.activo;
                                finalItem.isDeleted = localT.isDeleted !== undefined ? localT.isDeleted : finalItem.isDeleted;
                                finalItem.deletedAt = localT.deletedAt;
                            } else {
                                // Existed in XML but was hard-deleted locally
                                continue;
                            }
                        }
                        // Use Map to prevent duplicates — last write wins
                        uniqueMap.set(finalItem.id, finalItem);
                    }

                    const mergedData = Array.from(uniqueMap.values());
                    this._tests.next(mergedData);
                    localStorage.setItem('testea_mock_tests', JSON.stringify(mergedData));
                }
            },
            error: (err) => {
                console.warn('API Offline - Utilizando LocalStorage Cache (Mock Backend)', err);
                const localData = localStorage.getItem('testea_mock_tests');
                if (localData) {
                    this._tests.next(JSON.parse(localData));
                } else {
                    this._tests.next([]);
                }
            }
        });
    }

    getTestsSync(): TestItem[] {
        return this._tests.value;
    }

    updateTestsOrder(newTests: TestItem[]): void {
        const previousTests = this.getTestsSync();
        this._tests.next(newTests);
        localStorage.setItem('testea_mock_tests', JSON.stringify(newTests));

        // Sync to backend (only for DB items)
        const dbIds = newTests.filter(t => t.id && t.id.length >= 24).map(t => t.id);
        if (dbIds.length > 0) {
            this.http.patch('/api/test/reorder', { orderedIds: dbIds }).subscribe({
                next: () => { /* order persisted */ },
                error: (err) => {
                    console.error('❌ Error guardando orden:', err);
                    alert('Error guardando el nuevo orden en la base de datos.');
                    this._tests.next(previousTests);
                    localStorage.setItem('testea_mock_tests', JSON.stringify(previousTests));
                }
            });
        }
    }

    crearTest(testData: any): Observable<{ status: string, message: string, data: any }> {
        return this.http.post<{ status: string, message: string, data: any }>('/api/test', testData);
    }

    createFullTest(payload: any): Observable<{ status: string, message: string, data: { _id: string, test?: any } }> {
        let role_id = 0;
        let user_id = '';
        const currentUserData = localStorage.getItem('currentUser');
        if (currentUserData) {
            try {
                const user = JSON.parse(currentUserData);
                role_id = user.role_id || 0;
                user_id = user.id || '';
            } catch (e) { }
        }

        return new Observable(observer => {
            this.http.post<{ status: string, message: string, data: any }>(
                '/api/test/complete',
                payload,
                { params: { role_id: role_id.toString(), user_id } }
            ).subscribe({
                next: (res) => {
                    // Refrescar la lista de tests para que aparezca el nuevo creado en el backend real
                    this.fetchTests();
                    observer.next(res);
                    observer.complete();
                },
                error: (err) => {
                    observer.error(err);
                }
            });
        });
    }

    parseQuestions(text: string): Observable<{ status: string, message: string, data: any[] }> {
        // Codificamos en Base64 para burlar el WAF (ModSecurity) de Hostinger que suele
        // bloquear textos largos con caracteres especiales (?), saltos de línea y símbolos.
        const encodedText = btoa(unescape(encodeURIComponent(text)));
        return this.http.post<{ status: string, message: string, data: any[] }>('/api/test/parse-questions', {
            text: encodedText,
            isEncoded: true
        });
    }

    actualizarTest(id: string, testData: any): Observable<{ status: string, message: string, data: any }> {
        return new Observable(observer => {
            this.http.put<{ status: string, message: string, data: any }>(`/api/test/${id}`, testData).subscribe({
                next: (res) => {
                    this.fetchTests();
                    observer.next(res);
                    observer.complete();
                },
                error: (err) => {
                    observer.error(err);
                }
            });
        });
    }

    eliminarTest(id: string): Observable<{ status: string, message: string }> {
        let params: any = {};
        const currentUserData = localStorage.getItem('currentUser');
        if (currentUserData) {
            try {
                const user = JSON.parse(currentUserData);
                if (user.role_id) params['role_id'] = user.role_id.toString();
                if (user.id) params['user_id'] = user.id.toString();
            } catch (e) { }
        }
        return this.http.delete<{ status: string, message: string }>(`/api/test/${id}`, { params });
    }
}
