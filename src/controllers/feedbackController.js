const crypto = require('crypto');
const db = require('../config/db');

/**
 * Generate Readable Unique ID, e.g: FB-202610-A9F82C
 */
function generateSubmissionId() {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FB-${dateStr}-${randomHex}`;
}

/**
 * GET /api/v1/arrum-zada/feedback/questions
 * Mengambil daftar pertanyaan aktif untuk ditampilkan di formulir Frontend
 */
async function getQuestions(req, res) {
  try {
    const query = `
      SELECT 
        id, 
        section, 
        question_text AS "questionText", 
        question_type AS "questionType", 
        options, 
        order_no AS "orderNo", 
        is_required AS "isRequired"
      FROM feedback_questions
      WHERE is_active = true
      ORDER BY order_no ASC;
    `;
    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      message: 'Daftar pertanyaan feedback berhasil diambil',
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getQuestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil pertanyaan',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/arrum-zada/feedback
 * Menyimpan jawaban & masukan pengguna (Menggunakan Transaction & Parameterized Queries)
 */
async function submitFeedback(req, res) {
  // Ambil data yang telah divalidasi dan disanitasi oleh middleware
  const { respondent, answers } = req.cleanData || req.body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PAYLOAD',
      message: 'Payload tidak valid: array answers wajib diisi minimal 1 jawaban',
    });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Parameterized Query untuk feedback_submissions
    const submissionId = generateSubmissionId();
    const fullName = respondent?.fullName || null;
    const phoneNumber = respondent?.phoneNumber || null;
    const ageRange = respondent?.ageRange || null;
    const targetHajjYear = respondent?.targetHajjYear || null;
    const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    const submissionQuery = `
      INSERT INTO feedback_submissions (
        id, full_name, phone_number, age_range, target_hajj_year, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at AS "createdAt";
    `;

    const subResult = await client.query(submissionQuery, [
      submissionId,
      fullName,
      phoneNumber,
      ageRange,
      targetHajjYear,
      userAgent,
      ipAddress,
    ]);

    // 2. Parameterized Query untuk feedback_answers
    const answerInsertQuery = `
      INSERT INTO feedback_answers (submission_id, question_id, answer_value)
      VALUES ($1, $2, $3);
    `;

    for (const item of answers) {
      if (item.questionId && item.answer !== undefined && item.answer !== null) {
        const answerText = typeof item.answer === 'object' ? JSON.stringify(item.answer) : String(item.answer);
        await client.query(answerInsertQuery, [
          submissionId,
          parseInt(item.questionId, 10),
          answerText.trim(),
        ]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Terima kasih atas masukan dan evaluasi Anda untuk Arrum Zada!',
      data: {
        submissionId: subResult.rows[0].id,
        submittedAt: subResult.rows[0].createdAt,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitFeedback:', error);
    return res.status(500).json({
      success: false,
      code: 'DB_TRANSACTION_ERROR',
      message: 'Gagal menyimpan masukan feedback ke dalam database.',
      error: error.message,
    });
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/arrum-zada/feedback/submissions
 * Mengambil ringkasan masukan yang masuk (Aman dari SQLi via Parameterized Queries & Clamped Limits)
 */
async function getSubmissions(req, res) {
  try {
    const limit = req.cleanQuery?.limit || Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const offset = req.cleanQuery?.offset || 0;
    const page = req.cleanQuery?.page || 1;

    // Menghitung total data submission
    const countResult = await db.query('SELECT COUNT(*) AS total FROM feedback_submissions');
    const totalRecords = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT 
        s.id AS "submissionId",
        s.full_name AS "fullName",
        s.phone_number AS "phoneNumber",
        s.age_range AS "ageRange",
        s.target_hajj_year AS "targetHajjYear",
        s.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'questionId', q.id,
              'questionText', q.question_text,
              'section', q.section,
              'answer', a.answer_value
            ) ORDER BY q.order_no
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS answers
      FROM feedback_submissions s
      LEFT JOIN feedback_answers a ON s.id = a.submission_id
      LEFT JOIN feedback_questions q ON a.question_id = q.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await db.query(query, [limit, offset]);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        limit,
        page,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getSubmissions:', error);
    return res.status(500).json({
      success: false,
      code: 'DB_QUERY_ERROR',
      message: 'Terjadi kesalahan saat mengambil data submission',
      error: error.message,
    });
  }
}

module.exports = {
  getQuestions,
  submitFeedback,
  getSubmissions,
};
