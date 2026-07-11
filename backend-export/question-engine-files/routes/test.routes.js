const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');

// Crear un nuevo test
router.post('/', testController.createTest);

// Ruta para obtener raw data de tests y simuladores
router.get('/raw', testController.getRawAll);

// Ruta para extraer todos los tests cargados
router.get('/list', testController.getTestList);

// Reordenar tests (Drag & Drop)
router.patch('/reorder', testController.reorderTests);

// Creador de Test Full Insert (Final de la tarjeta 5)
router.post('/complete', testController.createFullTest);

// Parsear texto a preguntas JSON
router.post('/parse-questions', testController.parseQuestionsText);

// Actualizar un test completo o pasos posteriores
router.put('/:id', testController.updateTest);

// Eliminar un test (Fase 3)
router.delete('/:id', testController.deleteTest);

// Compartir un test con un colaborador
router.post('/share/:id', testController.shareTest);

// Remover un colaborador de un test
router.post('/unshare/:id', testController.unshareTest);

// Ruta transaccional para extraer el test y sus preguntas (basado en XML original)
router.get('/:id', testController.getTestStartData);

// Ruta para iniciar la sesión o demografía (Simulando start.php)
router.post('/session', testController.createTestSession);

// Ruta para la sumisión del test y posterior análisis
router.post('/:id/submit', testController.submitTest);

module.exports = router;
