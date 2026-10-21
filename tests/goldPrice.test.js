const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const { goldPriceService } = require('../src/services');

describe('Gold Price (Galeri 24 Integration) Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    return new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  });

  describe('GoldPriceService Unit Tests', () => {
    it('getApiUrl should format URL with host from env', () => {
      const url = goldPriceService.getApiUrl();
      assert.match(url, /^https?:\/\/.+\/api\/gold-prices\/daily-update$/);
      assert.ok(url.includes(process.env.GALERI24_HOST || 'galeri24.co.id'));
    });

    it('getDailyPrices should fetch real or mock gold prices array', async () => {
      // Bersihkan cache sebelum pengujian
      goldPriceService.clearCache();

      const prices = await goldPriceService.getDailyPrices();
      assert.ok(Array.isArray(prices));
      assert.ok(prices.length > 0);

      const firstItem = prices[0];
      assert.ok(firstItem.date);
      assert.ok(firstItem.sellingPrice);
      assert.ok(firstItem.buybackPrice);
      assert.ok(firstItem.vendorName);
    });

    it('getDailyPrices should use cache on second call', async () => {
      const cached = await goldPriceService.getDailyPrices();
      assert.ok(Array.isArray(cached));
      assert.equal(goldPriceService.cache.data, cached);
    });
  });

  describe('Gold Price HTTP Endpoints Integration Tests', () => {
    it('GET /api/v1/arrum-zada/gold-prices should return 200 with daily gold prices', async () => {
      const res = await fetch(`${baseUrl}/api/v1/arrum-zada/gold-prices`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.match(body.responseDesc, /Galeri 24/);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length > 0);

      const vendor = body.data.find((item) => item.vendorName === 'GALERI 24' || item.vendorName === 'ANTAM');
      assert.ok(vendor);
      assert.ok(vendor.sellingPrice);
    });

    it('GET /api/v1/arrum-zada/gold-prices/daily-update should also return 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/arrum-zada/gold-prices/daily-update`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.ok(Array.isArray(body.data));
    });

    it('GET /api/v1/gold-prices should work on aliased root route', async () => {
      const res = await fetch(`${baseUrl}/api/v1/gold-prices`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.ok(Array.isArray(body.data));
    });
  });
});
