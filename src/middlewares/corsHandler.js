const cors = require('cors');

/**
 * Daftar default origin yang diizinkan:
 * - Domain GitHub Pages produksi frontend Arrum Zada
 * - Domain local development (Express, Vite, Create-React-App, Live Server)
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://ifatich.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
];

// Baca daftar origin dari variabel lingkungan (.env)
const envConfig = process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '';
const configuredOrigins = envConfig
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
const isWildcardAllowed = allowedOrigins.includes('*');

/**
 * Dynamic CORS Middleware:
 * Otomatis mengizinkan:
 * 1. Request tanpa Origin header (Postman, curl, server-to-server)
 * 2. Wildcard jika dikonfigurasi '*'
 * 3. Same-origin (Request dari host/domain VPS tempat Swagger UI berjalan)
 * 4. Origin yang terdaftar pada Whitelist (.env atau default)
 */
const corsMiddleware = (req, res, next) => {
  const currentHost = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const sameOrigin = `${protocol}://${currentHost}`.replace(/\/$/, '');

  const dynamicCors = cors({
    origin: (origin, callback) => {
      // 1. Izinkan request tanpa Origin header
      if (!origin) {
        return callback(null, true);
      }

      // 2. Jika wildcard '*' diizinkan
      if (isWildcardAllowed) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      // 3. Otomatis izinkan Same-Origin (misal Swagger UI dibuka langsung di browser pada IP/domain VPS)
      if (
        normalizedOrigin === sameOrigin ||
        (currentHost && normalizedOrigin.endsWith(currentHost))
      ) {
        return callback(null, true);
      }

      // 4. Periksa apakah origin terdaftar di whitelist
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '');
        return normalizedOrigin === normalizedAllowed;
      });

      if (isAllowed) {
        return callback(null, true);
      } else {
        const error = new Error(`Akses diblokir: Origin '${origin}' tidak terdaftar pada kebijakan CORS API.`);
        error.status = 403;
        error.isCorsError = true;
        return callback(error);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 jam preflight cache
  });

  return dynamicCors(req, res, next);
};

module.exports = {
  corsMiddleware,
  allowedOrigins,
};
