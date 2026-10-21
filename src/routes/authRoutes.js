const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { validateRegisterPayload, validateLoginPayload } = require('../middlewares/validateInput');
const { authLimiter } = require('../middlewares/rateLimiter');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ====================================================================
// LIST ENDPOINTS: AUTENTIKASI & MANAJEMEN PEGAWAI PT PEGADAIAN
// ====================================================================

/**
 * 1. Registrasi Akun Pegawai Baru
 * POST /api/v1/auth/register
 */
router.post(
  '/register',
  authLimiter,
  validateRegisterPayload,
  (req, res, next) => authController.register(req, res, next)
);

/**
 * 2. Login Pegawai via Email Kedinasan atau NIP
 * POST /api/v1/auth/login
 */
router.post(
  '/login',
  authLimiter,
  validateLoginPayload,
  (req, res, next) => authController.login(req, res, next)
);

/**
 * 3. Ambil Profil Pegawai Aktif (Protected Route)
 * GET /api/v1/auth/me
 */
router.get(
  '/me',
  authenticateToken,
  (req, res, next) => authController.getProfile(req, res, next)
);

module.exports = router;
