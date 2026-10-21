const { authService } = require('../services');
const { sendResponse } = require('../utils/responseHelper');

/**
 * Controller: Authentication
 * Lapisan HTTP Adapter untuk registrasi akun baru, login, dan autentikasi pegawai
 */
class AuthController {
  /**
   * POST /api/v1/auth/register
   * Mendaftarkan akun baru pegawai Pegadaian (Super Admin / Administrator)
   */
  async register(req, res) {
    try {
      const payload = req.cleanRegister || req.body;
      const result = await authService.register(payload);
      return sendResponse(
        res,
        201,
        'Registrasi akun pegawai PT Pegadaian berhasil!',
        result
      );
    } catch (error) {
      console.error('Error AuthController.register:', error.message);
      const statusCode = error.status || 500;
      return sendResponse(
        res,
        statusCode,
        error.message || 'Terjadi kesalahan server saat mendaftarkan akun.',
        null
      );
    }
  }

  /**
   * POST /api/v1/auth/login
   * Autentikasi dan login pengguna via Email kedinasan atau NIP
   */
  async login(req, res) {
    try {
      const credentials = req.cleanLogin || req.body;
      const result = await authService.login(credentials);
      return sendResponse(
        res,
        200,
        'Login berhasil. Selamat datang kembali di portal Arrum Zada!',
        result
      );
    } catch (error) {
      console.error('Error AuthController.login:', error.message);
      const statusCode = error.status || 500;
      return sendResponse(
        res,
        statusCode,
        error.message || 'Gagal melakukan autentikasi login.',
        null
      );
    }
  }

  /**
   * GET /api/v1/auth/me
   * Mengambil data profil pegawai yang sedang login (memerlukan token Bearer)
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const userProfile = await authService.getUserProfile(userId);
      return sendResponse(
        res,
        200,
        'Data profil pegawai berhasil diambil.',
        userProfile
      );
    } catch (error) {
      console.error('Error AuthController.getProfile:', error.message);
      const statusCode = error.status || 500;
      return sendResponse(
        res,
        statusCode,
        error.message || 'Terjadi kesalahan saat memuat profil pengguna.',
        null
      );
    }
  }
}

module.exports = new AuthController();
