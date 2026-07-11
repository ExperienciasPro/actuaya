import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'success' | 'error' | 'warning' | 'info';
    icon: string;
    dismissing?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private counter = 0;
    private toastsSubject = new Subject<{ action: 'add' | 'remove'; toast: ToastMessage }>();

    toasts$ = this.toastsSubject.asObservable();

    success(text: string, durationMs = 4000) {
        this.show(text, 'success', '✓', durationMs);
    }

    error(text: string, durationMs = 5000) {
        this.show(text, 'error', '✕', durationMs);
    }

    warning(text: string, durationMs = 4500) {
        this.show(text, 'warning', '⚠', durationMs);
    }

    info(text: string, durationMs = 4000) {
        this.show(text, 'info', 'ℹ', durationMs);
    }

    private show(text: string, type: ToastMessage['type'], icon: string, durationMs: number) {
        const toast: ToastMessage = { id: ++this.counter, text, type, icon };
        this.toastsSubject.next({ action: 'add', toast });

        setTimeout(() => {
            toast.dismissing = true;
            this.toastsSubject.next({ action: 'add', toast }); // trigger change detection
            setTimeout(() => {
                this.toastsSubject.next({ action: 'remove', toast });
            }, 350);
        }, durationMs);
    }
}
