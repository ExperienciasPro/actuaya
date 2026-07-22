/**
 * ActuaYa — Backend Server (Express 5 + MongoDB)
 *
 * Architecture: Two-tier deployment (Frontend SPA + Backend API)
 * - Express 5 with CORS, Helmet, Rate Limiting
 * - Mongoose connection to MongoDB local (Hostinger VPS)
 * - Routes mounted under /api
 * - PM2-managed in production
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ─────────────────────
app.use(helmet());
app.set('trust proxy', 1); // Trust first proxy (Nginx) — required for express-rate-limit behind reverse proxy

// ─── Rate Limiting ───────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,               // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
});
app.use(globalLimiter);

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,                // 30 writes per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas escrituras. Intenta de nuevo en un minuto.' },
});

// ─── CORS ────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN || 'https://www.actuaya.co',
  'https://actuaya.co',            // Sin www
  'https://www.actuaya.co',        // Con www
  'http://localhost:4200',   // Angular dev server
  'http://localhost:3000',   // Local testing
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, PM2 health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} no permitido`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── MongoDB Connection ──────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/actuaya_db';

mongoose.connect(MONGODB_URI, {})
  .then(() => console.log('✅ MongoDB conectada exitosamente.'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// ─── Routes ──────────────────────────────────
const apiRouter = express.Router();

// Health check
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ActuaYa Backend',
    message: `Express funcionando en puerto ${PORT}`,
    timestamp: new Date().toISOString(),
  });
});

// Data persistence (replaces data.php)
const dataRoutes = require('./routes/data.routes');
const authRoutes = require('./routes/auth.routes');
apiRouter.use('/data', writeLimiter, dataRoutes);
apiRouter.use('/auth', writeLimiter, authRoutes);

// Mount only under /api (HAL-07: removed duplicate root mount)
app.use('/api', apiRouter);

// ─── Start Server ────────────────────────────
// HAL-11: Bind to 127.0.0.1 so only Nginx can reach Express
const server = app.listen(PORT, '127.0.0.1');

server.on('listening', () => {
  console.log(`🚀 ActuaYa Backend corriendo en http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ ERROR CRÍTICO: El puerto ${PORT} ya está en uso.`);
    console.error('👉 Detén el otro servidor o cambia el puerto en .env.');
  } else {
    console.error('❌ ERROR al iniciar el servidor:', err);
  }
  process.exit(1);
});

// ─── Graceful Shutdown (HAL-12) ──────────────
function gracefulShutdown(signal) {
  console.log(`🛑 ${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('🔌 Servidor HTTP cerrado.');
    mongoose.connection.close(false).then(() => {
      console.log('✅ Conexión MongoDB cerrada. Saliendo.');
      process.exit(0);
    });
  });

  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('⚠️ Forzando cierre después de 10s.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
