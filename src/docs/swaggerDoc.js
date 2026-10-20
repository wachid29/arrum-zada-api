const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Arrum Zada Feedback API',
    version: '1.0.0',
    description: `
Dokumentasi interaktif REST API untuk layanan evaluasi dan feedback dashboard simulasi emas haji **Arrum Zada - PT Pegadaian**.

### Fitur Utama:
* **Daftar Pertanyaan Dinamis:** Menyediakan pertanyaan evaluasi yang dikonfigurasi melalui database.
* **Pengumpulan Feedback:** Menyimpan data identitas responden dan jawaban kuesioner secara transaksional (ACID).
* **Rekap Masukan:** Menampilkan hasil feedback yang telah dikirimkan untuk kebutuhan analitik produk.

---

### Keamanan & Proteksi API:
1. **Perlindungan Brute-Force & DoS / Spamming (Rate Limiting):**
   * **Global API Limiter:** Maksimal **100 request per 15 menit** per IP address.
   * **Submission Strict Limiter:** Maksimal **10 pengiriman formulir per 15 menit** per IP pada endpoint \`POST /api/v1/arrum-zada/feedback\`.
   * Standard Headers disertakan: \`RateLimit-Limit\`, \`RateLimit-Remaining\`, dan \`RateLimit-Reset\`.
   * Melebihi kuota akan mengembalikan respon HTTP \`429 Too Many Requests\`.

2. **CORS Origin Whitelist & Preflight:**
   * Hanya origin terdaftar yang diizinkan melakukan request lintas domain (contoh: GitHub Pages \`https://ifatich.github.io\`, localhost Vite/Live Server).
   * Request dari domain yang tidak terdaftar akan ditolak dengan respon HTTP \`403 Forbidden\`.
   * Mendukung preflight caching \`OPTIONS\` selama 24 jam dengan header \`Access-Control-Allow-Credentials\`.

3. **HTTP Security Headers:**
   * Dilengkapi \`helmet\` untuk mencegah MIME-type sniffing (\`X-Content-Type-Options: nosniff\`), Clickjacking (\`X-Frame-Options: SAMEORIGIN\`), dan Strict Transport Security (HSTS).
    `,
    contact: {
      name: 'Divisi Pengembangan Aplikasi TI (PASTI) - PT Pegadaian',
      url: 'https://ifatich.github.io/arrum-zada/',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    {
      name: 'Feedback',
      description: 'Endpoint kuesioner dan pengumpulan feedback pengguna',
    },
    {
      name: 'System',
      description: 'Pemeriksaan status server dan database',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Pemeriksaan Kesehatan Server & Database',
        description: 'Mengecek ketersediaan server Express dan koneksi aktif ke PostgreSQL.',
        responses: {
          200: {
            description: 'Server dan database dalam kondisi normal (UP)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', example: '2026-10-20T04:00:00.000Z' },
                    database: { type: 'string', example: 'Connected' },
                  },
                },
              },
            },
          },
          503: {
            description: 'Database terputus atau mengalami gangguan (DEGRADED)',
          },
        },
      },
    },
    '/api/v1/arrum-zada/feedback/questions': {
      get: {
        tags: ['Feedback'],
        summary: 'Ambil Daftar Pertanyaan Aktif',
        description: 'Mengambil seluruh daftar butir pertanyaan evaluasi yang aktif dari database, diurutkan berdasarkan `orderNo`. Digunakan oleh Frontend Vue.js untuk membangun formulir masukan secara dinamis.',
        responses: {
          200: {
            description: 'Daftar pertanyaan berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Daftar pertanyaan feedback berhasil diambil' },
                    total: { type: 'integer', example: 10 },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Question',
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Kesalahan internal server saat mengambil pertanyaan',
          },
        },
      },
    },
    '/api/v1/arrum-zada/feedback': {
      post: {
        tags: ['Feedback'],
        summary: 'Kirim Jawaban & Masukan Pengguna',
        description: 'Menyimpan identitas responden dan jawaban kuesioner ke dalam tabel `feedback_submissions` dan `feedback_answers` secara transaksional.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/FeedbackSubmissionRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Masukan berhasil disimpan',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FeedbackSubmissionResponse',
                },
              },
            },
          },
          400: {
            description: 'Payload tidak valid (misal: array answers kosong)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Payload tidak valid: array answers wajib diisi minimal 1 jawaban' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Origin diblokir oleh kebijakan keamanan CORS',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    code: { type: 'string', example: 'CORS_FORBIDDEN' },
                    message: { type: 'string', example: "Akses diblokir: Origin 'https://unauthorized-domain.com' tidak terdaftar pada kebijakan CORS API." },
                  },
                },
              },
            },
          },
          429: {
            description: 'Batas Rate Limit tercapai (Proteksi Brute-force / Anti-Spam)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    code: { type: 'string', example: 'SUBMISSION_RATE_LIMIT_EXCEEDED' },
                    message: { type: 'string', example: 'Pengiriman masukan dibatasi untuk mencegah spam. Anda telah mencapai batas maksimal (10 kali per 15 menit).' },
                  },
                },
              },
            },
          },
          500: {
            description: 'Kesalahan server saat transaksi database',
          },
        },
      },
    },
    '/api/v1/arrum-zada/feedback/submissions': {
      get: {
        tags: ['Feedback'],
        summary: 'Ambil Rekapitulasi Masukan Pengguna (Admin / Reporting)',
        description: 'Menampilkan riwayat data masukan responden yang masuk beserta detail jawaban per pertanyaan.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Jumlah data maksimal yang diambil',
            required: false,
            schema: {
              type: 'integer',
              default: 50,
            },
          },
        ],
        responses: {
          200: {
            description: 'Daftar submission berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    total: { type: 'integer', example: 1 },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/SubmissionDetail',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Question: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          section: { type: 'string', example: 'fitur' },
          questionText: { type: 'string', example: 'Fitur mana yang paling Anda sukai dari simulasi ini?' },
          questionType: { type: 'string', example: 'single_choice', enum: ['rating_1_5', 'single_choice', 'multiple_choice', 'text'] },
          options: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
            example: ['Konversi Kebutuhan Dana ke Gram Emas', 'Mengetahui Estimasi Cicilan Bulanan'],
          },
          orderNo: { type: 'integer', example: 1 },
          isRequired: { type: 'boolean', example: true },
        },
      },
      Respondent: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Ahmad Fauzi' },
          phoneNumber: { type: 'string', example: '081234567890' },
          ageRange: { type: 'string', example: '25 - 35 tahun', enum: ['18 - 25 tahun', '25 - 35 tahun', '35 - 45 tahun', 'Diatas 45 tahun'] },
          targetHajjYear: { type: 'integer', example: 2035 },
        },
      },
      AnswerItem: {
        type: 'object',
        required: ['questionId', 'answer'],
        properties: {
          questionId: { type: 'integer', example: 1 },
          answer: {
            type: 'string',
            example: 'Konversi Kebutuhan Dana ke Gram Emas',
            description: 'Bisa berupa teks jawaban, pilihan ganda, atau angka rating (1-5)',
          },
        },
      },
      FeedbackSubmissionRequest: {
        type: 'object',
        required: ['answers'],
        properties: {
          respondent: {
            $ref: '#/components/schemas/Respondent',
          },
          answers: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/AnswerItem',
            },
            example: [
              { questionId: 1, answer: 'Konversi Kebutuhan Dana ke Gram Emas' },
              { questionId: 2, answer: 'Sangat penting' },
              { questionId: 4, answer: '5' },
              { questionId: 9, answer: '5' },
              { questionId: 10, answer: 'Sangat jelas dan membantu perencanaan haji keluarga!' },
            ],
          },
        },
      },
      FeedbackSubmissionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Terima kasih atas masukan dan evaluasi Anda untuk Arrum Zada!' },
          data: {
            type: 'object',
            properties: {
              submissionId: { type: 'string', example: 'FB-202610-A9F82C' },
              submittedAt: { type: 'string', example: '2026-10-20T04:00:00.000Z' },
            },
          },
        },
      },
      SubmissionDetail: {
        type: 'object',
        properties: {
          submissionId: { type: 'string', example: 'FB-202610-103167' },
          fullName: { type: 'string', example: 'Budi Santoso' },
          phoneNumber: { type: 'string', example: '081234567890' },
          ageRange: { type: 'string', example: '25 - 35 tahun' },
          targetHajjYear: { type: 'integer', example: 2032 },
          createdAt: { type: 'string', example: '2026-10-20T03:56:34.527Z' },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: { type: 'integer', example: 1 },
                questionText: { type: 'string', example: 'Fitur mana yang paling Anda sukai dari simulasi ini?' },
                section: { type: 'string', example: 'fitur' },
                answer: { type: 'string', example: 'Konversi Kebutuhan Dana ke Gram Emas' },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
