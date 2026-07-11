const mongoose = require('mongoose');

const AdmisionSchema = new mongoose.Schema({
    nombreCandidato: {
        type: String,
        required: true
    },
    correo: {
        type: String,
        required: true
    },
    testAsignado: {
        type: String,
        required: true
    },
    tokenUnico: {
        type: String,
        required: true,
        unique: true
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'En Curso', 'Finalizado'],
        default: 'Pendiente'
    },
    puntaje: {
        type: Number
    },
    // Campos para resultados de encuestas
    resultadosCompletos: {
        type: [mongoose.Schema.Types.Mixed],
        default: undefined
    },
    generoInfo: {
        type: String
    },
    anioNacimientoInfo: {
        type: String
    },
    fechaFinalizacion: {
        type: Date
    },
    tiempoTranscurrido: {
        type: Number
    },
    datosFormulario: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Admision', AdmisionSchema);
