const express = require('express');
const router = express.Router();
const feedbackRoutes = require('./feedbackRoutes');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const goldPriceRoutes = require('./goldPriceRoutes');

// ====================================================================
// MASTER ROUTES REGISTRY (LIST OF ALL ENDPOINTS)
// ====================================================================

// 1. Group Endpoints: Autentikasi Pegawai (Register & Login)
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/arrum-zada/auth', authRoutes);

// 2. Group Endpoints: Integrasi Harga Emas Galeri 24
router.use('/api/v1/arrum-zada/gold-prices', goldPriceRoutes);
router.use('/api/v1/gold-prices', goldPriceRoutes);

// 3. Group Endpoints: Feedback & Evaluasi Kuesioner
router.use('/api/v1/arrum-zada/feedback', feedbackRoutes);

// 4. Group Endpoints: System Health & Base Catalog
router.use('/', healthRoutes);

module.exports = router;
