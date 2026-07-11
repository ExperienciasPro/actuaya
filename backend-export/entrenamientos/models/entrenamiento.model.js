const mongoose = require('mongoose');

// ─── Sub-schemas ───────────────────────────────────────────────────────────────

const DimensionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },       // "Tolerancia a la Frustración"
    puntaje: { type: Number, default: 0 },           // 35
    nivel: { type: String, enum: ['bajo', 'medio', 'alto'], default: 'medio' },
    sprintAsignado: { type: String, default: null }  // ref al sprint template id
}, { _id: false });

const ContenidoSprintSchema = new mongoose.Schema({
    contenido: { type: String, default: '' },
    tipo: { type: String, enum: ['audio', 'texto', 'visual'], default: 'texto' },
    completado: { type: Boolean, default: false },
    fechaCompletado: { type: Date, default: null }
}, { _id: false });

const MicroAccionSprintSchema = new mongoose.Schema({
    instruccion: { type: String, default: '' },
    completado: { type: Boolean, default: false },
    fechaCompletado: { type: Date, default: null }
}, { _id: false });

const CheckInSprintSchema = new mongoose.Schema({
    respuesta: { type: String, enum: ['si', 'intente', 'no', null], default: null },
    fechaCompletado: { type: Date, default: null }
}, { _id: false });

const SprintSchema = new mongoose.Schema({
    semana: { type: Number, required: true },
    habilidad: { type: String, required: true },
    sprintTemplateId: { type: String, default: null },
    estado: {
        type: String,
        enum: ['pendiente', 'activo', 'completado', 'omitido'],
        default: 'pendiente'
    },
    fechaInicio: { type: Date, default: null },
    fechaFin: { type: Date, default: null },
    diaInspiracion: { type: ContenidoSprintSchema, default: () => ({}) },
    diaMicroAccion: { type: MicroAccionSprintSchema, default: () => ({}) },
    diaCheckIn: { type: CheckInSprintSchema, default: () => ({}) }
}, { _id: true });

const RegistroEmocionalSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    nivel: { type: Number, min: 1, max: 10 },       // 1=tranquilo, 10=máximo estrés
    emocion: { type: String, default: '' },           // emoji o etiqueta
    pensamiento: { type: String, default: '' },       // texto libre (desahogo)
    contexto: { type: String, default: '' }            // "qué pasó"
}, { _id: true });

const ExperimentoConductualSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    prediccion: { type: String, default: '' },        // ¿Qué creo que pasará?
    realidad: { type: String, default: '' },           // ¿Qué pasó realmente?
    aprendizaje: { type: String, default: '' }         // ¿Qué aprendí?
}, { _id: true });

const VictoriaSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    descripcion: { type: String, default: '' }
}, { _id: true });

const ReconocimientoSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    de: { type: String, default: '' },
    para: { type: String, default: '' },
    mensaje: { type: String, default: '' }
}, { _id: true });

// ─── Main Schema ───────────────────────────────────────────────────────────────

const EntrenamientoSchema = new mongoose.Schema({
    // ── Vínculo con el candidato ──
    candidatoId: { type: String, default: null },         // ref Admision._id
    candidatoNombre: { type: String, required: true },
    candidatoEmail: { type: String, default: '' },

    // ── Origen (de dónde viene) ──
    origenTipo: {
        type: String,
        enum: ['test', 'bateria', 'manual'],
        default: 'manual'
    },
    origenId: { type: String, default: null },             // testId o bateriaId
    origenNombre: { type: String, default: '' },           // nombre del instrumento

    // ── Evaluación base ──
    puntajeBase: { type: Number, default: 0 },
    dimensionesDetectadas: [DimensionSchema],

    // ── Sprints (el corazón del entrenamiento) ──
    sprints: [SprintSchema],

    // ── Registros del usuario ──
    registrosEmocionales: [RegistroEmocionalSchema],
    experimentosConductuales: [ExperimentoConductualSchema],
    victorias: [VictoriaSchema],
    reconocimientos: [ReconocimientoSchema],

    // ── Estado y progreso ──
    estado: {
        type: String,
        enum: ['activo', 'pausado', 'completado'],
        default: 'activo'
    },
    progreso: { type: Number, default: 0, min: 0, max: 100 },
    semanasIgnoradas: { type: Number, default: 0 },

    // ── Acceso público ──
    tokenAcceso: { type: String, unique: true, sparse: true },

    // ── Soft delete ──
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, {
    timestamps: true
});

// ─── Indexes ───────────────────────────────────────────────────────────────────
EntrenamientoSchema.index({ candidatoEmail: 1 });
EntrenamientoSchema.index({ origenId: 1, origenTipo: 1 });
EntrenamientoSchema.index({ tokenAcceso: 1 });
EntrenamientoSchema.index({ estado: 1, isDeleted: 1 });

module.exports = mongoose.model('Entrenamiento', EntrenamientoSchema);
