/**
 * Service: Gold Price Integration
 * Mengintegrasikan data harga emas harian dari API resmi Galeri 24 (PT Pegadaian Group)
 * URL Target: ${GALERI24_HOST}/api/gold-prices/daily-update
 */
class GoldPriceService {
  constructor() {
    const ttlMinutes = parseInt(process.env.GOLD_PRICE_CACHE_TTL_MINUTES || '10', 10);
    this.cache = {
      data: null,
      lastFetched: 0,
      ttlMs: ttlMinutes * 60 * 1000, // In-memory cache TTL (dapat diatur via .env)
    };
  }

  /**
   * Mengembalikan URL lengkap API Galeri 24 berdasarkan konfigurasi environment
   * @returns {string}
   */
  getApiUrl() {
    const host = (process.env.GALERI24_HOST || process.env.GALERI24_BASE_URL || 'https://galeri24.co.id').trim().replace(/\/$/, '');
    const endpoint = (process.env.GALERI24_GOLD_PRICE_PATH || '/api/gold-prices/daily-update').trim();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${host}${cleanEndpoint}`;
  }

  /**
   * Mengambil data harga emas harian (Daily Update) dari Galeri 24
   * @param {{ forceRefresh?: boolean }} options
   * @returns {Promise<Array<Object>>}
   */
  async getDailyPrices({ forceRefresh = false } = {}) {
    const now = Date.now();

    // 1. Gunakan cache jika masih dalam jendela TTL dan tidak dipaksa refresh
    if (!forceRefresh && this.cache.data && (now - this.cache.lastFetched < this.cache.ttlMs)) {
      return this.cache.data;
    }

    const targetUrl = this.getApiUrl();

    try {
      // 2. Fetch data dari server Galeri 24 dengan timeout aman (8 detik)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArrumZada-Pegadaian/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server Galeri 24 mengembalikan status HTTP ${response.status} (${response.statusText})`);
      }

      const rawData = await response.json();

      if (!Array.isArray(rawData)) {
        throw new Error('Format data balikan dari Galeri 24 tidak valid (bukan array).');
      }

      // 3. Simpan ke in-memory cache
      this.cache.data = rawData;
      this.cache.lastFetched = now;

      return rawData;
    } catch (err) {
      console.error('Error fetching Galeri 24 gold prices:', err.message);

      // 4. Jika fetch gagal namun terdapat cache sebelumnya (stale-while-revalidate), kembalikan cache
      if (this.cache.data) {
        console.warn('Menggunakan cache data harga emas sebelumnya akibat kendala koneksi ke Galeri 24.');
        return this.cache.data;
      }

      const error = new Error(`Gagal mengambil data harga emas harian dari Galeri 24: ${err.message}`);
      error.status = 502; // Bad Gateway
      throw error;
    }
  }

  /**
   * Mengosongkan cache (berguna untuk testing atau manual refresh)
   */
  clearCache() {
    this.cache.data = null;
    this.cache.lastFetched = 0;
  }
}

module.exports = new GoldPriceService();
