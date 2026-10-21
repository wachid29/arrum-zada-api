# Arrum Zada Feedback API

REST API backend berbasis **Express.js** dan **PostgreSQL** untuk layanan evaluasi, kuesioner dinamis, dan pengumpulan feedback pengguna prototipe simulasi emas haji **Arrum Zada - PT Pegadaian**.

---

## 🌟 Fitur Utama

- 💰 **Integrasi Harga Emas Harian Galeri 24 (`GET /api/v1/arrum-zada/gold-prices`):** Mengambil data harga jual dan buyback emas terkini (Galeri 24, Antam, UBS, dsb.) langsung dari API resmi Galeri 24 dengan host yang dapat dikonfigurasi melalui `.env` (`GALERI24_HOST`) serta dilengkapi *in-memory caching* untuk keandalan data simulasi.
- 🔐 **Autentikasi & Registrasi Pegawai (`POST /api/v1/auth/register` & `POST /api/v1/auth/login`):** Layanan registrasi dan login pegawai PT Pegadaian (registrasi tidak mengembalikan token; token JWT diterbitkan saat login) dengan validasi email dinas (`@pegadaian.co.id`), nomor ponsel E.164 (otomatis dinormalisasi ke `08`), peran (`Super Admin` / `Administrator`), serta hashing kata sandi satu arah dengan **bcrypt**.
- 📋 **Daftar Pertanyaan Dinamis (`GET /api/v1/arrum-zada/feedback/questions`):** Mengambil pertanyaan survei secara dinamis dari database (pilihan ganda, skala rating 1-5, teks saran).
- 💾 **Penyimpanan Transaksional ACID (`POST /api/v1/arrum-zada/feedback`):** Menyimpan identitas responden dan seluruh jawaban kuesioner secara atomik menggunakan PostgreSQL Transaction (`BEGIN ... COMMIT / ROLLBACK`).
- 📊 **Rekap Masukan Responden (`GET /api/v1/arrum-zada/feedback/submissions`):** Menampilkan riwayat masukan dan agregasi jawaban untuk kebutuhan analitik produk (memerlukan autentikasi Bearer JWT token).
- 🩺 **Health Check Monitor (`GET /health`):** Memantau uptime server Express dan status koneksi aktif ke database PostgreSQL.
- 📖 **Dokumentasi Interaktif Swagger UI (`/docs` & `/api-docs`):** Spesifikasi OpenAPI 3.0 lengkap dengan skema data dan fitur *Try it out*.

---

## 📋 Spesifikasi Aturan Registrasi Pegawai

| Field | Tipe | Wajib | Keterangan / Aturan Validasi |
|---|---|---|---|
| `fullName` | string | Ya | Minimal 3 karakter. |
| `email` | string | Ya | Format email valid, domain kedinasan (e.g. `@pegadaian.co.id`), bersifat unik (*unique constraint*). |
| `phoneNumber` | string | Ya | Format nomor telepon seluler (E.164, diawali `+62` atau `08`). **Otomatis dinormalisasi ke format lokal `08` saat disimpan ke database**. |
| `nip` | string | Ya | Nomor Induk Pegawai PT Pegadaian (bersifat unik). |
| `position` | string | Ya | Nama jabatan struktural/fungsional pegawai. |
| `role` | enum | Ya | Pilihan: `'Super Admin'` atau `'Administrator'`. |
| `password` | string | Ya | Minimal 8 karakter, wajib di-hash satu arah (*bcrypt* / *Argon2id*) di backend. Jangan pernah simpan plaintext. |
| `confirmPassword` | string | Ya | Harus sama persis dengan `password`. |

---

## 🛡️ Keamanan & Proteksi API

1. **Perlindungan Brute-Force & DoS (Rate Limiting):**
   - **Global Rate Limiter:** Maksimal 100 request / 15 menit per IP.
   - **Submission Limiter:** Maksimal 10 pengiriman formulir / 15 menit per IP untuk mencegah bot spamming.
2. **CORS Origin Whitelist:**
   - Whitelist origin yang dapat dikonfigurasi melalui `.env` (contoh: `https://ifatich.github.io`, `http://localhost:3000`, `http://localhost:5173`).
   - Domain tidak terdaftar otomatis diblokir dengan HTTP 403 Forbidden.
   - Mendukung preflight caching 24 jam dengan `credentials: true`.
3. **Pencegahan SQL Injection (Defense-in-Depth):**
   - **Parameterized Queries:** Seluruh interaksi database menggunakan parameter binding `$1, $2, ...` (data diperlakukan sebagai literal).
   - **SQL Injection Guard:** Memindai pola berbahaya (`UNION`, stacked queries, `OR 1=1`) pada query parameters dan URL params.
   - **Input Sanitization & Validation:** Regex digit ketat (`/^\d+$/`), sanitasi null-byte (`\0`), dan pembatasan panjang payload.
4. **HTTP Security Headers (Helmet):**
   - Proteksi dari XSS, MIME-sniffing (`nosniff`), Clickjacking (`SAMEORIGIN`), dan HSTS.

---

## 🐳 Menjalankan dengan Docker & Docker Compose

Tersedia dua opsi deployment menggunakan Docker:

### Opsi A: 1-Click Deployment (Docker Compose - Recommended)
Menjalankan seluruh arsitektur sistem (API + PostgreSQL terotomatisasi skema & seed data) dalam satu perintah:

```bash
# 1. Pastikan file konfigurasi environment tersedia
cp .env.example .env

# 2. Build image dan jalankan seluruh container di background
docker compose up -d --build

# 3. Cek status container aktif
docker compose ps

# 4. Melihat log realtime aplikasi
docker compose logs -f app
```
* API akan langsung aktif di: **`http://localhost:3000`**
* Dokumentasi Swagger: **`http://localhost:3000/docs`**

Untuk menghentikan:
```bash
docker compose down
```

---

### Opsi B: Build & Run Docker Image Manual

```bash
# 1. Build Docker image multi-stage (ukuran sangat ringan ~150 MB & non-root user)
docker build -t arrum-zada-api:latest .

# 2. Jalankan container
docker run -d \
  --name arrum-zada-api \
  -p 3000:3000 \
  --env-file .env \
  arrum-zada-api:latest

# 3. Cek log container
docker logs -f arrum-zada-api
```

---

## 🚀 Cara Menjalankan Secara Lokal (Node.js Bare-Metal)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+)
- [Docker](https://www.docker.com/) atau PostgreSQL lokal aktif

### 2. Setup Database PostgreSQL via Docker (Standalone)
```bash
# Jalankan container PostgreSQL
docker run -d --name pg-local -p 5432:5432 -e POSTGRES_DB=arrum_zada -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:12

# Eksekusi DDL Schema dan Seed Data
docker exec -i pg-local psql -U postgres -d arrum_zada < database/schema.sql
```

### 3. Instalasi Dependensi & Setup Environment
```bash
# Salin konfigurasi environment
cp .env.example .env

# Install dependencies
npm install
```

### 4. Menjalankan Server
```bash
# Mode development (dengan file watch)
npm run dev

# Mode production
npm start
```

Server akan aktif di: **`http://localhost:3000`**

---

## 📚 Akses Dokumentasi Swagger UI

Buka di browser:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

---

## 📦 Standarisasi Format Respon API

Seluruh endpoint API Arrum Zada menggunakan format respon standar seragam:

```json
{
  "responseCode": 200,
  "responseDesc": "Daftar data submission berhasil diambil",
  "data": {
    "items": [ ... ],
    "meta": {
      "page": 1,
      "limit": 50,
      "totalRecords": 100,
      "totalPages": 2
    }
  }
}
```

- **`responseCode`**: Kode status HTTP balikan fungsi (misal: `200`, `201`, `400`, `403`, `404`, `429`, `500`, `503`).
- **`responseDesc`**: Pesan deskripsi hasil eksekusi atau pesan error.
- **`data`**: Data hasil eksekusi fungsi (`nullable`, bernilai `null` saat error atau tanpa data).
- **`data.meta`**: Objek metadata paginasi (`page`, `limit`, `totalRecords`, `totalPages`) yang disematkan di dalam `data` jika endpoint mendukung paginasi.

---

## 📁 Struktur Direktori & Arsitektur Layered

Aplikasi mengadopsi arsitektur berlapis (*layered architecture* / *separation of concerns*):

```
arrum-zada-api/
├── database/
│   └── schema.sql                  # DDL Schema & 10 Butir Pertanyaan Seed BRD
├── src/
│   ├── config/
│   │   └── db.js                   # PostgreSQL Pool Connection
│   ├── entities/                   # [ENTITY] Definisi Domain Objects & Model
│   │   ├── Question.js             # Model Butir Pertanyaan Survei
│   │   ├── Respondent.js           # Model Profil Responden
│   │   ├── Answer.js               # Model Jawaban Responden
│   │   ├── Submission.js           # Model Master Submission Kuesioner
│   │   ├── User.js                 # Model Akun Pengguna / Pegawai Pegadaian
│   │   └── index.js
│   ├── repositories/               # [REPOSITORY] Kueri Database (SQL / Data Access)
│   │   ├── questionRepository.js   # Kueri tabel feedback_questions
│   │   ├── submissionRepository.js # Kueri tabel feedback_submissions
│   │   ├── answerRepository.js     # Kueri tabel feedback_answers
│   │   ├── userRepository.js       # Kueri tabel users (identifikasi, login, register)
│   │   └── index.js
│   ├── services/                   # [SERVICE] Logika Bisnis & Transaksi ACID
│   │   ├── feedbackService.js      # Business logic feedback & transaksi DB
│   │   ├── healthService.js        # Health check status & overview
│   │   ├── authService.js          # Registrasi, hash password (bcrypt), & JWT token
│   │   ├── goldPriceService.js     # Integrasi API harga emas harian Galeri 24 & Caching
│   │   └── index.js
│   ├── controllers/                # [CONTROLLER] HTTP Request & Response Adapter
│   │   ├── feedbackController.js   # Handler HTTP Feedback
│   │   ├── healthController.js     # Handler HTTP Health & Root
│   │   ├── authController.js       # Handler HTTP Registrasi, Login & Profil
│   │   ├── goldPriceController.js  # Handler HTTP Harga Emas Galeri 24
│   │   └── index.js
│   ├── routes/                     # [ROUTES] Daftar Endpoint & Middleware Binding
│   │   ├── feedbackRoutes.js       # List endpoint feedback (/questions, /, /submissions)
│   │   ├── healthRoutes.js         # List endpoint health & root (/health, /)
│   │   ├── authRoutes.js           # List endpoint autentikasi (/register, /login, /me)
│   │   ├── goldPriceRoutes.js      # List endpoint harga emas (/gold-prices)
│   │   └── index.js                # Master route registry
│   ├── docs/
│   │   └── swaggerDoc.js           # OpenAPI 3.0 Specification
│   ├── middlewares/
│   │   ├── corsHandler.js          # Dynamic Origin Whitelist
│   │   ├── rateLimiter.js          # Anti-Bruteforce & Anti-Spam (Global, Submit, Auth)
│   │   ├── sqlInjectionGuard.js    # SQLi Pattern Inspector
│   │   ├── authMiddleware.js       # Verifikasi JWT Token & Proteksi Route
│   │   └── validateInput.js        # Input Schema Validation & Sanitizer (Register, Login, Feedback)
│   ├── utils/
│   │   ├── responseHelper.js       # Standard Response Formatter (responseCode, responseDesc, data)
│   │   └── phoneHelper.js          # Konversi & normalisasi nomor HP (+62 -> 08) saat save
│   └── app.js                      # Express Application Setup
├── tests/                          # Automated Tests (Unit & Integration)
│   ├── entities.test.js            # Unit test entities
│   ├── services.test.js            # Unit test services
│   ├── routes.test.js              # Integration test routes & validation
│   ├── auth.test.js                # Integration test autentikasi (Register, Login, /me)
│   └── goldPrice.test.js           # Integration & Unit test harga emas Galeri 24
├── .dockerignore                   # Aturan pengecualian build Docker
├── Dockerfile                      # Multi-stage production Docker build (~150 MB, non-root)
├── docker-compose.yml              # 1-Click stack orchestration (App + PostgreSQL)
├── .env.example                    # Template Konfigurasi Environment
├── .gitignore                      # Git Exclusion Rules
├── index.js                        # Entry Point Server
├── package.json
└── README.md
```

---

## 📄 Lisensi
Hak Cipta © 2026 PT Pegadaian - Divisi PASTI. Seluruh hak cipta dilindungi undang-undang.
