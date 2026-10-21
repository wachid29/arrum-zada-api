# HIGH LEVEL DESIGN (HLD)
## Arrum Zada Feedback & Evaluation Platform
**PT Pegadaian — Divisi Pengembangan Aplikasi TI (PASTI)**  
*Dokumen Arsitektur Sistem, Integrasi API, dan Keamanan Berlapis*

---

> [!NOTE]
> Dokumen **High Level Design (HLD)** ini merangkum rancangan arsitektur, integrasi modul, aliran data, strategi keamanan, dan topologi deployment untuk platform pengumpulan evaluasi dan feedback dashboard simulasi emas haji **Arrum Zada** berdasarkan dokumen spesifikasi kebutuhan produk (BRD Iterasi 2).

---

## 1. Latar Belakang & Filosofi Desain

### 1.1 Konteks Bisnis
Aplikasi web [Arrum Zada](https://ifatich.github.io/arrum-zada/) menyajikan simulasi interaktif rencana porsi haji berbasis tabungan emas bagi nasabah PT Pegadaian. Untuk mengukur kesiapan pasar (*product-market fit*), kejelasan tata letak (*user experience*), dan minat nasabah terhadap akad syariah, dibangun modul kuesioner evaluasi yang terintegrasi langsung ke backend terpusat.

### 1.2 Prinsip Arsitektur Utama
- **Stateless Client-Side Simulation:** Seluruh kalkulasi konversi dana, fluktuasi estimasi gram emas, dan simulasi cicilan bulanan dieksekusi secara instan di sisi browser (client-side) tanpa membebani server backend atau menyimpan data simulasi sementara di database.
- **ACID Transactional Feedback:** Seluruh data evaluasi responden dan rincian jawaban survei disimpan ke PostgreSQL menggunakan transaksi database atomik (`BEGIN ... COMMIT / ROLLBACK`) untuk menjamin konsistensi data.
- **Dynamic Survey Management:** Butir-butir pertanyaan survei tidak di-*hardcode* di frontend, melainkan dikonfigurasi melalui basis data sehingga dapat disesuaikan sewaktu-waktu tanpa perlu melakukan *re-deploy* aplikasi frontend.
- **Defense-in-Depth Security:** Mengadopsi prinsip keamanan berlapis mencakup kontrol asal domain (CORS Whitelist), pencegahan brute-force (Rate Limiting), sanitasi input, parameter binding ($1, $2, ...), serta HTTP security headers.

---

## 2. Arsitektur Sistem Tingkat Tinggi

Diagram berikut mengilustrasikan topologi arsitektur sistem secara *end-to-end*, mulai dari interaksi nasabah di peramban hingga lapisan persistensi basis data:

```mermaid
flowchart TD
    subgraph ClientLayer["1. Lapisan Klien (Frontend Web)"]
        Browser["Nasabah / Pengguna Web\n(Desktop & Mobile)"]
        VueApp["Frontend Arrum Zada SPA\n(GitHub Pages / CDN)"]
        SimulatorEngine["Simulasi Emas Haji\n(Client-Side Stateless)"]
        FeedbackModal["Modal Evaluasi & Survei\n(Dynamic Form)"]
        Browser --> VueApp
        VueApp --> SimulatorEngine
        VueApp --> FeedbackModal
    end

    subgraph SecurityGateway["2. Lapisan Keamanan & Gateway"]
        CORS["CORS Dynamic Whitelist\n(Allowed Origins Validation)"]
        HelmetMW["Helmet Security Headers\n(nosniff, SAMEORIGIN, HSTS)"]
        RateLimitGlobal["Global Rate Limiter\n(100 req / 15 min per IP)"]
        RateLimitSubmit["Submission Rate Limiter\n(10 submit / 15 min per IP)"]
        SQLiGuard["SQL Injection Pattern Guard\n(Query & Route Params Inspector)"]
        InputValidator["Schema Validator & Sanitizer\n(Regex /^[0-9]+$/, Null-Byte Strip)"]
    end

    subgraph ApplicationLayer["3. Lapisan Aplikasi Backend (Express.js)"]
        AppRouting["Express App Router\n(/api/v1/arrum-zada/feedback)"]
        SwaggerDoc["Swagger UI Engine\n(/docs & /api-docs)"]
        HealthCtrl["Health Monitor Controller\n(/health)"]
        FeedbackCtrl["Feedback Controller\n(getQuestions, submitFeedback, getSubmissions)"]
        PGPool["PostgreSQL Connection Pool\n(pg.Pool - Max 20 Connections)"]
    end

    subgraph DataLayer["4. Lapisan Data & Persistensi (PostgreSQL 12+)"]
        DB[(Database: arrum_zada)]
        TblQuestions["feedback_questions\n(Master Pertanyaan BRD)"]
        TblSubmissions["feedback_submissions\n(Identitas & Metadata Responden)"]
        TblAnswers["feedback_answers\n(Detail Jawaban Kuesioner)"]
        DB --- TblQuestions
        DB --- TblSubmissions
        DB --- TblAnswers
    end

    FeedbackModal -->|"HTTPS Request"| CORS
    CORS --> HelmetMW
    HelmetMW --> RateLimitGlobal
    RateLimitGlobal --> SQLiGuard
    SQLiGuard --> AppRouting
    AppRouting --> RateLimitSubmit
    RateLimitSubmit --> InputValidator
    InputValidator --> FeedbackCtrl
    AppRouting --> HealthCtrl
    AppRouting --> SwaggerDoc
    FeedbackCtrl --> PGPool
    HealthCtrl --> PGPool
    PGPool -->|"ACID Transaction / TCP 5432"| DB
```

---

## 3. Komponen Utama Sistem

### 3.1 Presentation Tier (Frontend Web)
- **Teknologi:** Vue.js, Tailwind CSS / Vanilla JS terbundel.
- **Hosting:** GitHub Pages (`https://ifatich.github.io/arrum-zada/`).
- **Fungsi:** 
  1. Melakukan kalkulasi simulasi porsi haji secara matematis di browser nasabah.
  2. Mengonsumsi endpoint `GET /questions` untuk memuat pertanyaan kuesioner dinamis saat modal masukan dibuka.
  3. Mengirimkan masukan ke endpoint `POST /feedback` saat tombol *Submit* ditekan.

### 3.2 Security & Protection Tier
- **CORS Whitelist (`corsHandler.js`):** Memvalidasi header `Origin` hanya untuk domain resmi yang terdaftar (GitHub Pages, localhost Vite, dan Live Server). Request dari domain asing ditolak dengan respon HTTP `403 Forbidden`.
- **Anti-Bruteforce & Anti-Spam (`rateLimiter.js`):** Membatasi laju permintaan global (100 req/15 menit) dan pengiriman formulir masukan (10 formulir/15 menit). Melebihi batas menghasilkan HTTP `429 Too Many Requests`.
- **SQLi Inspector & Sanitizer (`sqlInjectionGuard.js` & `validateInput.js`):** Memindai URL parameters dari serangan injection (`UNION`, `DROP TABLE`, `OR 1=1`), mensterilkan karakter null-byte (`\0`), serta memvalidasi tipe data integer dengan regex `/^\d+$/`.
- **HTTP Hardening (Helmet):** Mengaktifkan proteksi MIME-type sniffing (`nosniff`), Clickjacking (`X-Frame-Options: SAMEORIGIN`), dan HSTS tanpa merusak tata letak Swagger UI.

### 3.3 Application Tier (REST API Service)
- **Teknologi:** Node.js v18+ dengan Express.js 5.
- **Lokasi Proyek:** `arrum-zada-api`
- **Komponen:**
  - `src/controllers/feedbackController.js`: Logika bisnis dan orkestrasi transaksi basis data.
  - `src/config/db.js`: Pengelolaan connection pool PostgreSQL (`max: 20`, `idleTimeoutMillis: 30000`).
  - `src/docs/swaggerDoc.js`: Definisi skema interaktif OpenAPI 3.0.

### 3.4 Data Tier (PostgreSQL Relational Storage)
- **RDBMS Engine:** PostgreSQL 12 (Container `pg-local` port 5432).
- **Integritas Referensial:** Menggunakan `FOREIGN KEY ... ON DELETE CASCADE` antara tabel submissions dan answers untuk menjaga keutuhan relasi data.
- **Indeks Basis Data:** Dibuat indeks terklasifikasi pada `created_at DESC`, `submission_id`, `question_id`, dan `order_no` guna menjamin efisiensi performa pembacaan laporan berskala besar.

---

## 4. Aliran Transaksi & Integrasi Data

### 4.1 Alur 1: Memuat Kuesioner Dinamis (`GET /questions`)
Alur kerja ketika pengguna membuka pop-up atau modal evaluasi di aplikasi frontend:

```mermaid
sequenceDiagram
    autonumber
    actor Nasabah as Pengguna / Nasabah
    participant UI as Frontend (Vue.js)
    participant SEC as Security Layer (CORS & RateLimit)
    participant API as Express API Server
    participant DB as PostgreSQL Database

    Nasabah->>UI: Klik tombol "Beri Masukan / Evaluasi"
    UI->>SEC: GET /api/v1/arrum-zada/feedback/questions
    SEC->>SEC: Validasi Origin & Kuota Rate Limit
    SEC->>API: Teruskan request ke feedbackController.getQuestions()
    API->>DB: SELECT * FROM feedback_questions WHERE is_active = true ORDER BY order_no ASC;
    DB-->>API: Kembalikan 10 butir pertanyaan aktif (JSONB options)
    API-->>UI: HTTP 200 OK (Array Pertanyaan Dinamis)
    UI-->>Nasabah: Render formulir evaluasi (rating star, pilihan ganda, textarea)
```

---

### 4.2 Alur 2: Pengiriman Masukan Responden (`POST /feedback` - ACID Transaction)
Alur ketika nasabah menekan tombol "Kirim Masukan" pada formulir evaluasi:

```mermaid
sequenceDiagram
    autonumber
    actor Nasabah as Pengguna / Nasabah
    participant UI as Frontend (Vue.js)
    participant SEC as Security Layer (CORS, RateLimit, Validator)
    participant API as Express Controller
    participant DB as PostgreSQL Client (Pool)

    Nasabah->>UI: Klik "Kirim Masukan"
    UI->>SEC: POST /api/v1/arrum-zada/feedback (Payload: respondent + answers)
    SEC->>SEC: 1. Cek CORS Whitelist
    SEC->>SEC: 2. Cek Submission Rate Limit (Maks 10 per 15 min)
    SEC->>SEC: 3. Validasi Regex Digit & Sanitasi Karakter
    SEC->>API: Teruskan payload bersih (req.cleanData)
    
    API->>DB: Ambil koneksi client & jalankan `BEGIN` (Mulai Transaksi)
    API->>DB: INSERT INTO feedback_submissions VALUES ($1..$7) RETURNING id, created_at;
    DB-->>API: Submissions terdaftar (ID: FB-202610-XXXXXX)
    
    loop Setiap Jawaban dalam Array
        API->>DB: INSERT INTO feedback_answers (submission_id, question_id, answer_value) VALUES ($1, $2, $3);
    end

    alt Semua Query Berhasil
        API->>DB: Jalankan `COMMIT`
        DB-->>API: Transaksi permanen tersimpan
        API-->>UI: HTTP 201 Created {"responseCode": 201, "responseDesc": "...", "data": {"submissionId": "..."}}
        UI-->>Nasabah: Tampilkan notifikasi "Terima kasih atas masukan Anda!"
    else Terjadi Kesalahan Database
        API->>DB: Jalankan `ROLLBACK` (Batalkan seluruh perubahan)
        API-->>UI: HTTP 500 Internal Server Error {"responseCode": 500, "responseDesc": "...", "data": null}
        UI-->>Nasabah: Tampilkan pesan gagal & opsi coba lagi
    end
```

---

### 4.3 Alur 3: Rekapitulasi Masukan Admin (`GET /submissions`)
Alur untuk tim produk dan Divisi PASTI saat menarik data agregasi hasil evaluasi:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tim Produk / Admin PASTI
    participant API as Express API Server
    participant SEC as SQLi Guard & Pagination Clamper
    participant DB as PostgreSQL Database

    Admin->>SEC: GET /api/v1/arrum-zada/feedback/submissions?limit=50&page=1
    SEC->>SEC: 1. Scan URL Parameter dari pola SQLi
    SEC->>SEC: 2. Clamping limit (1..100) dan hitung offset
    SEC->>API: Teruskan parameter bersih
    API->>DB: SELECT COUNT(*) FROM feedback_submissions;
    API->>DB: SELECT s.*, json_agg(q.question_text, a.answer_value) FROM submissions s LEFT JOIN answers a ... LIMIT $1 OFFSET $2;
    DB-->>API: Data agregasi JSON terstruktur
    API-->>Admin: HTTP 200 OK {"responseCode": 200, "responseDesc": "...", "data": {"items": [...], "meta": {...}}}
```

---

## 5. Perancangan Basis Data (Entity-Relationship Model)

Basis data `arrum_zada` dirancang secara normalisasi relasional dengan dukungan format semi-terstruktur `JSONB` untuk opsi pilihan ganda:

```mermaid
erDiagram
    feedback_questions ||--o{ feedback_answers : "dijawab dalam"
    feedback_submissions ||--|{ feedback_answers : "memiliki"

    feedback_questions {
        serial id PK "Identifier unik pertanyaan"
        varchar section "Kategori: fitur, tampilan, keterikatan, saran"
        text question_text "Redaksi pertanyaan survei BRD"
        varchar question_type "Tipe: rating_1_5, single_choice, multiple_choice, text"
        jsonb options "Opsi jawaban (opsional untuk pilihan ganda)"
        int order_no "Nomor urut tampilan di UI"
        boolean is_required "Mandatory flag"
        boolean is_active "Status kuesioner aktif"
        timestamp created_at "Waktu pembuatan pertanyaan"
    }

    feedback_submissions {
        varchar id PK "ID human-readable: FB-YYYYMM-HEX"
        varchar full_name "Nama lengkap responden (opsional)"
        varchar phone_number "Nomor WhatsApp/telepon"
        varchar age_range "Rentang umur responden"
        int target_hajj_year "Ekspektasi tahun keberangkatan haji"
        varchar user_agent "Informasi peramban/perangkat responden"
        varchar ip_address "IP Address responden untuk audit log"
        timestamp created_at "Waktu pengiriman formulir"
    }

    feedback_answers {
        bigserial id PK "Identifier unik jawaban"
        varchar submission_id FK "Relasi ke feedback_submissions.id"
        int question_id FK "Relasi ke feedback_questions.id"
        text answer_value "Nilai jawaban (skala rating, opsi, atau teks saran)"
        timestamp created_at "Waktu pencatatan jawaban"
    }
```

### 5.1 Strategi Indeks & Performa Query
- `idx_feedback_submissions_created_at`: Mengoptimalkan pengurutan data terbaru secara descending pada dashboard reporting.
- `idx_feedback_answers_submission_id`: Menghindari table scan saat melakukan `LEFT JOIN` antara tabel submissions dan answers.
- `idx_feedback_answers_question_id`: Mempercepat agregasi statistik rata-rata rating kepuasan per pertanyaan.
- `idx_feedback_questions_order`: Menjamin pembacaan pertanyaan berurutan tanpa penundaan latensi.

---

## 6. Arsitektur Keamanan Berlapis (Defense-in-Depth)

Sistem mengimplementasikan prinsip keamanan 4 lapis:

| Lapis Keamanan | Komponen Teknis | Mekanisme Perlindungan |
| :--- | :--- | :--- |
| **Layer 1: Perimeter & Origin** | `corsHandler.js` | Membatasi domain pemanggil hanya ke whitelist (`https://ifatich.github.io`, localhost dev). Menolak domain asing dengan **HTTP 403 Forbidden**. Preflight cache di browser selama 24 jam. |
| **Layer 2: Anti-Bruteforce & DoS** | `rateLimiter.js` | Menerapkan token bucket berbasis alamat IP: <br>• **Global:** 100 req/15 menit.<br>• **Submit:** 10 submit/15 menit untuk mencegah spam data sampah. Respon: **HTTP 429 Too Many Requests**. |
| **Layer 3: Anti-SQL Injection** | `sqlInjectionGuard.js` & `validateInput.js` | • Memindai pola `UNION`, `DROP TABLE`, `OR 1=1` pada query string (Respon: **HTTP 400**).<br>• Regex digit murni `/^\d+$/` untuk seluruh ID numerik.<br>• Sanitasi karakter null-byte (`\0`) dan batasan ukuran teks. |
| **Layer 4: Persistensi Aman** | `pg.Pool` & Transaction | Menggunakan **Parameterized Queries ($1, $2, ...)** resmi PostgreSQL. Nilai masukan dipisahkan pada level protokol biner, sehingga teks penyerang seperti `' OR '1'='1'` diperlakukan 100% sebagai literal data string. |

---

## 7. Spesifikasi Kontrak API & Endpoints

Seluruh endpoint terintegrasi dengan antarmuka interaktif OpenAPI 3.0 di [http://localhost:3000/docs](http://localhost:3000/docs):

| Method | Path Endpoint | Akses | Fungsi & Respon Utama |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Publik | Monitor ketersediaan server dan koneksi aktif PostgreSQL (`200 UP` / `503 DEGRADED`). |
| `GET` | `/docs` / `/api-docs` | Publik | Dokumentasi interaktif Swagger UI lengkap dengan skema request & response. |
| `GET` | `/api/v1/arrum-zada/feedback/questions` | Frontend | Mengambil seluruh butir pertanyaan kuesioner aktif (`200 OK`). |
| `POST` | `/api/v1/arrum-zada/feedback` | Frontend | Mengirim masukan kuesioner secara transaksional (`201 Created`, `400 Bad Request`, `429 Too Many Requests`). |
| `GET` | `/api/v1/arrum-zada/feedback/submissions` | Internal | Mengambil riwayat masukan masuk dengan paginasi aman (`200 OK`). |

---

## 8. Topologi Infrastruktur & Deployment

### 8.1 Lingkungan Pengembangan Lokal (Current Setup)
- **Host Mesin:** Local Development Workstation (Windows).
- **Runtime:** Node.js v18+ mengeksekusi Express server pada port `3000`.
- **Database Server:** Docker container `pg-local` mengeksekusi image `postgres:12` pada port `5432`.
- **Frontend Client:** GitHub Pages `https://ifatich.github.io/arrum-zada/`.

### 8.2 Topologi Target Produksi (Production Blueprint)

```mermaid
flowchart LR
    NasabahBrowser["Peramban Nasabah\n(Internet)"]
    
    subgraph DMZ["Zona Demiliterisasi (DMZ / Edge)"]
        WAF["Web Application Firewall\n(Cloudflare / CDN)"]
        Nginx["Reverse Proxy (Nginx)\nSSL Termination (HTTPS:443)"]
    end

    subgraph AppCluster["Klaster Aplikasi (Private Network)"]
        AppNode1["Express Server - Instance 1\n(PM2 Cluster Mode)"]
        AppNode2["Express Server - Instance 2\n(PM2 Cluster Mode)"]
    end

    subgraph DBCluster["Klaster Basis Data"]
        PrimaryPG[("PostgreSQL Primary\n(Read/Write Node)")]
        StandbyPG[("PostgreSQL Standby\n(Streaming Replication)")]
    end

    NasabahBrowser -->|"HTTPS:443"| WAF
    WAF --> Nginx
    Nginx -->|"Reverse Proxy :3000"| AppNode1
    Nginx -->|"Reverse Proxy :3000"| AppNode2
    AppNode1 -->|"Pool :5432"| PrimaryPG
    AppNode2 -->|"Pool :5432"| PrimaryPG
    PrimaryPG -.->|"Replikasi WAL"| StandbyPG
```

---

## 9. Kebutuhan Non-Fungsional (NFR)

1. **Ketersediaan (Availability):**
   - Target ketersediaan layanan backend $\ge 99.5\%$ pada jam operasional layanan simulasi emas haji.
   - Pemeriksaan kesehatan otomatis melalui endpoint `/health`.
2. **Kinerja & Latensi (Performance):**
   - Waktu respons API `GET /questions` di bawah **150 ms**.
   - Waktu respons transaksi `POST /feedback` di bawah **300 ms** pada beban transaksi standar.
3. **Integritas & Auditabilitas Data:**
   - Tidak ada data jawaban tanpa entitas submissions (*Zero Orphan Rows*) berkat proteksi Foreign Key.
   - Audit trail mencatat `created_at`, `ip_address`, dan `user_agent` untuk setiap pengiriman formulir.
4. **Penskalaan (Scalability):**
   - Arsitektur stateless pada Express.js memudahkan penambahan instance secara horizontal (*horizontal pod autoscaling*) di balik reverse proxy.

---

> [!TIP]
> Dokumen HLD ini dapat dijadikan acuan resmi bagi tim Frontend, Backend, Database Administrator, dan Security Auditor Divisi PASTI PT Pegadaian dalam memelihara serta mengembangkan integrasi ekosistem Arrum Zada.
