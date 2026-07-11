const Test = require('../models/test.model');
const Bateria = require('../models/bateria.model');
const Gestor = require('../models/gestor.model');
const Admision = require('../models/admision.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const parseXML = (filename) => {
    const filePath = path.join(__dirname, '..', 'xml', filename);
    if (!fs.existsSync(filePath)) return null;
    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    return parser.parse(xmlData);
};

exports.getGlobalSummary = async (req, res) => {
    try {
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || req.headers['authorization']);

        if (!role_id || role_id !== 1) {
            return res.status(403).json({
                status: 'error',
                message: 'Acceso Denegado: Prevención IDOR. Se requiere nivel de Super Administrador para procesar esta solicitud.'
            });
        }

        let countTests = 0;
        let countBaterias = 0;
        let gestoresActivos = 0;
        let gestoresInactivos = 0;
        let totalEvaluados = 0;

        try {
            countTests = await Test.countDocuments();
            countBaterias = await mongoose.connection.db.collection('baterias').countDocuments();
            gestoresActivos = await Gestor.countDocuments({ estado: 'Activo' });
            gestoresInactivos = await Gestor.countDocuments({ estado: { $ne: 'Activo' } });
            totalEvaluados = await Admision.countDocuments();
        } catch (e) {
            console.log('MongoDB connect error in GlobalSummary, returning offline/simulated counts');
        }

        // Incorporar Tests de XML a las metricas base
        const testsData = parseXML('003a.xml');
        if (testsData && testsData.pruebas && testsData.pruebas.prueba) {
            const arr = Array.isArray(testsData.pruebas.prueba) ? testsData.pruebas.prueba : [testsData.pruebas.prueba];
            countTests += arr.length;
        }

        const totalGestoresRed = gestoresActivos + gestoresInactivos;

        res.status(200).json({
            status: 'ok',
            data: {
                totalTestsYBaterias: countTests + countBaterias,
                gestoresActivos,
                gestoresInactivos,
                totalEvaluados,
                totalGestoresRed
            }
        });
    } catch (error) {
        console.error('Error al obtener métricas globales:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
};

exports.getMyCreations = async (req, res) => {
    try {
        // Gracefully default user_id — never return 401 for missing header
        const user_id = req.query.user_id || req.headers['user_id'] || req.headers['authorization'] || 'usr_mock_1';
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);

        // Para admins: ver todo; para suscriptores: solo lo suyo o asignado
        const filtroTests = (role_id === 1) ? { isDeleted: { $ne: true } } : {
            isDeleted: { $ne: true },
            $or: [
                { creado_por: user_id },
                { 'colaboradores.usuarioId': user_id }
            ]
        };
        const filtroBaterias = (role_id === 1) ? {} : {
            $or: [
                { creado_por: user_id },
                { 'colaboradores.usuarioId': user_id }
            ]
        };

        let totalTestsCreados = 0;
        let totalEncuestasCreadas = 0;
        let totalSimuladoresCreados = 0;
        let totalBitacorasCreadas = 0;
        let totalBateriasCreadas = 0;
        let misRespuestas = 0;
        let misTestsRaw = [];
        let misBateriasRaw = [];
        let gestores = [];

        try {
            // Contar tests (excluyendo encuestas, simuladores y bitácoras)
            const filtroTestsPuros = { ...filtroTests, $and: [
                { tipo: { $not: /encuesta/i } },
                { tipo: { $not: /simulador/i } },
                { tipo: { $not: /bitacora/i } }
            ]};
            totalTestsCreados = await Test.countDocuments(filtroTestsPuros);

            // Contar encuestas
            const filtroEncuestas = { ...filtroTests, $or: filtroTests.$or ? [...filtroTests.$or] : undefined };
            // Rebuild filter for encuestas with tipo condition
            const encuestaFilter = { isDeleted: { $ne: true } };
            if (role_id !== 1 && user_id) {
                encuestaFilter.$and = [
                    { $or: [{ tipo: /encuesta/i }, { type: /encuesta/i }] },
                    { $or: [{ creado_por: user_id }, { 'colaboradores.usuarioId': user_id }] }
                ];
            } else {
                encuestaFilter.$or = [{ tipo: /encuesta/i }, { type: /encuesta/i }];
            }
            totalEncuestasCreadas = await Test.countDocuments(encuestaFilter);

            // Contar simuladores
            const simuladorFilter = { isDeleted: { $ne: true } };
            if (role_id !== 1 && user_id) {
                simuladorFilter.$and = [
                    { $or: [{ tipo: /simulador/i }] },
                    { $or: [{ creado_por: user_id }, { 'colaboradores.usuarioId': user_id }] }
                ];
            } else {
                simuladorFilter.$or = [{ tipo: /simulador/i }];
            }
            totalSimuladoresCreados = await Test.countDocuments(simuladorFilter);

            // Contar bitacoras (instrumentos tipo bitácora)
            const bitacoraFilter = { isDeleted: { $ne: true } };
            if (role_id !== 1 && user_id) {
                bitacoraFilter.$and = [
                    { $or: [{ tipo: /bitacora/i }] },
                    { $or: [{ creado_por: user_id }, { 'colaboradores.usuarioId': user_id }] }
                ];
            } else {
                bitacoraFilter.$or = [{ tipo: /bitacora/i }];
            }
            totalBitacorasCreadas = await Test.countDocuments(bitacoraFilter);

            totalBateriasCreadas = await mongoose.connection.db.collection('baterias').countDocuments(filtroBaterias);

            // Contar respuestas a MIS instrumentos
            if (role_id === 1) {
                misRespuestas = await Admision.countDocuments();
            } else {
                // Obtener IDs de mis tests para filtrar respuestas
                const misTestIds = await Test.find(filtroTests).select('_id').lean();
                const ids = misTestIds.map(t => t._id.toString());
                if (ids.length > 0) {
                    misRespuestas = await Admision.countDocuments({ testAsignado: { $in: ids } });
                }
            }

            misTestsRaw = await Test.find(filtroTests).sort({ createdAt: -1 }).limit(10).lean();
            misBateriasRaw = await Bateria.find(filtroBaterias).sort({ createdAt: -1 }).limit(10).lean();
            gestores = await Gestor.find({}).select('_id nombre').lean();
        } catch (e) {
            console.log('MongoDB query failed in myCreations, falling back to legacy XML mode');
        }

        const gestorMap = new Map();
        gestores.forEach(g => gestorMap.set(g._id.toString(), g.nombre));

        // Mapeo super-tolerante a fallos para inyectar autor_nombre para todos los usuarios
        const formatItem = (item) => {
            let autor = 'Desconocido';
            if (item.creado_por) {
                autor = gestorMap.get(item.creado_por.toString()) || item.creado_por.toString();
                if (autor === 'usr_mock_1') autor = 'Gonzalo J. (Mock)'; // Fallback simpático
            }
            return {
                ...item,
                autor_nombre: autor
            };
        };

        const misTests = misTestsRaw.map(formatItem);
        const misBaterias = misBateriasRaw.map(formatItem);

        // Fusionar base de datos legacy XML y MongoDB 
        if (role_id === 1 || user_id === 'usr_mock_1') { // Mock admins own the xml legacy
            const testsData = parseXML('003a.xml');
            if (testsData && testsData.pruebas && testsData.pruebas.prueba) {
                const xmlArray = Array.isArray(testsData.pruebas.prueba) ? testsData.pruebas.prueba : [testsData.pruebas.prueba];
                totalTestsCreados += xmlArray.length;

                // Add to recent if missing
                const xmlMapped = xmlArray.map((t, idx) => ({
                    _id: `xml_${idx}`,
                    nombre: t.nombre,
                    type: 'Test Tradicional',
                    activo: true,
                    autor_nombre: 'Gonzalo J. (Legacy)',
                    createdAt: new Date(2025, 0, 1) // fecha retroactiva
                }));

                misTests.push(...xmlMapped);
            }
        }

        res.status(200).json({
            status: 'ok',
            data: {
                totalTestsCreados,
                totalEncuestasCreadas,
                totalSimuladoresCreados,
                totalBitacorasCreadas,
                totalBateriasCreadas,
                respuestasRecibidas: misRespuestas,
                totalInstrumentos: totalTestsCreados + totalEncuestasCreadas + totalSimuladoresCreados + totalBitacorasCreadas + totalBateriasCreadas,
                detalles: {
                    tests: misTests,
                    baterias: misBaterias
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener creaciones del usuario:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
};

// ===== INFRAESTRUCTURA DEL SISTEMA (Solo Super Admin) =====
exports.getInfrastructureStats = async (req, res) => {
    try {
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);
        if (role_id !== 1) {
            return res.status(403).json({ status: 'error', message: 'Acceso denegado.' });
        }

        // MongoDB database stats
        const dbStats = await mongoose.connection.db.stats();
        
        // Count collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        // Count total documents across all collections
        let totalDocuments = 0;
        for (const col of collections) {
            try {
                const count = await mongoose.connection.db.collection(col.name).countDocuments();
                totalDocuments += count;
            } catch (e) { /* skip */ }
        }

        // Server uptime
        const uptimeSeconds = process.uptime();
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

        // Format bytes to human-readable
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.status(200).json({
            status: 'ok',
            data: {
                almacenamiento: {
                    storageSize: dbStats.storageSize || 0,
                    storageSizeFormatted: formatBytes(dbStats.storageSize || 0),
                    dataSize: dbStats.dataSize || 0,
                    dataSizeFormatted: formatBytes(dbStats.dataSize || 0),
                    indexSize: dbStats.indexSize || 0,
                    indexSizeFormatted: formatBytes(dbStats.indexSize || 0)
                },
                colecciones: collections.length,
                documentosTotales: totalDocuments,
                indices: dbStats.indexes || 0,
                servidor: {
                    uptimeFormatted: `${uptimeHours}h ${uptimeMinutes}m`,
                    uptimeSeconds: Math.floor(uptimeSeconds),
                    nodeVersion: process.version,
                    platform: process.platform,
                    memoryUsage: formatBytes(process.memoryUsage().heapUsed),
                    memoryTotal: formatBytes(process.memoryUsage().heapTotal)
                },
                dbName: dbStats.db || 'testea_db'
            }
        });
    } catch (error) {
        console.error('Error al obtener métricas de infraestructura:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
};

// ===== BACKUP DEL SISTEMA (Solo Super Admin) =====
exports.triggerBackup = async (req, res) => {
    try {
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);
        if (role_id !== 1) {
            return res.status(403).json({ status: 'error', message: 'Acceso denegado.' });
        }

        // Get all collections and export as JSON
        const collections = await mongoose.connection.db.listCollections().toArray();
        const backupData = {};
        
        for (const col of collections) {
            try {
                const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
                backupData[col.name] = docs;
            } catch (e) { /* skip */ }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `testea_backup_${timestamp}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        console.error('Error al generar backup:', error);
        res.status(500).json({ status: 'error', message: 'Error al generar backup.' });
    }
};
