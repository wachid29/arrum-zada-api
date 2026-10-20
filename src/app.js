const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swaggerDoc');
const feedbackRoutes = require('./routes/feedbackRoutes');
const db = require('./config/db');
const { corsMiddleware } = require('./middlewares/corsHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const sqlInjectionGuard = require('./middlewares/sqlInjectionGuard');

const app = express();

// Trust proxy (untuk reverse proxy seperti Nginx / Cloudflare / Load Balancer)
app.set('trust proxy', 1);

// 1. HTTP Security Headers via Helmet (nonaktifkan CSP agar Swagger UI render dengan lancar)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Dynamic CORS Origin Handling & Whitelist
app.use(corsMiddleware);

// 3. Brute-force & Abuse Protection (Global Rate Limiting)
app.use(globalLimiter);

// 4. Body Parsers dengan batasan payload aman
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. SQL Injection Pattern Guard (Defense-in-Depth untuk Query Params & URL Params)
app.use(sqlInjectionGuard);

// 6. Swagger Documentation UI mounted at /docs and /api-docs
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dokumentasi API Arrum Zada - Pegadaian',
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Health Check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'Connected',
    });
  } catch (err) {
    return res.status(503).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: err.message,
    });
  }
});

// Base Route
app.get('/', (req, res) => {
  res.json({
    name: 'Arrum Zada Feedback API',
    version: '1.0.0',
    description: 'API Layanan Pengumpulan Evaluasi & Feedback Simulasi Emas Haji Pegadaian',
    documentation: {
      swaggerUI: '/docs',
      alternative: '/api-docs',
    },
    security: {
      rateLimiting: 'Active (Global 100 req/15min, Submit 10 req/15min)',
      cors: 'Whitelist & Dynamic Origin Validation Active',
      sqlInjectionProtection: 'Active (Parameterized Queries + Pattern Inspection + Input Sanitization)',
    },
    endpoints: {
      documentation: 'GET /docs',
      health: 'GET /health',
      getQuestions: 'GET /api/v1/arrum-zada/feedback/questions',
      submitFeedback: 'POST /api/v1/arrum-zada/feedback',
      getSubmissions: 'GET /api/v1/arrum-zada/feedback/submissions',
    },
  });
});

// API Routes
app.use('/api/v1/arrum-zada/feedback', feedbackRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler (Termasuk Penanganan CORS Error)
app.use((err, req, res, next) => {
  if (err.isCorsError || err.status === 403) {
    return res.status(403).json({
      success: false,
      code: 'CORS_FORBIDDEN',
      message: err.message || 'Akses ditolak oleh kebijakan keamanan CORS.',
    });
  }

  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Terjadi kesalahan internal pada server',
  });
});

module.exports = app;

