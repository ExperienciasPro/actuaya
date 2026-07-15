/**
 * ActuaYa — Data API Routes (Express)
 *
 * Replaces api/data.php with Express + MongoDB.
 * Endpoints mirror the PHP API for seamless frontend migration:
 *
 *   GET  /api/data?key=subscriptions   → Read a single key
 *   POST /api/data?key=subscriptions   → Write a single key (body = JSON)
 *   GET  /api/data?key=_bulk           → Read ALL keys
 *   POST /api/data?key=_bulk           → Write ALL keys (body = { key: data, ... })
 */
const express = require('express');
const router = express.Router();
const DataStore = require('../models/data.model');

// ─── Auth Middleware ──────────────────────────
function authCheck(req, res, next) {
  // Accept token from header OR query param (needed for navigator.sendBeacon)
  const token = req.headers['x-auth-token'] || req.query.token || '';
  const expected = process.env.AUTH_TOKEN || 'um_api_2026';
  if (token !== expected) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

router.use(authCheck);

// ─── Validate key param ──────────────────────
function validateKey(req, res, next) {
  const key = req.query.key;
  if (!key) {
    return res.status(400).json({ error: 'Parámetro "key" es requerido' });
  }
  if (key !== '_bulk' && !/^[a-zA-Z0-9_-]+$/.test(key)) {
    return res.status(400).json({ error: 'Clave no válida' });
  }
  next();
}

router.use(validateKey);

// ═══════════════════════════════════════════════
// GET /api/data?key=...
// ═══════════════════════════════════════════════
router.get('/', async (req, res) => {
  const key = req.query.key;

  try {
    if (key === '_bulk') {
      // Return all documents as { key: value, ... }
      const docs = await DataStore.find({});
      const result = {};
      for (const doc of docs) {
        result[doc.key] = doc.value;
      }
      return res.json(result);
    }

    // Single key
    const doc = await DataStore.findOne({ key });
    return res.json(doc ? doc.value : []);
  } catch (err) {
    console.error('[Data API] GET error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════
// POST /api/data?key=...
// ═══════════════════════════════════════════════
router.post('/', async (req, res) => {
  const key = req.query.key;

  try {
    if (key === '_bulk') {
      // Bulk upsert
      const allData = req.body;
      if (!allData || typeof allData !== 'object') {
        return res.status(400).json({ error: 'JSON no válido, se espera un objeto' });
      }

      const savedKeys = [];
      const operations = Object.entries(allData).map(([dataKey, dataValue]) => {
        if (!/^[a-zA-Z0-9_-]+$/.test(dataKey)) return null;
        savedKeys.push(dataKey);
        return {
          updateOne: {
            filter: { key: dataKey },
            update: { $set: { key: dataKey, value: dataValue, updatedAt: new Date() } },
            upsert: true,
          },
        };
      }).filter(Boolean);

      if (operations.length > 0) {
        await DataStore.bulkWrite(operations);
      }

      return res.json({
        ok: true,
        savedKeys,
        count: savedKeys.length,
        savedAt: new Date().toISOString(),
      });
    }

    // Single key upsert
    await DataStore.findOneAndUpdate(
      { key },
      { $set: { key, value: req.body, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    return res.json({
      ok: true,
      key,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Data API] POST error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
