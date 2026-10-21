const crypto = require('crypto');
const db = require('../config/db');
const { Submission } = require('../entities');
const { questionRepository, submissionRepository, answerRepository } = require('../repositories');

/**
 * Service: Feedback
 * Menangani seluruh logika bisnis feedback: pembuatan ID, validasi bisnis,
 * pengelolaan transaksi database (ACID), dan orkestrasi repository.
 */
class FeedbackService {
  /**
   * Menghasilkan ID unik yang mudah dibaca manusia (Contoh: FB-202610-A9F82C)
   * @returns {string}
   */
  generateSubmissionId() {
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `FB-${dateStr}-${randomHex}`;
  }

  /**
   * Mengambil daftar seluruh pertanyaan survei aktif
   * @returns {Promise<Array<Object>>}
   */
  async getQuestions() {
    const questions = await questionRepository.findAllActive();
    return questions.map((q) => q.toJSON());
  }

  /**
   * Menyimpan masukan responden dan seluruh jawaban kuesioner secara atomik
   * @param {{ respondent: Object, answers: Array }} payload
   * @param {{ userAgent: string, ipAddress: string }} clientInfo
   * @returns {Promise<{ submissionId: string, submittedAt: string }>}
   */
  async submitFeedback({ respondent, answers }, clientInfo = {}) {
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      const error = new Error('Payload tidak valid: array answers wajib diisi minimal 1 jawaban');
      error.status = 400;
      throw error;
    }

    const submissionId = this.generateSubmissionId();
    const submission = Submission.create({
      id: submissionId,
      respondent,
      clientInfo,
      answers,
    });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Simpan data induk submission
      const subResult = await submissionRepository.create(client, submission);

      // 2. Simpan seluruh butir jawaban
      await answerRepository.createMany(client, submissionId, answers);

      await client.query('COMMIT');

      return {
        submissionId: subResult.id,
        submittedAt: subResult.createdAt,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mengambil rekap masukan dengan perhitungan paginasi
   * @param {{ page: number, limit: number, offset: number }} options
   * @returns {Promise<{ items: Array, pagination: Object }>}
   */
  async getSubmissions({ page = 1, limit = 50, offset = 0 } = {}) {
    const totalRecords = await submissionRepository.countAll();
    const items = await submissionRepository.findAllWithAnswers({ limit, offset });
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }
}

module.exports = new FeedbackService();
