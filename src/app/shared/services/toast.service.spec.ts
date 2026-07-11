import { ToastService, ToastMessage } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        service = new ToastService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit a success toast with default duration', (done) => {
        service.toasts$.subscribe(event => {
            expect(event.action).toBe('add');
            expect(event.toast.type).toBe('success');
            expect(event.toast.text).toBe('Operación exitosa');
            expect(event.toast.icon).toBe('✓');
            expect(event.toast.id).toBeGreaterThan(0);
            done();
        });
        service.success('Operación exitosa');
    });

    it('should emit an error toast', (done) => {
        service.toasts$.subscribe(event => {
            expect(event.action).toBe('add');
            expect(event.toast.type).toBe('error');
            expect(event.toast.text).toBe('Algo salió mal');
            expect(event.toast.icon).toBe('✕');
            done();
        });
        service.error('Algo salió mal');
    });

    it('should emit a warning toast', (done) => {
        service.toasts$.subscribe(event => {
            expect(event.action).toBe('add');
            expect(event.toast.type).toBe('warning');
            expect(event.toast.text).toBe('Cuidado');
            expect(event.toast.icon).toBe('⚠');
            done();
        });
        service.warning('Cuidado');
    });

    it('should emit an info toast', (done) => {
        service.toasts$.subscribe(event => {
            expect(event.action).toBe('add');
            expect(event.toast.type).toBe('info');
            expect(event.toast.text).toBe('Información');
            expect(event.toast.icon).toBe('ℹ');
            done();
        });
        service.info('Información');
    });

    it('should increment toast IDs sequentially', () => {
        const ids: number[] = [];
        const sub = service.toasts$.subscribe(event => {
            if (event.action === 'add' && !event.toast.dismissing) {
                ids.push(event.toast.id);
            }
        });

        service.success('Toast 1');
        service.error('Toast 2');
        service.warning('Toast 3');

        expect(ids.length).toBe(3);
        expect(ids[0]).toBe(1);
        expect(ids[1]).toBe(2);
        expect(ids[2]).toBe(3);
        sub.unsubscribe();
    });

    it('should auto-dismiss a toast after the specified duration', (done) => {
        const events: { action: string; dismissing?: boolean }[] = [];

        service.toasts$.subscribe(event => {
            events.push({ action: event.action, dismissing: event.toast.dismissing });
            if (event.action === 'remove') {
                // Should have: add (initial), add (dismissing=true), remove
                expect(events.length).toBe(3);
                expect(events[0].action).toBe('add');
                expect(events[0].dismissing).toBeFalsy();
                expect(events[1].action).toBe('add');
                expect(events[1].dismissing).toBe(true);
                expect(events[2].action).toBe('remove');
                done();
            }
        });

        // Use a very short duration for testing
        service.success('Quick toast', 100);
    }, 3000);
});
