const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const { authService } = require('../src/services');

describe('Routes & HTTP Endpoints Integration Tests', () => {
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
    await new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });

    try {
      await db.pool.end();
    } catch {
      // ignore
    }
  });

  it('GET / should return 200 with API catalog', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.responseCode, 200);
    assert.equal(body.data.name, 'Arrum Zada Feedback API');
    assert.ok(body.data.endpoints);
  });

  it('GET /docs/json should return OpenAPI JSON spec', async () => {
    const res = await fetch(`${baseUrl}/docs/json`);
    assert.equal(res.status, 200);

    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.paths['/api/v1/arrum-zada/feedback/questions']);
    assert.ok(spec.paths['/api/v1/arrum-zada/feedback']);
    assert.ok(spec.paths['/api/v1/auth/register']);
    assert.ok(spec.paths['/api/v1/auth/login']);
    assert.ok(spec.paths['/api/v1/arrum-zada/gold-prices']);
  });

  it('POST /api/v1/arrum-zada/feedback with empty body should return 400 validation error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.responseCode, 400);
    assert.match(body.responseDesc, /array "answers" wajib disertakan/);
  });

  it('POST /api/v1/arrum-zada/feedback with invalid questionId should return 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondent: { fullName: 'Budi' },
        answers: [{ questionId: '1 OR 1=1', answer: 'jawaban' }],
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.responseCode, 400);
    assert.match(body.responseDesc, /harus berupa angka murni/);
  });

  it('POST /api/v1/arrum-zada/feedback should normalize +62 phone number to 08 on save', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondent: {
          fullName: 'Siti Rahma',
          phoneNumber: '+6281298765432',
        },
        answers: [{ questionId: 1, answer: 'Konversi Emas' }],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.responseCode, 201);

    const check = await db.query('SELECT phone_number FROM feedback_submissions WHERE id = $1', [body.data.submissionId]);
    assert.equal(check.rows[0].phone_number, '081298765432');

    // Clean up
    await db.query('DELETE FROM feedback_submissions WHERE id = $1', [body.data.submissionId]);
  });

  it('GET /api/v1/arrum-zada/feedback/submissions without token should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback/submissions`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.responseCode, 401);
    assert.match(body.responseDesc, /Header Authorization.*wajib disertakan/);
  });

  it('GET /api/v1/arrum-zada/feedback/submissions with invalid token should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback/submissions`, {
      headers: { Authorization: 'Bearer token-palsu-123' },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.responseCode, 401);
    assert.match(body.responseDesc, /Token autentikasi tidak valid/);
  });

  it('GET /api/v1/arrum-zada/feedback/submissions with valid Bearer token should return 200 with submissions list', async () => {
    const testToken = authService.generateToken({
      id: 999,
      fullName: 'Supervisor PASTI',
      email: 'supervisor@pegadaian.co.id',
      nip: 'P99999',
      role: 'Super Admin',
      position: 'Supervisor',
    });

    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/feedback/submissions?limit=10&page=1`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.responseCode, 200);
    assert.ok(Array.isArray(body.data.items));
    assert.ok(body.data.meta);
  });

  it('GET /api/v1/arrum-zada/unknown should return 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/unknown`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.responseCode, 404);
  });
});
