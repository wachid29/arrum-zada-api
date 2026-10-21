const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');

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
    return new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
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

  it('GET /api/v1/arrum-zada/unknown should return 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/arrum-zada/unknown`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.responseCode, 404);
  });
});
