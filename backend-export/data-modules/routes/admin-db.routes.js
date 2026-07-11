const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * GET /api/admin/db-dump
 * Exporta TODAS las colecciones de la BD como JSON
 */
router.get('/db-dump', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collectionsCursor = await db.listCollections().toArray();
        const collections = {};

        for (const col of collectionsCursor) {
            const name = col.name;
            const docs = await db.collection(name).find({}).toArray();
            collections[name] = docs;
            console.log(`📦 Exportando ${name}: ${docs.length} documentos`);
        }

        res.json({
            success: true,
            dbName: db.databaseName,
            collections,
            exportDate: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error en db-dump:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/db-import
 * Importa colecciones desde JSON. 
 * Body: { collections: { "nombre_coleccion": [ docs... ], ... } }
 */
router.post('/db-import', express.json({ limit: '200mb' }), async (req, res) => {
    try {
        const { collections } = req.body;
        if (!collections || typeof collections !== 'object') {
            return res.status(400).json({ success: false, message: 'Body debe contener { collections: { ... } }' });
        }

        const db = mongoose.connection.db;
        const summary = {};

        for (const [colName, docs] of Object.entries(collections)) {
            if (!Array.isArray(docs) || docs.length === 0) {
                summary[colName] = 0;
                continue;
            }

            // Clean _id fields to avoid ObjectId casting issues
            const cleanDocs = docs.map(doc => {
                const clean = { ...doc };
                // Convert string _id back to ObjectId if possible
                if (clean._id && typeof clean._id === 'string') {
                    try {
                        clean._id = new mongoose.Types.ObjectId(clean._id);
                    } catch {
                        // Keep as string if not valid ObjectId
                    }
                }
                return clean;
            });

            // Drop existing collection to avoid duplicates
            try {
                await db.collection(colName).drop();
                console.log(`🗑️  Dropped existente: ${colName}`);
            } catch {
                // Collection doesn't exist yet, that's fine
            }

            // Insert documents
            await db.collection(colName).insertMany(cleanDocs, { ordered: false });
            summary[colName] = cleanDocs.length;
            console.log(`✅ Importado ${colName}: ${cleanDocs.length} documentos`);
        }

        res.json({
            success: true,
            summary,
            importDate: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error en db-import:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/admin/migrate-users
 * Sincroniza los usuarios de la colección Suscriptor (Públicos) a Gestor para que sean visibles y puedan iniciar sesión.
 */
router.get('/migrate-users', async (req, res) => {
    try {
        const Suscriptor = require('../models/suscriptor.model');
        const Gestor = require('../models/gestor.model');

        const suscriptores = await Suscriptor.find();
        let migrated = 0;
        let skipped = 0;

        for (const sub of suscriptores) {
            const exists = await Gestor.findOne({ email: sub.email.toLowerCase() });
            if (!exists) {
                await Gestor.create({
                    nombre: sub.nombre,
                    email: sub.email.toLowerCase(),
                    password: 'testea_user_123', // Pass temporal por seguridad al migrar (luego usan reset password)
                    role_id: 4,
                    rol: 'Suscriptor',
                    estado: 'Activo'
                });
                migrated++;
            } else {
                skipped++;
            }
        }

        res.json({
            success: true,
            message: `Migración completada. Nuevos sincronizados: ${migrated}. Ya existían: ${skipped}.`
        });
    } catch (err) {
        console.error('Error en migrate-users:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
