import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestsDataService, TestItem } from './tests-data.service';

describe('TestsDataService', () => {
    let service: TestsDataService;
    let httpMock: HttpTestingController;

    const mockApiResponse = {
        status: 'ok',
        data: [
            {
                id: '65f1a2b3c4d5e6f7a8b9c0d1',
                title: 'Test Clima Organizacional',
                description: 'Evalúa el clima laboral',
                questionsCount: '15',
                imageUrl: '',
                colorClass: 'bg-blue',
                activo: true
            },
            {
                id: '65f1a2b3c4d5e6f7a8b9c0d2',
                title: 'Test Liderazgo',
                description: 'Evalúa habilidades de liderazgo',
                questionsCount: '20',
                imageUrl: '',
                colorClass: 'bg-teal',
                activo: false
            }
        ] as TestItem[]
    };

    beforeEach(() => {
        localStorage.removeItem('testea_mock_tests');
        localStorage.removeItem('currentUser');

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                TestsDataService
            ]
        });

        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(TestsDataService);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.removeItem('testea_mock_tests');
        localStorage.removeItem('currentUser');
    });

    it('should be created', () => {
        // Flush the initial fetchTests call
        const req = httpMock.expectOne('/api/test/list');
        req.flush(mockApiResponse);
        expect(service).toBeTruthy();
    });

    it('should fetch tests on construction and populate tests$', (done) => {
        service.tests$.subscribe(tests => {
            if (tests.length > 0) {
                expect(tests.length).toBe(2);
                expect(tests[0].title).toBe('Test Clima Organizacional');
                expect(tests[1].title).toBe('Test Liderazgo');
                done();
            }
        });

        const req = httpMock.expectOne('/api/test/list');
        req.flush(mockApiResponse);
    });

    it('should preserve activo state from API response', (done) => {
        service.tests$.subscribe(tests => {
            if (tests.length > 0) {
                expect(tests[0].activo).toBe(true);
                expect(tests[1].activo).toBe(false);
                done();
            }
        });

        const req = httpMock.expectOne('/api/test/list');
        req.flush(mockApiResponse);
    });

    it('should cache tests in localStorage after fetch', () => {
        const req = httpMock.expectOne('/api/test/list');
        req.flush(mockApiResponse);

        const cached = localStorage.getItem('testea_mock_tests');
        expect(cached).toBeTruthy();
        const parsed = JSON.parse(cached!);
        expect(parsed.length).toBe(2);
    });

    it('should fall back to localStorage cache on API error', (done) => {
        // Pre-populate localStorage cache
        const cachedTests: TestItem[] = [{
            id: 'cached-1',
            title: 'Cached Test',
            description: '',
            questionsCount: '5',
            imageUrl: '',
            colorClass: 'bg-gray',
            activo: true
        }];
        localStorage.setItem('testea_mock_tests', JSON.stringify(cachedTests));

        service.tests$.subscribe(tests => {
            if (tests.length > 0 && tests[0].id === 'cached-1') {
                expect(tests[0].title).toBe('Cached Test');
                done();
            }
        });

        const req = httpMock.expectOne('/api/test/list');
        req.error(new ProgressEvent('Network error'));
    });

    it('should emit empty array when API fails and no cache exists', (done) => {
        localStorage.removeItem('testea_mock_tests');

        let emitCount = 0;
        service.tests$.subscribe(tests => {
            emitCount++;
            // Second emit (after error handling) should be empty
            if (emitCount >= 2) {
                expect(tests.length).toBe(0);
                done();
            }
        });

        const req = httpMock.expectOne('/api/test/list');
        req.error(new ProgressEvent('Network error'));
    });

    it('getTestsSync should return current snapshot', () => {
        const req = httpMock.expectOne('/api/test/list');
        req.flush(mockApiResponse);

        const snapshot = service.getTestsSync();
        expect(snapshot.length).toBe(2);
        expect(snapshot[0].title).toBe('Test Clima Organizacional');
    });

    it('should send role_id header when currentUser exists', () => {
        localStorage.setItem('currentUser', JSON.stringify({ role_id: 3 }));

        // Flush the initial fetch (from constructor)
        const initialReq = httpMock.expectOne('/api/test/list');
        initialReq.flush(mockApiResponse);

        // Trigger a new fetch
        service.fetchTests();

        const req = httpMock.expectOne('/api/test/list');
        expect(req.request.headers.get('role_id')).toBe('3');
        req.flush(mockApiResponse);
    });

    it('crearTest should POST to /api/test', (done) => {
        const flushInitial = httpMock.expectOne('/api/test/list');
        flushInitial.flush(mockApiResponse);

        const testData = { title: 'New Test', description: 'Description' };
        service.crearTest(testData).subscribe(res => {
            expect(res.status).toBe('ok');
            done();
        });

        const req = httpMock.expectOne('/api/test');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(testData);
        req.flush({ status: 'ok', message: 'Created', data: { _id: 'new-id' } });
    });

    it('eliminarTest should DELETE to /api/test/:id', (done) => {
        const flushInitial = httpMock.expectOne('/api/test/list');
        flushInitial.flush(mockApiResponse);

        service.eliminarTest('test-123').subscribe(res => {
            expect(res.status).toBe('ok');
            done();
        });

        const req = httpMock.expectOne('/api/test/test-123');
        expect(req.request.method).toBe('DELETE');
        req.flush({ status: 'ok', message: 'Deleted' });
    });

    it('updateTestsOrder should update local state and sync to backend', () => {
        const flushInitial = httpMock.expectOne('/api/test/list');
        flushInitial.flush(mockApiResponse);

        const reordered = [...mockApiResponse.data].reverse();
        service.updateTestsOrder(reordered);

        const snapshot = service.getTestsSync();
        expect(snapshot[0].title).toBe('Test Liderazgo');

        // Should sync to backend
        const req = httpMock.expectOne('/api/test/reorder');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body.orderedIds).toBeTruthy();
        req.flush({});
    });

    it('parseQuestions should base64 encode text before sending', (done) => {
        const flushInitial = httpMock.expectOne('/api/test/list');
        flushInitial.flush(mockApiResponse);

        service.parseQuestions('¿Cómo te sientes?').subscribe(res => {
            expect(res.status).toBe('ok');
            done();
        });

        const req = httpMock.expectOne('/api/test/parse-questions');
        expect(req.request.method).toBe('POST');
        expect(req.request.body.isEncoded).toBe(true);
        expect(req.request.body.text).toBeTruthy();
        // Verify the text is base64 encoded
        const decoded = decodeURIComponent(escape(atob(req.request.body.text)));
        expect(decoded).toBe('¿Cómo te sientes?');
        req.flush({ status: 'ok', message: 'Parsed', data: [] });
    });
});
