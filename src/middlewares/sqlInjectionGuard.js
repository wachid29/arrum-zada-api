/**
 * Middleware Deteksi Pola SQL Injection (Defense-in-Depth)
 * 
 * Melakukan inspeksi pada query parameters, URL parameters, dan header untuk mendeteksi
 * percobaan injeksi SQL seperti stacked queries, UNION attacks, boolean-based, atau time-based blind SQLi.
 */

// Pola signature serangan SQL Injection yang sering digunakan penyerang
const SQLI_SUSPICIOUS_PATTERNS = [
  /(\bUNION(\s+ALL)?\s+SELECT\b)/i,
  /(\b(DROP|ALTER|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA|VIEW)\b)/i,
  /(\b(EXEC|EXECUTE)\s*\()/i,
  /(\b(PG_SLEEP|SLEEP|BENCHMARK|WAITFOR\s+DELAY)\b)/i,
  /(\bOR\b\s+['"\w]+\s*=\s*['"\w]+)/i,          // Contoh: OR '1'='1'
  /(\bAND\b\s+['"\w]+\s*=\s*['"\w]+)/i,         // Contoh: AND 1=1
  /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i, // Stacked query: ; DROP TABLE ...
  /(--\s*|\/\*|\*\/)/,                          // Komentar SQL inline/block
  /(\bINFORMATION_SCHEMA\b|\bPG_CATALOG\b)/i,    // Metadata sniffing
];

/**
 * Rekursif memeriksa objek/string apakah mengandung pola SQLi
 */
function scanValueForSqli(val) {
  if (typeof val === 'string') {
    for (const pattern of SQLI_SUSPICIOUS_PATTERNS) {
      if (pattern.test(val)) {
        return true;
      }
    }
  } else if (typeof val === 'object' && val !== null) {
    for (const key of Object.keys(val)) {
      if (scanValueForSqli(key) || scanValueForSqli(val[key])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Middleware pelindung SQL Injection
 */
function sqlInjectionGuard(req, res, next) {
  // 1. Periksa Query Strings (misal: ?limit=10; DROP TABLE ...)
  if (req.query && scanValueForSqli(req.query)) {
    console.warn(`[SECURITY ALERT] Percobaan SQL Injection terdeteksi pada query parameters dari IP ${req.ip}:`, req.query);
    return res.status(400).json({
      success: false,
      code: 'SQL_INJECTION_DETECTED',
      message: 'Permintaan ditolak: Parameter URL mengandung pola karakter SQL yang tidak diizinkan.',
    });
  }

  // 2. Periksa URL Parameters (misal: /api/:id)
  if (req.params && scanValueForSqli(req.params)) {
    console.warn(`[SECURITY ALERT] Percobaan SQL Injection terdeteksi pada route params dari IP ${req.ip}:`, req.params);
    return res.status(400).json({
      success: false,
      code: 'SQL_INJECTION_DETECTED',
      message: 'Permintaan ditolak: Route parameter mengandung pola karakter SQL berbahaya.',
    });
  }

  next();
}

module.exports = sqlInjectionGuard;
