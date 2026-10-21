const { sendResponse } = require('../utils/responseHelper');

/**
 * Middleware Request Timeout (Batas Waktu Permintaan HTTP)
 * Default: 30 detik (30000 ms) sesuai standar SLA aplikasi web & API.
 * 
 * Memutus pemrosesan request dan mengembalikan status HTTP 408 (Request Timeout)
 * jika durasi eksekusi request melebihi batas waktu yang ditentukan.
 */

const DEFAULT_TIMEOUT_MS = 30000; // 30 detik

function createTimeoutMiddleware(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return function requestTimeoutMiddleware(req, res, next) {
    const activeTimeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || timeoutMs;

    // Pasang socket timeout jika socket tersedia
    if (req.socket && typeof req.socket.setTimeout === 'function') {
      req.socket.setTimeout(activeTimeoutMs);
    }

    let timedOut = false;

    // Timer untuk membatasi durasi eksekusi request
    const timer = setTimeout(() => {
      timedOut = true;
      req.timedOut = true;

      if (!res.headersSent) {
        const clientIp = req.ip || req.socket?.remoteAddress || '-';
        const seconds = activeTimeoutMs / 1000;
        console.warn(
          `[TIMEOUT ALERT] Request melebihi batas waktu ${seconds} detik pada ${req.method} ${req.originalUrl || req.url} - IP: ${clientIp}`
        );

        sendResponse(
          res,
          408,
          `Permintaan waktu habis: Pemrosesan request melebihi batas waktu ${seconds} detik (Request Timeout).`,
          null
        );
      }
    }, activeTimeoutMs);

    // Mencegah error ERR_HTTP_HEADERS_SENT jika handler asinkron selesai belakangan setelah timeout
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    res.json = function (body) {
      if (res.headersSent) {
        return this;
      }
      return originalJson(body);
    };

    res.send = function (body) {
      if (res.headersSent) {
        return this;
      }
      return originalSend(body);
    };

    res.end = function (...args) {
      if (res.headersSent && res.writableEnded) {
        return this;
      }
      return originalEnd(...args);
    };

    // Bersihkan timer saat respon selesai dikirim atau koneksi ditutup
    const cleanup = () => {
      clearTimeout(timer);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    next();
  };
}

const requestTimeout = createTimeoutMiddleware(DEFAULT_TIMEOUT_MS);

module.exports = {
  requestTimeout,
  createTimeoutMiddleware,
  DEFAULT_TIMEOUT_MS,
};
