const mongoose = require('mongoose');

const GestorSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    usuario: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        default: ''
    },
    estado: {
        type: String,
        enum: ['Activo', 'Inactivo'],
        default: 'Activo'
    },
    role_id: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4, 5],
        default: 2
    },
    rol: {
        type: String
    },
    ultimoAcceso: {
        type: Date,
        default: Date.now
    },
    resetToken: {
        type: String,
        default: ''
    },
    resetTokenExpires: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Gestor', GestorSchema);
