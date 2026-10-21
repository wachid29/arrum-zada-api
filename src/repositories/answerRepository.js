const db = require('../config/db');
const { Answer } = require('../entities');

/**
 * Repository: feedback_answers
 * Mengisolasi seluruh interaksi kueri database untuk butir jawaban kuesioner
 */
class AnswerRepository {
  /**
   * Menyimpan sekumpulan butir jawaban ke database dalam transaksi aktif
   * @param {import('pg').PoolClient} client - Client transaksi aktif
   * @param {string} submissionId - ID submission induk
   * @param {Array<{ questionId: number, answer: any }>} answers - Daftar butir jawaban
   * @returns {Promise<number>} Jumlah baris yang berhasil disimpan
   */
  async createMany(client, submissionId, answers = []) {
    const query = `
      INSERT INTO feedback_answers (submission_id, question_id, answer_value)
      VALUES ($1, $2, $3);
    `;

    let insertedCount = 0;
    for (const item of answers) {
      if (item.questionId && item.answer !== undefined && item.answer !== null) {
        const answerText = typeof item.answer === 'object' ? JSON.stringify(item.answer) : String(item.answer);
        await client.query(query, [
          submissionId,
          parseInt(item.questionId, 10),
          answerText.trim(),
        ]);
        insertedCount++;
      }
    }
    return insertedCount;
  }

  /**
   * Mengambil semua butir jawaban untuk suatu submission tertentu
   * @param {string} submissionId
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<Answer[]>}
   */
  async findBySubmissionId(submissionId, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        a.id, 
        a.submission_id AS "submissionId", 
        a.question_id AS "questionId", 
        a.answer_value AS "answerValue", 
        q.question_text AS "questionText", 
        q.section, 
        a.created_at AS "createdAt"
      FROM feedback_answers a
      JOIN feedback_questions q ON a.question_id = q.id
      WHERE a.submission_id = $1
      ORDER BY q.order_no ASC;
    `;
    const result = await executor.query(query, [submissionId]);
    return result.rows.map((row) => Answer.fromDatabase(row));
  }
}

module.exports = new AnswerRepository();
