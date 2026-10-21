/**
 * Request Logger Middleware
 * Mencatat log aktivitas setiap permintaan HTTP per endpoint:
 * - Timestamp permintaan
 * - HTTP Method (GET, POST, PUT, DELETE, dll.)
 * - Endpoint URL / path
 * - Status code HTTP
 * - Waktu respons / latensi (ms)
 * - Alamat IP klien
 */

function formatLogMessage({ timestamp, method, url, statusCode, duration, ip, statusText }) {
  const statusStr = statusText ? `[${statusText}]` : `${statusCode}`;
  return `[${timestamp}] [HTTP] ${method} ${url} ${statusStr} - ${duration}ms - IP: ${ip}`;
}

function requestLogger(req, res, next) {
  if (process.env.ENABLE_HTTP_LOGS === 'false') {
    return next();
  }

  const startTime = process.hrtime.bigint();
  const clientIp = req.ip || req.socket?.remoteAddress || '-';

  // Catat log saat respon HTTP selesai dikirim ke klien
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const duration = elapsedMs.toFixed(2);
    const statusCode = res.statusCode;

    const message = formatLogMessage({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      duration,
      ip: clientIp,
    });

    if (statusCode >= 500) {
      console.error(message);
    } else if (statusCode >= 400) {
      console.warn(message);
    } else {
      console.log(message);
    }
  });

  // Tangani kemungkinan koneksi ditutup/dibatalkan sebelum respon selesai ditulis
  res.on('close', () => {
    if (!res.writableEnded) {
      const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      const duration = elapsedMs.toFixed(2);
      const message = formatLogMessage({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode || 0,
        duration,
        ip: clientIp,
        statusText: 'CLOSED_PREMATURELY',
      });
      console.warn(message);
    }
  });

  next();
}

module.exports = {
  requestLogger,
  formatLogMessage,
};
