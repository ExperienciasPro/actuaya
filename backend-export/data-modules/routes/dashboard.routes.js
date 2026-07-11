const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/summary', dashboardController.getGlobalSummary);
router.get('/infrastructure', dashboardController.getInfrastructureStats);
router.get('/backup', dashboardController.triggerBackup);

module.exports = router;
