const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const { requestLogger, formatLogMessage } = require('../src/middlewares/requestLogger');
const { requestTimeout, createTimeoutMiddleware, DEFAULT_TIMEOUT_MS } = require('../src/middlewares/requestTimeout');

describe('Middleware Unit & Integration Tests: Request Logger & Request Timeout', () => {
  describe('Request Logger Middleware', () => {
    it('should properly format log messages with method, url, status code, duration, and IP', () => {
      const msg = formatLogMessage({
        timestamp: '2026-10-21T18:00:00.000Z',
        method: 'GET',
        url: '/api/v1/arrum-zada/gold-prices',
        statusCode: 200,
        duration: '15.20',
        ip: '127.0.0.1',
      });

      assert.equal(msg, '[2026-10-21T18:00:00.000Z] [HTTP] GET /api/v1/arrum-zada/gold-prices 200 - 15.20ms - IP: 127.0.0.1');
    });

    it('should format log message with statusText when connection closed prematurely', () => {
      const msg = formatLogMessage({
        timestamp: '2026-10-21T18:00:00.000Z',
        method: 'POST',
        url: '/api/v1/arrum-zada/feedback',
        statusCode: 0,
        duration: '500.00',
        ip: '192.168.1.10',
        statusText: 'CLOSED_PREMATURELY',
      });

      assert.equal(msg, '[2026-10-21T18:00:00.000Z] [HTTP] POST /api/v1/arrum-zada/feedback [CLOSED_PREMATURELY] - 500.00ms - IP: 192.168.1.10');
    });

    it('should log 2xx requests via console.log on response completion', async () => {
      const testApp = express();
      const logs = [];
      const origLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        testApp.use(requestLogger);
        testApp.get('/test-log-200', (req, res) => res.status(200).json({ ok: true }));

        const server = http.createServer(testApp);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;

        const res = await fetch(`http://127.0.0.1:${port}/test-log-200`);
        assert.equal(res.status, 200);

        server.close();

        // Verifikasi log tercatat
        const match = logs.some((l) => l.includes('GET /test-log-200 200'));
        assert.ok(match, 'Log 200 should be recorded in console.log');
      } finally {
        console.log = origLog;
      }
    });

    it('should log 4xx requests via console.warn on response completion', async () => {
      const testApp = express();
      const warns = [];
      const origWarn = console.warn;
      console.warn = (...args) => warns.push(args.join(' '));

      try {
        testApp.use(requestLogger);
        testApp.get('/test-log-400', (req, res) => res.status(400).json({ error: 'bad' }));

        const server = http.createServer(testApp);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;

        const res = await fetch(`http://127.0.0.1:${port}/test-log-400`);
        assert.equal(res.status, 400);

        server.close();

        const match = warns.some((w) => w.includes('GET /test-log-400 400'));
        assert.ok(match, 'Log 400 should be recorded in console.warn');
      } finally {
        console.warn = origWarn;
      }
    });

    it('should log 5xx requests via console.error on response completion', async () => {
      const testApp = express();
      const errors = [];
      const origError = console.error;
      console.error = (...args) => errors.push(args.join(' '));

      try {
        testApp.use(requestLogger);
        testApp.get('/test-log-500', (req, res) => res.status(500).json({ error: 'internal' }));

        const server = http.createServer(testApp);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;

        const res = await fetch(`http://127.0.0.1:${port}/test-log-500`);
        assert.equal(res.status, 500);

        server.close();

        const match = errors.some((e) => e.includes('GET /test-log-500 500'));
        assert.ok(match, 'Log 500 should be recorded in console.error');
      } finally {
        console.error = origError;
      }
    });
  });

  describe('Request Timeout Middleware (30 detik)', () => {
    it('DEFAULT_TIMEOUT_MS should be exactly 30000 ms (30 detik)', () => {
      assert.equal(DEFAULT_TIMEOUT_MS, 30000);
    });

    it('should allow fast requests to complete normally without timeout', async () => {
      const testApp = express();
      testApp.use(createTimeoutMiddleware(500)); // 500ms timeout
      testApp.get('/fast', (req, res) => {
        res.json({ message: 'fast response' });
      });

      const server = http.createServer(testApp);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;

      const res = await fetch(`http://127.0.0.1:${port}/fast`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.message, 'fast response');

      server.close();
    });

    it('should return 408 Request Timeout when request takes longer than timeout limit', async () => {
      const testApp = express();
      // Menggunakan timeout 100ms untuk pengujian cepat
      testApp.use(createTimeoutMiddleware(100));

      testApp.get('/slow', (req, res) => {
        // Simulasi proses lambat (300ms)
        setTimeout(() => {
          if (!res.headersSent) {
            res.json({ message: 'too late' });
          }
        }, 300);
      });

      const server = http.createServer(testApp);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;

      const res = await fetch(`http://127.0.0.1:${port}/slow`);
      assert.equal(res.status, 408);

      const body = await res.json();
      assert.equal(body.responseCode, 408);
      assert.match(body.responseDesc, /Permintaan waktu habis.*Request Timeout/);
      assert.equal(body.data, null);

      server.close();
    });

    it('should prevent ERR_HTTP_HEADERS_SENT when slow handler attempts to send after timeout', async () => {
      const testApp = express();
      testApp.use(createTimeoutMiddleware(50));

      let handlerCompleted = false;

      testApp.get('/delayed-send', (req, res) => {
        setTimeout(() => {
          // Mencoba kirim respon setelah timeout 408 sudah terkirim
          try {
            res.json({ shouldBeIgnored: true });
            handlerCompleted = true;
          } catch (err) {
            assert.fail(`Should not throw header error: ${err.message}`);
          }
        }, 120);
      });

      const server = http.createServer(testApp);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;

      const res = await fetch(`http://127.0.0.1:${port}/delayed-send`);
      assert.equal(res.status, 408);

      // Tunggu handler lambat selesai
      await new Promise((r) => setTimeout(r, 180));
      assert.ok(handlerCompleted, 'Slow handler should execute without crashing');

      server.close();
    });
  });
});
