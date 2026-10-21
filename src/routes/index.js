const express = require('express');
const router = express.Router();
const feedbackRoutes = require('./feedbackRoutes');
const healthRoutes = require('./healthRoutes');

// ====================================================================
// MASTER ROUTES REGISTRY (LIST OF ALL ENDPOINTS)
// ====================================================================

// 1. Group Endpoints: Feedback & Evaluasi Kuesioner
router.use('/api/v1/arrum-zada/feedback', feedbackRoutes);

// 2. Group Endpoints: System Health & Base Catalog
router.use('/', healthRoutes);

module.exports = router;
