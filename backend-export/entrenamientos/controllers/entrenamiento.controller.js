/**
 * Entrenamiento Controller
 * 
 * Gestión completa de planes de entrenamiento experiencial.
 * Incluye CRUD de planes, motor de asignación automática,
 * registros emocionales, check-ins, y biblioteca de sprint templates.
 */
const crypto = require('crypto');
const Entrenamiento = require('../models/entrenamiento.model');
const SprintTemplate = require('../models/sprint-template.model');
const Admision = require('../models/admision.model');
const Test = require('../models/test.model');

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRENAMIENTOS — CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/entrenamientos — Lista todos los planes
exports.listar = async (req, res) => {
    try {
        const planes = await Entrenamiento.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .select('-registrosEmocionales -experimentosConductuales')
            .lean();
        res.json({ status: 'ok', data: planes });
    } catch (err) {
        console.error('[Entrenamientos] Error listando:', err);
        res.status(500).json({ status: 'error', message: 'Error al obtener planes' });
    }
};

// GET /api/entrenamientos/:id — Detalle completo de un plan
exports.obtener = async (req, res) => {
    try {
        const plan = await Entrenamiento.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });
        res.json({ status: 'ok', data: plan });
    } catch (err) {
        console.error('[Entrenamientos] Error obteniendo:', err);
        res.status(500).json({ status: 'error', message: 'Error al obtener plan' });
    }
};

// POST /api/entrenamientos — Crear plan manual
exports.crear = async (req, res) => {
    try {
        const planData = req.body;

        // Generar token de acceso único
        planData.tokenAcceso = crypto.randomBytes(16).toString('hex');

        const plan = new Entrenamiento(planData);
        await plan.save();

        res.status(201).json({ status: 'ok', data: plan, message: 'Plan de entrenamiento creado exitosamente' });
    } catch (err) {
        console.error('[Entrenamientos] Error creando:', err);
        res.status(500).json({ status: 'error', message: 'Error al crear plan' });
    }
};

// PUT /api/entrenamientos/:id — Actualizar plan
exports.actualizar = async (req, res) => {
    try {
        const plan = await Entrenamiento.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });
        res.json({ status: 'ok', data: plan, message: 'Plan actualizado' });
    } catch (err) {
        console.error('[Entrenamientos] Error actualizando:', err);
        res.status(500).json({ status: 'error', message: 'Error al actualizar plan' });
    }
};

// DELETE /api/entrenamientos/:id — Soft delete
exports.eliminar = async (req, res) => {
    try {
        const plan = await Entrenamiento.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        );
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });
        res.json({ status: 'ok', message: 'Plan eliminado' });
    } catch (err) {
        console.error('[Entrenamientos] Error eliminando:', err);
        res.status(500).json({ status: 'error', message: 'Error al eliminar plan' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE ASIGNACIÓN AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Función interna reutilizable ──────────────────────────────────────────────
// Puede ser llamada desde otros controllers (ej: post-evaluación) sin pasar por HTTP
exports.autoAssignInternal = async (admisionId) => {
    // 1. Obtener la admisión con su test
    const admision = await Admision.findById(admisionId).lean();
    if (!admision) throw new Error('Admisión no encontrada');

    const test = await Test.findById(admision.testAsignado)
        .select('titulo rangosPuntaje preguntas escala')
        .lean();

    if (!test) throw new Error('Test no encontrado');

    const puntaje = parseFloat(admision.puntaje) || 0;

    // 2. Clasificar nivel general
    let nivelGeneral = 'medio';
    if (test.rangosPuntaje && test.rangosPuntaje.length > 0) {
        const rango = test.rangosPuntaje.find(r => puntaje >= r.min && puntaje <= r.max);
        if (rango) {
            const midPoint = (rango.max + rango.min) / 2;
            if (puntaje < midPoint * 0.6) nivelGeneral = 'bajo';
            else if (puntaje >= midPoint * 1.2) nivelGeneral = 'alto';
        }
    } else {
        if (puntaje < 40) nivelGeneral = 'bajo';
        else if (puntaje >= 70) nivelGeneral = 'alto';
    }

    // 3. Detectar dimensiones (de resultadosCompletos si existen)
    let dimensiones = [];
    if (admision.resultadosCompletos && Array.isArray(admision.resultadosCompletos)) {
        // Agrupar por categoría si existe, o por pregunta
        const categoriaMap = {};
        admision.resultadosCompletos.forEach(r => {
            const cat = r.categoria || r.preguntaTexto || r.textoPregunta || 'General';
            if (!categoriaMap[cat]) categoriaMap[cat] = { total: 0, max: 0, count: 0 };
            categoriaMap[cat].total += (r.puntaje || r.score || 0);
            categoriaMap[cat].max += (r.puntajeMaximo || r.maxScore || 5);
            categoriaMap[cat].count++;
        });

        dimensiones = Object.entries(categoriaMap).map(([nombre, data]) => {
            const pctDim = data.max > 0 ? (data.total / data.max) * 100 : 50;
            return {
                nombre,
                puntaje: Math.round(pctDim),
                nivel: pctDim < 40 ? 'bajo' : pctDim < 70 ? 'medio' : 'alto',
                sprintAsignado: null
            };
        });
    }

    // Si no hay dimensiones detalladas, crear una genérica
    if (dimensiones.length === 0) {
        dimensiones = [{
            nombre: 'Rendimiento General',
            puntaje: puntaje,
            nivel: nivelGeneral,
            sprintAsignado: null
        }];
    }

    // 4. Buscar sprint templates que coincidan
    const dimensionesDebiles = dimensiones
        .filter(d => d.nivel === 'bajo' || d.nivel === 'medio')
        .sort((a, b) => a.puntaje - b.puntaje);

    const templates = await SprintTemplate.find({ activo: true, isDeleted: false })
        .sort({ dificultad: 1 })
        .lean();

    // 5. Generar sprints (máx 8 semanas, 1 sprint por semana = Regla del Cuello de Botella)
    const sprints = [];
    const maxSemanas = Math.min(dimensionesDebiles.length * 2, 8);

    for (let semana = 1; semana <= maxSemanas; semana++) {
        const dimIndex = (semana - 1) % dimensionesDebiles.length;
        const dim = dimensionesDebiles[dimIndex];

        // Buscar template que coincida con la habilidad/nivel
        const template = templates.find(t =>
            t.habilidad.toLowerCase().includes(dim.nombre.toLowerCase().substring(0, 10)) &&
            t.nivelObjetivo === dim.nivel
        ) || templates.find(t =>
            t.nivelObjetivo === dim.nivel
        ) || templates[0] || null;

        if (dim) dim.sprintAsignado = template ? template._id.toString() : null;

        sprints.push({
            semana,
            habilidad: dim ? dim.nombre : 'General',
            sprintTemplateId: template ? template._id.toString() : null,
            estado: semana === 1 ? 'activo' : 'pendiente',
            diaInspiracion: {
                contenido: template ? template.contenidoInspiracion.contenido : '',
                tipo: template ? template.contenidoInspiracion.tipo : 'texto',
                completado: false
            },
            diaMicroAccion: {
                instruccion: template ? template.microAccion.instruccion : '',
                completado: false
            },
            diaCheckIn: {
                respuesta: null
            }
        });
    }

    // 6. Crear el plan
    const nombreCandidato = admision.nombreCandidato ||
        (admision.datosFormulario && admision.datosFormulario.nombre) ||
        `${admision.nombre || ''} ${admision.apellido || ''}`.trim() ||
        'Participante';

    const plan = new Entrenamiento({
        candidatoId: admisionId,
        candidatoNombre: nombreCandidato,
        candidatoEmail: admision.correo || '',
        origenTipo: 'test',
        origenId: admision.testAsignado,
        origenNombre: test.titulo || 'Instrumento',
        puntajeBase: puntaje,
        dimensionesDetectadas: dimensiones,
        sprints,
        estado: 'activo',
        progreso: 0,
        tokenAcceso: crypto.randomBytes(16).toString('hex')
    });

    await plan.save();
    console.log(`[Entrenamientos] Auto-assign: Plan generado con ${sprints.length} sprints para ${nombreCandidato} (admision: ${admisionId})`);
    return plan;
};

// POST /api/entrenamientos/auto-assign — Wrapper HTTP del motor de asignación
exports.autoAssign = async (req, res) => {
    try {
        const { admisionId } = req.body;
        if (!admisionId) {
            return res.status(400).json({ status: 'error', message: 'Se requiere admisionId' });
        }

        const plan = await exports.autoAssignInternal(admisionId);

        res.status(201).json({
            status: 'ok',
            data: plan,
            message: `Plan generado con ${plan.sprints.length} sprints para ${plan.candidatoNombre}`
        });
    } catch (err) {
        console.error('[Entrenamientos] Error en auto-assign:', err);
        const status = err.message.includes('no encontrad') ? 404 : 500;
        res.status(status).json({ status: 'error', message: err.message || 'Error en asignación automática' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACCIONES DEL USUARIO
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/entrenamientos/:id/emocional — Registrar termómetro emocional
exports.registrarEmocional = async (req, res) => {
    try {
        const { nivel, emocion, pensamiento, contexto } = req.body;
        const plan = await Entrenamiento.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $push: {
                    registrosEmocionales: {
                        fecha: new Date(),
                        nivel: parseInt(nivel) || 5,
                        emocion: emocion || '',
                        pensamiento: pensamiento || '',
                        contexto: contexto || ''
                    }
                }
            },
            { new: true }
        );
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });
        res.json({ status: 'ok', message: 'Registro emocional guardado' });
    } catch (err) {
        console.error('[Entrenamientos] Error registro emocional:', err);
        res.status(500).json({ status: 'error', message: 'Error al registrar' });
    }
};

// POST /api/entrenamientos/:id/checkin — Check-in de sprint
exports.checkIn = async (req, res) => {
    try {
        const { semana, respuesta, completarMicroAccion, completarInspiracion } = req.body;
        const plan = await Entrenamiento.findOne({ _id: req.params.id, isDeleted: false });
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });

        const sprint = plan.sprints.find(s => s.semana === semana);
        if (!sprint) return res.status(404).json({ status: 'error', message: 'Sprint no encontrado' });

        // Actualizar según lo que se envíe
        if (respuesta) {
            sprint.diaCheckIn.respuesta = respuesta;
            sprint.diaCheckIn.fechaCompletado = new Date();
        }
        if (completarMicroAccion) {
            sprint.diaMicroAccion.completado = true;
            sprint.diaMicroAccion.fechaCompletado = new Date();
        }
        if (completarInspiracion) {
            sprint.diaInspiracion.completado = true;
            sprint.diaInspiracion.fechaCompletado = new Date();
        }

        // Verificar si el sprint está completado (los 3 días hechos)
        if (sprint.diaInspiracion.completado && sprint.diaMicroAccion.completado && sprint.diaCheckIn.respuesta) {
            sprint.estado = 'completado';
            sprint.fechaFin = new Date();

            // Activar siguiente sprint pendiente
            const siguiente = plan.sprints.find(s => s.estado === 'pendiente');
            if (siguiente) {
                siguiente.estado = 'activo';
                siguiente.fechaInicio = new Date();
            }
        }

        // Recalcular progreso
        const totalSprints = plan.sprints.length;
        const completados = plan.sprints.filter(s => s.estado === 'completado').length;
        plan.progreso = totalSprints > 0 ? Math.round((completados / totalSprints) * 100) : 0;

        // Si todos completados, marcar plan como completado
        if (completados === totalSprints) {
            plan.estado = 'completado';
        }

        // Reset semanas ignoradas (usuario interactuó)
        plan.semanasIgnoradas = 0;

        await plan.save();
        res.json({ status: 'ok', data: plan, message: 'Check-in registrado' });
    } catch (err) {
        console.error('[Entrenamientos] Error check-in:', err);
        res.status(500).json({ status: 'error', message: 'Error en check-in' });
    }
};

// POST /api/entrenamientos/:id/victoria — Registrar victoria
exports.registrarVictoria = async (req, res) => {
    try {
        const { descripcion } = req.body;
        const plan = await Entrenamiento.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $push: {
                    victorias: { fecha: new Date(), descripcion: descripcion || '' }
                }
            },
            { new: true }
        );
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });
        res.json({ status: 'ok', message: '¡Victoria registrada!' });
    } catch (err) {
        console.error('[Entrenamientos] Error victoria:', err);
        res.status(500).json({ status: 'error', message: 'Error al registrar victoria' });
    }
};

// GET /api/entrenamientos/:id/progreso — Dashboard Antigravity data
exports.obtenerProgreso = async (req, res) => {
    try {
        const plan = await Entrenamiento.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado' });

        // Calcular métricas
        const totalSprints = plan.sprints.length;
        const completados = plan.sprints.filter(s => s.estado === 'completado').length;
        const sprintActivo = plan.sprints.find(s => s.estado === 'activo');

        // Tendencia emocional (últimos 30 registros)
        const ultimosRegistros = (plan.registrosEmocionales || [])
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 30)
            .reverse();

        const promedioEmocional = ultimosRegistros.length > 0
            ? Math.round(ultimosRegistros.reduce((s, r) => s + r.nivel, 0) / ultimosRegistros.length * 10) / 10
            : null;

        res.json({
            status: 'ok',
            data: {
                progreso: plan.progreso,
                estado: plan.estado,
                totalSprints,
                sprintsCompletados: completados,
                sprintActivo: sprintActivo ? {
                    semana: sprintActivo.semana,
                    habilidad: sprintActivo.habilidad,
                    diaInspiracionCompletado: sprintActivo.diaInspiracion.completado,
                    diaMicroAccionCompletado: sprintActivo.diaMicroAccion.completado,
                    diaCheckInCompletado: !!sprintActivo.diaCheckIn.respuesta
                } : null,
                tendenciaEmocional: ultimosRegistros.map(r => ({
                    fecha: r.fecha,
                    nivel: r.nivel,
                    emocion: r.emocion
                })),
                promedioEmocional,
                totalVictorias: (plan.victorias || []).length,
                totalReconocimientos: (plan.reconocimientos || []).length,
                dimensiones: plan.dimensionesDetectadas
            }
        });
    } catch (err) {
        console.error('[Entrenamientos] Error progreso:', err);
        res.status(500).json({ status: 'error', message: 'Error al obtener progreso' });
    }
};

// GET /api/entrenamientos/public/:token — Acceso público del candidato
exports.accesoPublico = async (req, res) => {
    try {
        const plan = await Entrenamiento.findOne({
            tokenAcceso: req.params.token,
            isDeleted: false
        }).lean();
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan no encontrado o enlace expirado' });
        res.json({ status: 'ok', data: plan });
    } catch (err) {
        console.error('[Entrenamientos] Error acceso público:', err);
        res.status(500).json({ status: 'error', message: 'Error al acceder al plan' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT TEMPLATES — CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/entrenamientos/templates/all
exports.listarTemplates = async (req, res) => {
    try {
        const templates = await SprintTemplate.find({ isDeleted: false })
            .sort({ habilidad: 1, dificultad: 1 })
            .lean();
        res.json({ status: 'ok', data: templates });
    } catch (err) {
        console.error('[SprintTemplates] Error listando:', err);
        res.status(500).json({ status: 'error', message: 'Error al obtener templates' });
    }
};

// POST /api/entrenamientos/templates
exports.crearTemplate = async (req, res) => {
    try {
        const template = new SprintTemplate(req.body);
        await template.save();
        res.status(201).json({ status: 'ok', data: template, message: 'Sprint template creado' });
    } catch (err) {
        console.error('[SprintTemplates] Error creando:', err);
        res.status(500).json({ status: 'error', message: 'Error al crear template' });
    }
};

// PUT /api/entrenamientos/templates/:id
exports.actualizarTemplate = async (req, res) => {
    try {
        const template = await SprintTemplate.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!template) return res.status(404).json({ status: 'error', message: 'Template no encontrado' });
        res.json({ status: 'ok', data: template, message: 'Template actualizado' });
    } catch (err) {
        console.error('[SprintTemplates] Error actualizando:', err);
        res.status(500).json({ status: 'error', message: 'Error al actualizar template' });
    }
};

// DELETE /api/entrenamientos/templates/:id
exports.eliminarTemplate = async (req, res) => {
    try {
        const template = await SprintTemplate.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        );
        if (!template) return res.status(404).json({ status: 'error', message: 'Template no encontrado' });
        res.json({ status: 'ok', message: 'Template eliminado' });
    } catch (err) {
        console.error('[SprintTemplates] Error eliminando:', err);
        res.status(500).json({ status: 'error', message: 'Error al eliminar template' });
    }
};
