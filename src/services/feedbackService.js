const crypto = require('crypto');
const db = require('../config/db');
const { Submission } = require('../entities');
const { questionRepository, submissionRepository, answerRepository } = require('../repositories');
const { normalizeToLocalPhone } = require('../utils/phoneHelper');

/**
 * Service: Feedback
 * Menangani seluruh logika bisnis feedback: pembuatan ID, validasi bisnis,
 * pengelolaan transaksi database (ACID), dan orkestrasi repository.
 */
class FeedbackService {
  constructor() {
    const ttlMinutes = parseInt(process.env.QUESTIONS_CACHE_TTL_MINUTES || '60', 10);
    this.questionsCache = {
      data: null,
      lastFetched: 0,
      ttlMs: ttlMinutes * 60 * 1000, // In-memory cache TTL untuk pertanyaan survei (default: 60 menit)
    };
  }

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
   * Mengambil daftar seluruh pertanyaan survei aktif (dengan In-Memory Caching)
   * @param {{ forceRefresh?: boolean }} options
   * @returns {Promise<Array<Object>>}
   */
  async getQuestions({ forceRefresh = false } = {}) {
    const now = Date.now();

    // 1. Cache HIT: Langsung kembalikan dari RAM jika masih dalam masa TTL
    if (!forceRefresh && this.questionsCache.data && (now - this.questionsCache.lastFetched < this.questionsCache.ttlMs)) {
      return this.questionsCache.data;
    }

    // 2. Cache MISS / Expired: Ambil dari database PostgreSQL
    try {
      const questions = await questionRepository.findAllActive();
      const serialized = questions.map((q) => q.toJSON());

      this.questionsCache.data = serialized;
      this.questionsCache.lastFetched = now;

      return serialized;
    } catch (err) {
      // 3. Stale Fallback: Jika database sempat bermasalah namun ada cache sebelumnya, layani cache
      if (this.questionsCache.data) {
        console.warn('Menggunakan cache daftar pertanyaan akibat kendala kueri database:', err.message);
        return this.questionsCache.data;
      }
      throw err;
    }
  }

  /**
   * Mengosongkan cache pertanyaan (berguna untuk invalidasi instan saat admin mengubah pertanyaan)
   */
  clearQuestionsCache() {
    this.questionsCache.data = null;
    this.questionsCache.lastFetched = 0;
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
    // Normalisasi format nomor telepon responden ke format lokal diawali 08 (misal: +628... -> 08...)
    if (respondent && respondent.phoneNumber) {
      respondent.phoneNumber = normalizeToLocalPhone(respondent.phoneNumber);
    }

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
