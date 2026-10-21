const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { getDynamicSwaggerDoc } = require('./docs/swaggerDoc');
const routes = require('./routes');
const { corsMiddleware } = require('./middlewares/corsHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const sqlInjectionGuard = require('./middlewares/sqlInjectionGuard');
const { sendResponse } = require('./utils/responseHelper');

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

// 2. Dynamic CORS Origin Handling & Whitelist (Otomatis mengizinkan Same-Origin VPS)
app.use(corsMiddleware);

// 3. Brute-force & Abuse Protection (Global Rate Limiting)
app.use(globalLimiter);

// 4. Body Parsers dengan batasan payload aman
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. SQL Injection Pattern Guard (Defense-in-Depth untuk Query Params & URL Params)
app.use(sqlInjectionGuard);

// 6. Endpoint Spesifikasi OpenAPI JSON Dinamis (Mendeteksi Host VPS / Domain secara otomatis)
app.get(['/docs/json', '/api-docs/json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(getDynamicSwaggerDoc(req));
});

// 7. Swagger Documentation UI mounted at /docs and /api-docs
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dokumentasi API Arrum Zada - Pegadaian',
  swaggerUrl: '/docs/json', // Memuat spesifikasi dinamis dari server VPS/local aktif
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));


// 8. Register All API Routes (Endpoints for Feedback, Health Check, and Overview)
app.use('/', routes);

// 404 Handler
app.use((req, res) => {
  return sendResponse(res, 404, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`, null);
});

// Global Error Handler (Termasuk Penanganan CORS Error)
app.use((err, req, res, next) => {
  if (err.isCorsError || err.status === 403) {
    return sendResponse(res, 403, err.message || 'Akses ditolak oleh kebijakan keamanan CORS.', null);
  }

  console.error('Unhandled Error:', err);
  const statusCode = err.status || 500;
  return sendResponse(res, statusCode, err.message || 'Terjadi kesalahan internal pada server', null);
});

module.exports = app;

