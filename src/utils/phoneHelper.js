/**
 * Utility: Phone Helper
 * Menangani normalisasi dan konversi format nomor telepon seluler Indonesia
 */

/**
 * Mengonversi format nomor HP seluler Indonesia ke format lokal diawali '08'
 * Contoh:
 * - '+6281234567890' -> '081234567890'
 * - '6281234567890'  -> '081234567890'
 * - '081234567890'   -> '081234567890'
 *
 * @param {string} phoneNumber
 * @returns {string}
 */
function normalizeToLocalPhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }

  // Hapus semua karakter spasi dan tanda hubung
  let clean = phoneNumber.trim().replace(/[\s-]/g, '');

  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }

  return clean;
}

module.exports = {
  normalizeToLocalPhone,
};
