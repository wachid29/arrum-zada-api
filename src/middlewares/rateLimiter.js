const { rateLimit } = require('express-rate-limit');
const { formatResponse } = require('../utils/responseHelper');

/**
 * 1. Global Rate Limiter untuk seluruh endpoint API
 * Membatasi maksimal 100 request per 15 menit per IP (dapat diatur via .env)
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 100,
  standardHeaders: 'draft-8', // Menyertakan header `RateLimit-*` standar
  legacyHeaders: false, // Nonaktifkan header legacy `X-RateLimit-*`
  statusCode: 429,
  message: formatResponse(
    429,
    'Terlalu banyak permintaan dari IP Anda (rate limit tercapai). Silakan coba lagi setelah 15 menit.',
    null
  ),
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * 2. Strict Rate Limiter untuk endpoint submission (POST feedback)
 * Mencegah bot spamming, brute-force form submit, atau DoS data submission
 * Membatasi maksimal 10 submisi per 15 menit per IP
 */
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: parseInt(process.env.RATE_LIMIT_SUBMIT_MAX, 10) || 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  message: formatResponse(
    429,
    'Pengiriman masukan dibatasi untuk mencegah spam. Anda telah mencapai batas maksimal (10 kali per 15 menit). Silakan coba lagi nanti.',
    null
  ),
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  globalLimiter,
  submissionLimiter,
};
