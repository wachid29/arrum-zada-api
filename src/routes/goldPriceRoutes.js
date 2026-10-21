const express = require('express');
const router = express.Router();
const { goldPriceController } = require('../controllers');

// ====================================================================
// LIST ENDPOINTS: HARGA EMAS HARIAN (GALERI 24 INTEGRATION)
// Base Path: /api/v1/arrum-zada/gold-prices
// ====================================================================

/**
 * 1. Ambil data harga emas harian
 * GET /api/v1/arrum-zada/gold-prices
 */
router.get('/', (req, res, next) => goldPriceController.getDailyPrices(req, res, next));

/**
 * 2. Alias spesifik daily-update sesuai endpoint Galeri 24
 * GET /api/v1/arrum-zada/gold-prices/daily-update
 */
router.get('/daily-update', (req, res, next) => goldPriceController.getDailyPrices(req, res, next));

module.exports = router;
