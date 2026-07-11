const express = require('express');
const router = express.Router();
const entrenamientoCtrl = require('../controllers/entrenamiento.controller');

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT TEMPLATES — Deben ir ANTES de /:id para evitar colisión
// ═══════════════════════════════════════════════════════════════════════════════

// GET    /api/entrenamientos/templates/all       — Lista de templates
router.get('/templates/all', entrenamientoCtrl.listarTemplates);

// POST   /api/entrenamientos/templates           — Crear template
router.post('/templates', entrenamientoCtrl.crearTemplate);

// PUT    /api/entrenamientos/templates/:id       — Editar template
router.put('/templates/:id', entrenamientoCtrl.actualizarTemplate);

// DELETE /api/entrenamientos/templates/:id       — Eliminar template
router.delete('/templates/:id', entrenamientoCtrl.eliminarTemplate);

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS FIJAS — Deben ir ANTES de /:id
// ═══════════════════════════════════════════════════════════════════════════════

// POST   /api/entrenamientos/auto-assign — Motor de asignación automática
router.post('/auto-assign', entrenamientoCtrl.autoAssign);

// GET    /api/entrenamientos/public/:token  — Acceso público del candidato
router.get('/public/:token', entrenamientoCtrl.accesoPublico);

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRENAMIENTOS — CRUD (/:id al final)
// ═══════════════════════════════════════════════════════════════════════════════

// GET    /api/entrenamientos             — Lista todos los planes (admin)
router.get('/', entrenamientoCtrl.listar);

// POST   /api/entrenamientos             — Crear plan manual
router.post('/', entrenamientoCtrl.crear);

// GET    /api/entrenamientos/:id         — Detalle de un plan
router.get('/:id', entrenamientoCtrl.obtener);

// PUT    /api/entrenamientos/:id         — Actualizar plan/progreso
router.put('/:id', entrenamientoCtrl.actualizar);

// DELETE /api/entrenamientos/:id         — Soft-delete
router.delete('/:id', entrenamientoCtrl.eliminar);

// ── Acciones del usuario dentro del plan ──

// POST   /api/entrenamientos/:id/emocional   — Registrar termómetro emocional
router.post('/:id/emocional', entrenamientoCtrl.registrarEmocional);

// POST   /api/entrenamientos/:id/checkin     — Check-in de sprint
router.post('/:id/checkin', entrenamientoCtrl.checkIn);

// POST   /api/entrenamientos/:id/victoria    — Registrar victoria
router.post('/:id/victoria', entrenamientoCtrl.registrarVictoria);

// GET    /api/entrenamientos/:id/progreso    — Datos para dashboard Antigravity
router.get('/:id/progreso', entrenamientoCtrl.obtenerProgreso);

module.exports = router;
