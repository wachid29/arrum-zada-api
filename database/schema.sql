-- ====================================================================
-- DDL Schema Database PostgreSQL: Feedback & Evaluasi Arrum Zada
-- PT Pegadaian - Divisi PASTI
-- ====================================================================

-- 1. Tabel Master Pertanyaan Survei / Feedback
CREATE TABLE IF NOT EXISTS feedback_questions (
    id SERIAL PRIMARY KEY,
    section VARCHAR(50) NOT NULL,            -- 'fitur', 'tampilan', 'keterikatan', 'saran'
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,       -- 'rating_1_5', 'single_choice', 'multiple_choice', 'text'
    options JSONB DEFAULT NULL,              -- Array opsi jika pilihan ganda
    order_no INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Induk Masukan Responden (Submissions)
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id VARCHAR(50) PRIMARY KEY,              -- Contoh: 'FB-202610-A9F82C'
    full_name VARCHAR(150),
    phone_number VARCHAR(25),
    age_range VARCHAR(50),
    target_hajj_year INT,
    user_agent VARCHAR(500),
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Detail Jawaban Kuesioner (Answers)
CREATE TABLE IF NOT EXISTS feedback_answers (
    id BIGSERIAL PRIMARY KEY,
    submission_id VARCHAR(50) NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES feedback_questions(id),
    answer_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Master Data Pegawai / Admin (Users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(25) NOT NULL,
    nip VARCHAR(50) NOT NULL UNIQUE,
    position VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Administrator')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk optimasi query analitik dan reporting
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_submission_id ON feedback_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_question_id ON feedback_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_order ON feedback_questions(order_no ASC);

-- Indexing untuk autentikasi dan pencarian pengguna
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nip ON users (nip);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- ====================================================================
-- SEED DATA: 10 Butir Pertanyaan Resmi BRD Arrum Zada (Iterasi 2)
-- ====================================================================
INSERT INTO feedback_questions (id, section, question_text, question_type, options, order_no, is_required)
VALUES
(1, 'fitur', 'Fitur mana yang paling Anda sukai dari simulasi ini?', 'single_choice', '["Konversi Kebutuhan Dana ke Gram Emas", "Mengetahui Estimasi Cicilan Bulanan", "Rekomendasi Waktu Keberangkatan", "Fitur Download/Share PDF Rencana"]'::jsonb, 1, true),
(2, 'fitur', 'Bagian mana yang menurut Anda paling membingungkan atau sulit dipahami?', 'text', null, 2, false),
(3, 'tampilan', 'Bagaimana penilaian Anda terhadap kejelasan tata letak (layout) dan visual dashboard ini?', 'rating_1_5', null, 3, true),
(4, 'tampilan', 'Apakah informasi angka dan istilah syariah disajikan dengan mudah dipahami?', 'rating_1_5', null, 4, true),
(5, 'tampilan', 'Apakah kombinasi warna hijau dan emas Pegadaian terasa nyaman di mata?', 'rating_1_5', null, 5, true),
(6, 'keterikatan', 'Setelah mencoba simulasi ini, seberapa tertarik Anda untuk membuka tabungan emas / mendaftar porsi haji?', 'rating_1_5', null, 6, true),
(7, 'keterikatan', 'Seberapa besar kemungkinan Anda merekomendasikan simulasi ini kepada keluarga atau kerabat?', 'rating_1_5', null, 7, true),
(8, 'saran', 'Apa fitur atau informasi tambahan yang menurut Anda paling mendesak untuk ditambahkan?', 'text', null, 8, false),
(9, 'saran', 'Secara keseluruhan, bagaimana kepuasan Anda terhadap prototipe web ini?', 'rating_1_5', null, 9, true),
(10, 'saran', 'Tuliskan masukan atau kritik konstruktif lainnya untuk tim pengembang Pegadaian:', 'text', null, 10, false)
ON CONFLICT (id) DO NOTHING;

SELECT setval('feedback_questions_id_seq', (SELECT MAX(id) FROM feedback_questions));
