const db = require('../config/db');

/**
 * Service: Health & Status
 * Memantau kondisi kesehatan koneksi server dan database PostgreSQL
 */
class HealthService {
  /**
   * Memeriksa konektivitas aktif ke database
   * @returns {Promise<{ status: string, timestamp: string, database: string, message: string, statusCode: number }>}
   */
  async checkHealth() {
    try {
      await db.query('SELECT 1');
      return {
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'Connected',
        message: 'Server dan database dalam kondisi normal (UP)',
        statusCode: 200,
      };
    } catch (err) {
      return {
        status: 'DEGRADED',
        timestamp: new Date().toISOString(),
        database: 'Disconnected',
        message: err.message || 'Database terputus atau mengalami gangguan (DEGRADED)',
        statusCode: 503,
      };
    }
  }

  /**
   * Mengembalikan metadata katalog endpoint API
   * @returns {Object}
   */
  getApiOverview() {
    return {
      name: 'Arrum Zada Feedback API',
      version: '1.0.0',
      description: 'API Layanan Pengumpulan Evaluasi & Feedback Simulasi Emas Haji Pegadaian',
      documentation: {
        swaggerUI: '/docs',
        alternative: '/api-docs',
      },
      security: {
        rateLimiting: 'Active (Global 100 req/15min, Submit 10 req/15min, Auth 20 req/15min)',
        cors: 'Whitelist & Dynamic Origin Validation Active',
        sqlInjectionProtection: 'Active (Parameterized Queries + Pattern Inspection + Input Sanitization)',
        authentication: 'JWT (JSON Web Token) with bcrypt password hashing',
        requestTimeout: '30s per-request timeout',
        requestLogger: 'Active per-endpoint request logging',
      },
      endpoints: {
        documentation: 'GET /docs',
        health: 'GET /health',
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        profile: 'GET /api/v1/auth/me',
        getGoldPrices: 'GET /api/v1/arrum-zada/gold-prices',
        getQuestions: 'GET /api/v1/arrum-zada/feedback/questions',
        submitFeedback: 'POST /api/v1/arrum-zada/feedback',
        getSubmissions: 'GET /api/v1/arrum-zada/feedback/submissions',
      },
    };
  }
}

module.exports = new HealthService();
