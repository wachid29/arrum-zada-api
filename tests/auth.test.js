const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const { User } = require('../src/entities');

describe('Authentication (Register & Login) Integration & Unit Tests', () => {
  let server;
  let baseUrl;

  // Prefix unik agar tes dapat diulang tanpa konflik data unik (email & NIP)
  const testId = Date.now().toString().slice(-6);
  const testEmail = `tester.${testId}@pegadaian.co.id`;
  const testNip = `NIP${testId}`;
  const testPassword = 'Password123!';
  let authToken = '';

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
    // Bersihkan data user uji coba dari database
    try {
      await db.query('DELETE FROM users WHERE email = $1 OR nip = $2', [testEmail, testNip]);
    } catch {
      // Abaikan jika DB tidak terhubung pada lingkungan unit mock
    }

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
      // Abaikan jika pool sudah ditutup
    }
  });

  describe('User Entity Unit Tests', () => {
    it('should never expose passwordHash in toJSON()', () => {
      const user = new User({
        id: 1,
        fullName: 'Test User',
        email: 'test@pegadaian.co.id',
        phoneNumber: '+6281234567890',
        nip: '12345',
        position: 'Developer',
        role: 'Administrator',
        passwordHash: '$2a$10$hashedstringvalue',
      });

      const serialized = user.toJSON();
      assert.equal(serialized.passwordHash, undefined);
      assert.equal(serialized.fullName, 'Test User');
      assert.equal(serialized.email, 'test@pegadaian.co.id');
    });

    it('should instantiate properly from payload and db row', () => {
      const userFromRow = User.fromDatabaseRow({
        id: 5,
        full_name: 'Admin Pegadaian',
        email: 'admin@pegadaian.co.id',
        phone_number: '081234567890',
        nip: 'P99999',
        position: 'Lead',
        role: 'Super Admin',
        password_hash: 'secret-hash',
        is_active: true,
      });

      assert.equal(userFromRow.id, 5);
      assert.equal(userFromRow.fullName, 'Admin Pegadaian');
      assert.equal(userFromRow.role, 'Super Admin');
    });
  });

  describe('POST /api/v1/auth/register - Validation Rules', () => {
    it('should reject when fullName is shorter than 3 characters', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Al',
          email: 'valid@pegadaian.co.id',
          phoneNumber: '081234567890',
          nip: 'P12345',
          position: 'Staff',
          role: 'Administrator',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /minimal 3 karakter/);
    });

    it('should reject when email does not belong to @pegadaian.co.id domain', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Budi Santoso',
          email: 'budi@gmail.com',
          phoneNumber: '081234567890',
          nip: 'P12345',
          position: 'Staff',
          role: 'Administrator',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /domain kedinasan resmi PT Pegadaian/);
    });

    it('should reject invalid phone numbers not starting with +62 or 08', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Budi Santoso',
          email: 'budi@pegadaian.co.id',
          phoneNumber: '0217654321', // Nomor rumah bukan seluler
          nip: 'P12345',
          position: 'Staff',
          role: 'Administrator',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /diawali dengan \+62 atau 08/);
    });

    it('should reject invalid role not in Super Admin or Administrator', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Budi Santoso',
          email: 'budi@pegadaian.co.id',
          phoneNumber: '081234567890',
          nip: 'P12345',
          position: 'Staff',
          role: 'General User', // Bukan enum yang valid
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /Super Admin.*Administrator/);
    });

    it('should reject password with less than 8 characters', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Budi Santoso',
          email: 'budi@pegadaian.co.id',
          phoneNumber: '081234567890',
          nip: 'P12345',
          position: 'Staff',
          role: 'Administrator',
          password: '123',
          confirmPassword: '123',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /minimal 8 karakter/);
    });

    it('should reject when confirmPassword does not match password', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Budi Santoso',
          email: 'budi@pegadaian.co.id',
          phoneNumber: '081234567890',
          nip: 'P12345',
          position: 'Staff',
          role: 'Administrator',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword456!',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.responseDesc, /harus sama persis/);
    });
  });

  describe('POST /api/v1/auth/register - Success & Duplication Handling', () => {
    it('should successfully register a valid new user without returning token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Ahmad Fauzi',
          email: testEmail,
          phoneNumber: '+6281234567890',
          nip: testNip,
          position: 'Staff TI Divisi PASTI',
          role: 'Administrator',
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.responseCode, 201);
      // Memastikan endpoint register TIDAK mengembalikan token (wajib login terlebih dahulu)
      assert.equal(body.data.token, undefined);
      assert.equal(body.data.tokenType, undefined);
      assert.equal(body.data.user.email, testEmail);
      assert.equal(body.data.user.nip, testNip);
      // Memastikan nomor telepon diawali +62 otomatis dikonversi ke format lokal 08 saat disimpan
      assert.equal(body.data.user.phoneNumber, '081234567890');
      assert.equal(body.data.user.passwordHash, undefined);
    });

    it('should return 409 Conflict when attempting to register duplicate email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Another User',
          email: testEmail, // Email sama
          phoneNumber: '089876543210',
          nip: `NIP_DIFF_${testId}`,
          position: 'Staff',
          role: 'Super Admin',
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.responseDesc, /Email sudah terdaftar/);
    });

    it('should return 409 Conflict when attempting to register duplicate NIP', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Another User',
          email: `unique.${testId}@pegadaian.co.id`,
          phoneNumber: '089876543210',
          nip: testNip, // NIP sama
          position: 'Staff',
          role: 'Super Admin',
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.responseDesc, /NIP sudah terdaftar/);
    });
  });

  describe('POST /api/v1/auth/login - Authentication Scenarios', () => {
    it('should successfully login via official email and return JWT token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testEmail,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.ok(body.data.token);
      assert.equal(body.data.user.email, testEmail);

      authToken = body.data.token;
    });

    it('should successfully login via NIP', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testNip,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.equal(body.data.user.nip, testNip);
    });

    it('should reject login with incorrect password with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testEmail,
          password: 'WrongPassword999!',
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.responseDesc, /tidak valid/);
    });

    it('should reject login for non-existent user with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'nonexistent@pegadaian.co.id',
          password: 'Password123!',
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.responseDesc, /tidak valid/);
    });

    it('should also work on aliased route /api/v1/arrum-zada/auth/login', async () => {
      const res = await fetch(`${baseUrl}/api/v1/arrum-zada/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testEmail,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.ok(body.data.token);
    });
  });

  describe('GET /api/v1/auth/me - Protected Route Verification', () => {
    it('should reject request without Authorization header with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.responseDesc, /Header Authorization.*wajib disertakan/);
    });

    it('should reject request with invalid Bearer token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer invalid.token.payload' },
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.responseDesc, /tidak valid/);
    });

    it('should allow access and return profile with valid Bearer token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.responseCode, 200);
      assert.equal(body.data.email, testEmail);
      assert.equal(body.data.nip, testNip);
    });
  });
});
