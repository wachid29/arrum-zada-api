const express = require('express');
const router = express.Router();
const { healthController } = require('../controllers');

// ====================================================================
// LIST ENDPOINTS: SYSTEM HEALTH & OVERVIEW
// ====================================================================

/**
 * 1. Health check status koneksi database & kesiapan server
 * GET /health
 */
router.get('/health', (req, res, next) => healthController.getHealth(req, res, next));

/**
 * 2. Root API overview & katalog layanan
 * GET /
 */
router.get('/', (req, res, next) => healthController.getBaseInfo(req, res, next));

module.exports = router;
