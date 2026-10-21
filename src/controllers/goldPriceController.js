const { goldPriceService } = require('../services');
const { sendResponse } = require('../utils/responseHelper');

/**
 * Controller: Gold Price
 * Adapter HTTP untuk menyajikan data harga emas Galeri 24 kepada frontend simulasi Arrum Zada
 */
class GoldPriceController {
  /**
   * GET /api/v1/arrum-zada/gold-prices/daily-update
   * Mengambil data harga emas harian terkini (Galeri 24, Antam, UBS, dsb.)
   */
  async getDailyPrices(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const prices = await goldPriceService.getDailyPrices({ forceRefresh });

      return sendResponse(
        res,
        200,
        'Data harga emas harian berhasil diambil dari Galeri 24',
        prices
      );
    } catch (error) {
      console.error('Error GoldPriceController.getDailyPrices:', error.message);
      const statusCode = error.status || 500;
      return sendResponse(
        res,
        statusCode,
        error.message || 'Terjadi kesalahan saat mengambil data harga emas harian.',
        null
      );
    }
  }
}

module.exports = new GoldPriceController();
