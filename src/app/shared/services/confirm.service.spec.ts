import { ConfirmService, ConfirmConfig } from './confirm.service';

describe('ConfirmService', () => {
    let service: ConfirmService;

    beforeEach(() => {
        service = new ConfirmService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit a confirm event with the correct config', (done) => {
        const config: ConfirmConfig = {
            title: 'Test Title',
            message: 'Test message',
            confirmText: 'Yes',
            cancelText: 'No',
            type: 'danger',
            icon: 'trash'
        };

        service.confirm$.subscribe(event => {
            expect(event.config).toEqual(config);
            expect(typeof event.resolve).toBe('function');
            event.resolve(true);
            done();
        });

        service.confirm(config);
    });

    it('should resolve with true when user confirms', async () => {
        service.confirm$.subscribe(event => {
            event.resolve(true);
        });

        const result = await service.confirm({
            title: 'Confirm',
            message: 'Are you sure?'
        });
        expect(result).toBe(true);
    });

    it('should resolve with false when user cancels', async () => {
        service.confirm$.subscribe(event => {
            event.resolve(false);
        });

        const result = await service.confirm({
            title: 'Confirm',
            message: 'Are you sure?'
        });
        expect(result).toBe(false);
    });

    it('confirmDelete should use danger type with correct defaults', (done) => {
        service.confirm$.subscribe(event => {
            expect(event.config.title).toBe('¿Eliminar este elemento?');
            expect(event.config.message).toContain('Test Item');
            expect(event.config.type).toBe('danger');
            expect(event.config.icon).toBe('trash');
            expect(event.config.confirmText).toBe('Eliminar');
            expect(event.config.cancelText).toBe('Cancelar');
            event.resolve(true);
            done();
        });

        service.confirmDelete('Test Item');
    });

    it('confirmDelete should properly escape item name in message', (done) => {
        service.confirm$.subscribe(event => {
            expect(event.config.message).toContain('"Encuesta "Clima Laboral""');
            event.resolve(true);
            done();
        });

        service.confirmDelete('Encuesta "Clima Laboral"');
    });
});
