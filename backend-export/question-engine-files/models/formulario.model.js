const mongoose = require('mongoose');

const CampoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        required: true
    },
    obligatorio: {
        type: Boolean,
        default: false
    }
});

const FormularioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        default: ''
    },
    esPlantilla: {
        type: Boolean,
        default: false
    },
    campos: [CampoSchema],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Formulario', FormularioSchema);
