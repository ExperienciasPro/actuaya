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
  // Accept token from header OR query param (needed for navigator.sendBeacon) OR request body
  let token = req.headers['x-auth-token'] || req.query.token || '';

  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        req.body = parsed;
      } catch (e) {
        // Not valid JSON string
      }
    }

    if (typeof req.body === 'object' && req.body !== null) {
      if (!token) {
        token = req.body.token || req.body.authToken || '';
      }
      // Remove token fields from req.body to avoid saving them as database keys
      delete req.body.token;
      delete req.body.authToken;
    }
  }

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
      const operations = [];

      for (const [dataKey, dataValue] of Object.entries(allData)) {
        if (!/^[a-zA-Z0-9_-]+$/.test(dataKey)) continue;
        savedKeys.push(dataKey);

        // ── MERGE para listas de usuarios (um_users) ──
        // En vez de sobreescribir, fusionar por ID para evitar pérdida
        // cuando múltiples navegadores sincronizan al mismo tiempo.
        if (dataKey === 'um_users' && Array.isArray(dataValue)) {
          const existing = await DataStore.findOne({ key: 'um_users' });
          const serverUsers = (existing && Array.isArray(existing.value)) ? existing.value : [];
          const mergedMap = new Map();
          // Primero los del servidor (base)
          for (const u of serverUsers) {
            if (u && u.id) mergedMap.set(u.id, u);
          }
          // Luego los del cliente (ganan si hay conflicto, excepto superadmin del servidor)
          for (const u of dataValue) {
            if (u && u.id) {
              const serverVersion = mergedMap.get(u.id);
              if (serverVersion && serverVersion.role === 'superadmin' && u.role !== 'superadmin') {
                continue; // No degradar superadmin
              }
              mergedMap.set(u.id, u);
            }
          }
          const mergedUsers = Array.from(mergedMap.values());
          operations.push({
            updateOne: {
              filter: { key: dataKey },
              update: { $set: { key: dataKey, value: mergedUsers, updatedAt: new Date() } },
              upsert: true,
            },
          });
          continue;
        }

        operations.push({
          updateOne: {
            filter: { key: dataKey },
            update: { $set: { key: dataKey, value: dataValue, updatedAt: new Date() } },
            upsert: true,
          },
        });
      }

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
    let valueToSave = req.body;
    if (key === 'um_users' && Array.isArray(req.body)) {
      const existing = await DataStore.findOne({ key: 'um_users' });
      const serverUsers = (existing && Array.isArray(existing.value)) ? existing.value : [];
      const mergedMap = new Map();
      for (const u of serverUsers) {
        if (u && u.id) mergedMap.set(u.id, u);
      }
      for (const u of req.body) {
        if (u && u.id) {
          const serverVersion = mergedMap.get(u.id);
          if (serverVersion && serverVersion.role === 'superadmin' && u.role !== 'superadmin') {
            continue; // No degradar superadmin
          }
          mergedMap.set(u.id, u);
        }
      }
      valueToSave = Array.from(mergedMap.values());
    }

    await DataStore.findOneAndUpdate(
      { key },
      { $set: { key, value: valueToSave, updatedAt: new Date() } },
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
