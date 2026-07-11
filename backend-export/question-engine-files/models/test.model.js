const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
    // 1. Datos Generales
    nombre: { type: String, required: true },
    descripcion: { type: String },
    imagenCabecera: { type: String },
    plantillaSeleccionada: {
        type: String,
        enum: ['theme-default', 'theme-playful', 'theme-vibrant', 'theme-corporate', 'theme-elegant'],
        default: 'theme-default'
    },
    pantallaFinalSeleccionada: {
        type: String,
        enum: ['theme-default', 'theme-playful', 'theme-vibrant', 'theme-corporate', 'theme-elegant', 'theme-ultraminimal'],
        default: 'theme-corporate'
    },
    themeColor: { type: String, default: '#3B82F6' },
    pantallaFinal: {
        titulo: { type: String, default: '¡Evaluación completada!' },
        subtitulo: { type: String, default: 'Gracias por tu tiempo y dedicación' },
        mensaje: { type: String, default: 'Hemos registrado todas tus respuestas.' },
        mostrarPuntaje: { type: Boolean, default: true },
        mostrarBotonCompartir: { type: Boolean, default: false },
        mostrarFormularioEmail: { type: Boolean, default: false }
    },
    presentationMode: { type: String, enum: ['scroll', 'card'], default: 'scroll' },
    companyLogoUrl: { type: String, default: null },
    allowNavButtons: { type: Boolean, default: true },
    tiempoLimiteActivo: { type: Boolean, default: false },
    tiempoLimiteMinutos: { type: Number, default: 30 },
    mostrarReloj: { type: Boolean, default: true },
    animationStyle: { type: String, default: 'fade' },
    tipo: { type: String },
    formularioVinculado: { type: mongoose.Schema.Types.Mixed }, // String u ObjectId
    formularioActivo: { type: Boolean, default: false },
    formularioMomento: { type: String, enum: ['inicio', 'final'], default: 'inicio' },
    bateriaVinculada: { type: mongoose.Schema.Types.Mixed }, // String u ObjectId
    configuracion_arbol: { type: mongoose.Schema.Types.Mixed },
    requierePin: { type: Boolean, default: false },

    // 2. Preguntas (Array de Objetos)
    preguntas: [{
        id: { type: mongoose.Schema.Types.Mixed }, // Frontend-generated ID string
        textoPregunta: { type: String },
        tipo: { type: String },
        label: { type: String },
        inputType: { type: String },
        descripcion: { type: String, default: '' },
        opciones: [{ type: mongoose.Schema.Types.Mixed }], // Permite strings u objetos
        respuestasCorrectas: [{ type: mongoose.Schema.Types.Mixed }],
        puntaje: { type: Number, default: 0 },
        obligatoria: { type: Boolean, default: true },
        conditionalLogic: [{ type: mongoose.Schema.Types.Mixed }], // Frontend conditional rules
        reglasCondicionales: [{
            triggerValue: String,
            action: String,
            targetQuestionId: String
        }]
    }],

    // 3. Puntuación y Resultados
    evaluaTiempo: { type: Boolean, default: false },
    pesoTiempo: { type: Number, default: 0 },
    rangosPuntaje: [{
        min: { type: Number },
        max: { type: Number },
        resultadoAsociado: { type: String },
        descripcionResultado: { type: String, default: '' }
    }],
    metodosEntrega: [{
        type: String,
        enum: ['PDF', 'Link', 'Email', 'CertificadoQR', 'Graficos']
    }],

    estadoPublicacion: {
        type: String,
        enum: ['Borrador', 'Publicado', 'Desactivado'],
        default: 'Borrador'
    },

    // 5. Auditoria y Relaciones
    creado_por: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gestor'
    },
    colaboradores: [{
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestor' },
        permiso: { type: String, enum: ['ver', 'editar'], default: 'editar' }
    }],
    orden: { type: Number, default: 0 },

    // --- Soporte temporal/legacy para la anterior UI/Logica ---
    title: { type: String },
    description: { type: String },
    activo: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, {
    timestamps: true,
    collection: 'tests'
});

module.exports = mongoose.model('Test', TestSchema);
