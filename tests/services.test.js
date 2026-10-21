const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { feedbackService, healthService } = require('../src/services');
const { normalizeToLocalPhone } = require('../src/utils/phoneHelper');
const db = require('../src/config/db');

describe('Services Unit Tests', () => {
  after(async () => {
    try {
      await db.pool.end();
    } catch {
      // ignore
    }
  });
  describe('PhoneHelper Utility', () => {
    it('should convert +62 to 08', () => {
      assert.equal(normalizeToLocalPhone('+6281234567890'), '081234567890');
      assert.equal(normalizeToLocalPhone('+62 812-3456-7890'), '081234567890');
    });

    it('should convert 62 to 08', () => {
      assert.equal(normalizeToLocalPhone('6281234567890'), '081234567890');
    });

    it('should keep existing 08 prefix intact', () => {
      assert.equal(normalizeToLocalPhone('081234567890'), '081234567890');
    });

    it('should handle empty or null values safely', () => {
      assert.equal(normalizeToLocalPhone(null), '');
      assert.equal(normalizeToLocalPhone(undefined), '');
      assert.equal(normalizeToLocalPhone(''), '');
    });
  });
  describe('FeedbackService', () => {
    it('generateSubmissionId should return valid FB-YYYYMM-XXXXXX format', () => {
      const id1 = feedbackService.generateSubmissionId();
      const id2 = feedbackService.generateSubmissionId();

      assert.match(id1, /^FB-\d{6}-[A-F0-9]{6}$/);
      assert.match(id2, /^FB-\d{6}-[A-F0-9]{6}$/);
      assert.notEqual(id1, id2);
    });

    it('submitFeedback should reject empty answers array', async () => {
      await assert.rejects(
        async () => {
          await feedbackService.submitFeedback({ respondent: {}, answers: [] });
        },
        {
          name: 'Error',
          message: 'Payload tidak valid: array answers wajib diisi minimal 1 jawaban',
          status: 400,
        }
      );
    });

    it('getQuestions should fetch and cache questions in memory', async () => {
      feedbackService.clearQuestionsCache();
      assert.equal(feedbackService.questionsCache.data, null);

      const q1 = await feedbackService.getQuestions();
      assert.ok(Array.isArray(q1));
      assert.ok(q1.length > 0);
      assert.equal(feedbackService.questionsCache.data, q1);

      // Panggilan kedua harus mengembalikan referensi objek yang sama dari cache RAM
      const q2 = await feedbackService.getQuestions();
      assert.equal(q2, q1);
    });

    it('clearQuestionsCache should invalidate cached questions', () => {
      feedbackService.clearQuestionsCache();
      assert.equal(feedbackService.questionsCache.data, null);
      assert.equal(feedbackService.questionsCache.lastFetched, 0);
    });
  });

  describe('HealthService', () => {
    it('getApiOverview should return system info and list of endpoints', () => {
      const overview = healthService.getApiOverview();

      assert.equal(overview.name, 'Arrum Zada Feedback API');
      assert.equal(overview.version, '1.0.0');
      assert.ok(overview.endpoints);
      assert.ok(overview.endpoints.getQuestions);
      assert.ok(overview.endpoints.submitFeedback);
      assert.ok(overview.endpoints.getSubmissions);
      assert.ok(overview.endpoints.health);
    });
  });
});
