const express = require('express');
const router = express.Router();
const { feedbackController } = require('../controllers');
const { submissionLimiter } = require('../middlewares/rateLimiter');
const { validateFeedbackPayload, validateSubmissionsQuery } = require('../middlewares/validateInput');

// ====================================================================
// LIST ENDPOINTS: FEEDBACK & EVALUASI
// Base Path: /api/v1/arrum-zada/feedback
// ====================================================================

/**
 * 1. Ambil daftar pertanyaan aktif (dipanggil oleh Frontend saat buka modal survei)
 * GET /api/v1/arrum-zada/feedback/questions
 */
router.get('/questions', (req, res, next) => feedbackController.getQuestions(req, res, next));

/**
 * 2. Submit jawaban / masukan pengguna
 * Dilindungi rate limiter anti-spam & validasi input ketat anti-SQLi
 * POST /api/v1/arrum-zada/feedback
 */
router.post('/', submissionLimiter, validateFeedbackPayload, (req, res, next) => feedbackController.submitFeedback(req, res, next));

/**
 * 3. Lihat rekap / daftar masukan yang masuk (internal / reporting)
 * Dengan sanitasi query parameter & pagination
 * GET /api/v1/arrum-zada/feedback/submissions
 */
router.get('/submissions', validateSubmissionsQuery, (req, res, next) => feedbackController.getSubmissions(req, res, next));

module.exports = router;
