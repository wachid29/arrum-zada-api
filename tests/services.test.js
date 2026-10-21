const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { feedbackService, healthService } = require('../src/services');

describe('Services Unit Tests', () => {
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
