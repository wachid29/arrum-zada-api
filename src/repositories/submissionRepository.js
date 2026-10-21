const db = require('../config/db');
const { Submission } = require('../entities');

/**
 * Repository: feedback_submissions
 * Mengisolasi seluruh interaksi kueri database untuk data induk responden
 */
class SubmissionRepository {
  /**
   * Menyimpan entri masukan responden baru
   * @param {import('pg').PoolClient} client - Client transaksi aktif
   * @param {Submission} submissionEntity - Objek Submission yang akan disimpan
   * @returns {Promise<{ id: string, createdAt: string }>}
   */
  async create(client, submissionEntity) {
    const query = `
      INSERT INTO feedback_submissions (
        id, full_name, phone_number, age_range, target_hajj_year, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at AS "createdAt";
    `;

    const values = [
      submissionEntity.id,
      submissionEntity.fullName,
      submissionEntity.phoneNumber,
      submissionEntity.ageRange,
      submissionEntity.targetHajjYear,
      submissionEntity.userAgent,
      submissionEntity.ipAddress,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Menghitung total data submission yang tercatat
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<number>}
   */
  async countAll(client = null) {
    const executor = client || db;
    const result = await executor.query('SELECT COUNT(*) AS total FROM feedback_submissions;');
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Mengambil daftar submission beserta ringkasan jawaban kuesioner dengan paginasi
   * @param {{ limit: number, offset: number }} params
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<Array<Object>>}
   */
  async findAllWithAnswers({ limit = 50, offset = 0 }, client = null) {
    const executor = client || db;
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

    const result = await executor.query(query, [limit, offset]);
    return result.rows.map((row) => Submission.fromDatabase(row).toJSON());
  }

  /**
   * Mengambil satu data submission berdasarkan ID
   * @param {string} id
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<Object|null>}
   */
  async findById(id, client = null) {
    const executor = client || db;
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
      WHERE s.id = $1
      GROUP BY s.id;
    `;

    const result = await executor.query(query, [id]);
    if (!result.rows || result.rows.length === 0) return null;
    return Submission.fromDatabase(result.rows[0]).toJSON();
  }
}

module.exports = new SubmissionRepository();
