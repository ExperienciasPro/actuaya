import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

export interface ConfirmConfig {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    icon?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmService {
    private confirmSubject = new Subject<{ config: ConfirmConfig; resolve: (result: boolean) => void }>();
    confirm$ = this.confirmSubject.asObservable();

    /**
     * Shows a premium confirmation modal and returns a Promise<boolean>.
     * Usage:
     *   const ok = await this.confirmService.confirm({ title: '...', message: '...' });
     *   if (ok) { ... do destructive action ... }
     */
    confirm(config: ConfirmConfig): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.confirmSubject.next({ config, resolve });
        });
    }

    /** Shortcut for delete confirmations */
    confirmDelete(itemName: string): Promise<boolean> {
        return this.confirm({
            title: '¿Eliminar este elemento?',
            message: `Estás a punto de eliminar "${itemName}". Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'trash'
        });
    }
}
