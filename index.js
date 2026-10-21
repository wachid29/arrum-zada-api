require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Arrum Zada API berjalan di http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - Register:     POST http://localhost:${PORT}/api/v1/auth/register`);
  console.log(`   - Login:        POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   - Profile:      GET  http://localhost:${PORT}/api/v1/auth/me`);
  console.log(`   - Gold Prices:  GET  http://localhost:${PORT}/api/v1/arrum-zada/gold-prices`);
  console.log(`   - Questions:    GET  http://localhost:${PORT}/api/v1/arrum-zada/feedback/questions`);
  console.log(`   - Submit:       POST http://localhost:${PORT}/api/v1/arrum-zada/feedback`);
  console.log(`   - Submissions:  GET  http://localhost:${PORT}/api/v1/arrum-zada/feedback/submissions`);
  console.log(`   - Health check: GET  http://localhost:${PORT}/health`);
  console.log(`   - Swagger Docs: GET  http://localhost:${PORT}/docs`);
  console.log(`⏱️ Request Timeout: 30 detik`);
  console.log(`📝 Access Logging: Aktif per endpoint`);
  console.log(`=======================================================`);
});

// Konfigurasi timeout koneksi socket HTTP server (30 detik)
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000;
server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = REQUEST_TIMEOUT_MS + 1000;
