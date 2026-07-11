const mongoose = require('mongoose');

const suscriptorSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    usuario: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    acepta_legales: { type: Boolean, required: true },
    // Datos del formulario
    ocupacion: { type: String, default: '' },
    profesion: { type: String, default: '' },
    estudia: { type: String, default: '' },
    celular: { type: String, default: '' },
    pais_codigo: { type: String, default: '+57' },
    edad: { type: String, default: '' },
    // Datos automáticos de marketing
    pais_registro: { type: String, default: '' },
    ciudad_registro: { type: String, default: '' },
    ip_registro: { type: String, default: '' },
    navegador: { type: String, default: '' },
    plataforma: { type: String, default: '' },
    idioma: { type: String, default: '' },
    referrer: { type: String, default: '' },
    timezone: { type: String, default: '' },
    pantalla: { type: String, default: '' },
    // Campos para recuperación de contraseña
    resetToken: { type: String, default: '' },
    resetTokenExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Suscriptor', suscriptorSchema);
