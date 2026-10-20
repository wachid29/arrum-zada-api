const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { submissionLimiter } = require('../middlewares/rateLimiter');
const { validateFeedbackPayload, validateSubmissionsQuery } = require('../middlewares/validateInput');

// 1. Ambil daftar pertanyaan aktif (dipanggil oleh Frontend saat buka modal)
router.get('/questions', feedbackController.getQuestions);

// 2. Submit jawaban / masukan pengguna (dilindungi rate limiter anti-spam & validasi input anti-SQLi)
router.post('/', submissionLimiter, validateFeedbackPayload, feedbackController.submitFeedback);

// 3. Lihat rekap / daftar masukan yang masuk (internal / admin, dengan sanitasi query pagination)
router.get('/submissions', validateSubmissionsQuery, feedbackController.getSubmissions);

module.exports = router;


