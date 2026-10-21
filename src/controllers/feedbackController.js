const { feedbackService } = require('../services');
const { sendResponse, sendPaginatedResponse } = require('../utils/responseHelper');

/**
 * Controller: Feedback
 * Lapisan HTTP Adapter: mengekstrak data dari request, memanggil service bisnis logika,
 * dan mengirim respon HTTP terstandarisasi.
 */
class FeedbackController {
  /**
   * GET /api/v1/arrum-zada/feedback/questions
   * Mengambil daftar pertanyaan aktif untuk ditampilkan di formulir Frontend
   */
  async getQuestions(req, res) {
    try {
      const data = await feedbackService.getQuestions();
      return sendResponse(res, 200, 'Daftar pertanyaan feedback berhasil diambil', data);
    } catch (error) {
      console.error('Error getQuestions:', error);
      const statusCode = error.status || 500;
      return sendResponse(res, statusCode, error.message || 'Terjadi kesalahan server saat mengambil pertanyaan', null);
    }
  }

  /**
   * POST /api/v1/arrum-zada/feedback
   * Menyimpan masukan responden dan jawaban survei
   */
  async submitFeedback(req, res) {
    try {
      // Ambil data yang telah divalidasi dan disanitasi oleh middleware
      const payload = req.cleanData || req.body;
      const clientInfo = {
        userAgent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
      };

      const result = await feedbackService.submitFeedback(payload, clientInfo);

      return sendResponse(res, 201, 'Terima kasih atas masukan dan evaluasi Anda untuk Arrum Zada!', result);
    } catch (error) {
      console.error('Error submitFeedback:', error);
      const statusCode = error.status || 500;
      return sendResponse(res, statusCode, error.message || 'Gagal menyimpan masukan feedback ke dalam database.', null);
    }
  }

  /**
   * GET /api/v1/arrum-zada/feedback/submissions
   * Mengambil rekap masukan dengan paginasi
   */
  async getSubmissions(req, res) {
    try {
      const limit = req.cleanQuery?.limit || Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
      const offset = req.cleanQuery?.offset || 0;
      const page = req.cleanQuery?.page || 1;

      const { items, pagination } = await feedbackService.getSubmissions({ page, limit, offset });

      return sendPaginatedResponse(res, 200, 'Daftar data submission berhasil diambil', items, pagination);
    } catch (error) {
      console.error('Error getSubmissions:', error);
      const statusCode = error.status || 500;
      return sendResponse(res, statusCode, error.message || 'Terjadi kesalahan saat mengambil data submission', null);
    }
  }
}

module.exports = new FeedbackController();
