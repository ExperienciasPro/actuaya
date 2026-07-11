const express = require('express');
const router = express.Router();
const resultadosController = require('../controllers/resultados.controller');

router.get('/', resultadosController.getResultados);

module.exports = router;
