import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Tipamos la interfaz para reflejar la estructura requerida, incluyendo 'avatarUrl'
export interface PruebaForm {
    nombre: string;
    descripcion: string;
    avatarUrl?: string; // Generado vía DiceBear
    [key: string]: any;  // Flexibilidad para el resto de atributos (estado, tipo, formularioVinculado, etc...)
}

@Injectable({
    providedIn: 'root'
})
export class PruebaService {

    // Endpoint REST creado en el servidor Node.js/Express
    private apiUrl = '/api/pruebas';

    constructor(private http: HttpClient) { }

    /**
     * ==========================================
     * INSTRUCCIONES DE USO PARA TU COMPONENTE
     * ==========================================
     * 
     * 1. INYECTAR EL SERVICIO EN EL CONSTRUCTOR:
     * constructor(
     *    private fb: FormBuilder, 
     *    private pruebaAPI: PruebaService
     * ) {}
     * 
     * 2. SUSCRIBIRSE Y ENVIAR EL PAYLOAD EN onSubmit():
     * onSubmit() {
     *    // Ensamblas los datos reactivos sumando la URL generada del avatar
     *    const payloadToSave: PruebaForm = { 
     *        ...this.wizardForm.value.generales, 
     *        avatarUrl: this.currentAvatarUrl 
     *    };
     *  
     *    // Llamas a este método y te suscribes para escuchar el 201 Created o los errores
     *    this.pruebaAPI.crearPrueba(payloadToSave).subscribe({
     *        next: (response) => {
     *            console.log('¡Prueba creada con éxito en la BD!', response);
     *            // Redirigir al listado o limpiar el formulario
     *        },
     *        error: (err) => {
     *            console.error('Error enviando los datos:', err);
     *            alert('Ocurrió un problema, verifica la consola.');
     *        }
     *    });
     * }
     */
    crearPrueba(pruebaData: PruebaForm): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<any>(this.apiUrl, pruebaData, { headers })
            .pipe(
                catchError(this.handleError)
            );
    }

    // Manejador centralizado y limpio de errores HTTP con RxJS
    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Error desconocido!';
        if (error.error instanceof ErrorEvent) {
            // Error del lado del cliente o interrupción de red
            errorMessage = `Error de Red/Cliente: ${error.error.message}`;
        } else {
            // El backend retornó un código de fallo (Ej: 400 Bad Request, 500 Internal Error)
            errorMessage = `Error API [Código ${error.status}]: ${error.error?.message || error.message}`;
        }
        console.error('PruebaService falló:', errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
