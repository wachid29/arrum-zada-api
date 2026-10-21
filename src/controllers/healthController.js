const { healthService } = require('../services');
const { sendResponse } = require('../utils/responseHelper');

/**
 * Controller: Health & Status
 * Lapisan HTTP Adapter untuk pemantauan sistem dan endpoint ringkasan
 */
class HealthController {
  /**
   * GET /health
   * Memeriksa status kesehatan server dan koneksi database
   */
  async getHealth(req, res) {
    const health = await healthService.checkHealth();
    return sendResponse(res, health.statusCode, health.message, {
      status: health.status,
      timestamp: health.timestamp,
      database: health.database,
    });
  }

  /**
   * GET /
   * Informasi katalog endpoint dan status layanan API
   */
  getBaseInfo(req, res) {
    const info = healthService.getApiOverview();
    return sendResponse(res, 200, 'Layanan Arrum Zada Feedback API aktif', info);
  }
}

module.exports = new HealthController();
