/**
 * ActuaYa — OT Backend Server
 * 
 * Express application entry point.
 * Mounts auth middleware, CORS, JSON parsing, and OT routes.
 */

import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import { createWorkOrderRoutes } from './routes/work-orders.js';

const PORT = process.env.PORT || 3500;

// ─── Initialize Database ───
const db = initDB();

// ─── Create Express App ───
const app = express();

// ─── Middleware ───
app.use(cors());
app.use(express.json());

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'actuaya-ot-backend',
    timestamp: new Date().toISOString(),
  });
});

// ─── Protected Routes ───
app.use('/api/ot', authMiddleware, createWorkOrderRoutes(db));

// ─── 404 Handler ───
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

// ─── Error Handler ───
app.use((err, _req, res, _next) => {
  console.error('❌ Error interno:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`\n🔧 ActuaYa OT Backend corriendo en http://localhost:${PORT}`);
  console.log(`   📋 API:    http://localhost:${PORT}/api/ot`);
  console.log(`   💚 Health: http://localhost:${PORT}/api/health\n`);
});

export { app, db };
