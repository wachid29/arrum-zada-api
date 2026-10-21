const db = require('../config/db');
const { Question } = require('../entities');

/**
 * Repository: feedback_questions
 * Mengisolasi seluruh interaksi kueri database untuk data pertanyaan survei
 */
class QuestionRepository {
  /**
   * Mengambil semua pertanyaan kuesioner yang berstatus aktif
   * @param {import('pg').PoolClient|null} client - Opsional client jika dalam transaksi
   * @returns {Promise<Question[]>}
   */
  async findAllActive(client = null) {
    const executor = client || db;
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
    const result = await executor.query(query);
    return result.rows.map((row) => Question.fromDatabase(row));
  }

  /**
   * Mengambil pertanyaan berdasarkan ID
   * @param {number} id
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<Question|null>}
   */
  async findById(id, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        id, 
        section, 
        question_text AS "questionText", 
        question_type AS "questionType", 
        options, 
        order_no AS "orderNo", 
        is_required AS "isRequired",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM feedback_questions
      WHERE id = $1;
    `;
    const result = await executor.query(query, [id]);
    if (!result.rows || result.rows.length === 0) return null;
    return Question.fromDatabase(result.rows[0]);
  }
}

module.exports = new QuestionRepository();
