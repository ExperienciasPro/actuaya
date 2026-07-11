const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');

// GET descargas
router.get('/users', exportController.downloadUsers);
router.get('/results', exportController.downloadResults);
router.get('/managers', exportController.downloadManagers);
router.get('/catalog', exportController.downloadCatalog);
router.get('/surveys/csv', exportController.downloadSurveysCSV);
router.get('/surveys/zip', exportController.downloadSurveysZIP);

// Gestión de respuestas individuales
router.get('/responses', exportController.listResponses);
router.get('/responses-full', exportController.listResponsesFull);
router.delete('/response/:id', exportController.deleteResponse);

// Data Cleanup (Limpieza de datos)
router.get('/cleanup/analyze', exportController.analyzeCleanup);
router.post('/cleanup/execute', exportController.executeCleanup);
router.delete('/cleanup/purge/:testId', exportController.purgeInstrumentData);

// Pro Analytics (Herramientas profesionales)
router.get('/pro/quality', exportController.dataQualityScore);
router.get('/pro/anomalies', exportController.detectAnomalies);
router.get('/pro/trends', exportController.getTrends);
router.get('/pro/storage', exportController.getStorageStats);
router.get('/pro/export-json', exportController.exportJSON);

module.exports = router;
