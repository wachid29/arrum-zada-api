const { authService } = require('../services');
const { sendResponse } = require('../utils/responseHelper');

/**
 * Middleware: Autentikasi JWT Bearer Token
 * Memverifikasi validitas token pada header Authorization
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return sendResponse(res, 401, 'Akses ditolak: Header Authorization dengan format Bearer <token> wajib disertakan.', null);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return sendResponse(res, 401, 'Format token tidak valid. Gunakan format "Bearer <token>".', null);
  }

  const token = parts[1];

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendResponse(res, 401, 'Sesi login telah kedaluwarsa. Silakan login kembali.', null);
    }
    return sendResponse(res, 401, 'Token autentikasi tidak valid atau telah dimodifikasi.', null);
  }
}

/**
 * Middleware: Otorisasi Role Pegawai
 * @param {Array<string>} allowedRoles
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendResponse(
        res,
        403,
        `Akses ditolak: Hanya pengguna dengan peran [${allowedRoles.join(', ')}] yang dapat mengakses sumber daya ini.`,
        null
      );
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};
