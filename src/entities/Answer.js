/**
 * Entity Answer
 * Mendefinisikan objek Butir Jawaban Kuesioner
 */
class Answer {
  constructor({
    id = null,
    submissionId,
    questionId,
    answerValue,
    questionText = null,
    section = null,
    createdAt = new Date(),
  }) {
    this.id = id !== undefined && id !== null ? Number(id) : null;
    this.submissionId = submissionId;
    this.questionId = Number(questionId);
    this.answerValue =
      typeof answerValue === 'object' && answerValue !== null
        ? JSON.stringify(answerValue)
        : String(answerValue ?? '');
    this.questionText = questionText;
    this.section = section;
    this.createdAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
  }

  /**
   * Factory method untuk membuat objek Answer dari item payload jawaban
   */
  static fromPayload(submissionId, item) {
    return new Answer({
      submissionId,
      questionId: item.questionId,
      answerValue: item.answer,
    });
  }

  /**
   * Factory method untuk memetakan row database ke objek Answer
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Answer({
      id: row.id,
      submissionId: row.submission_id || row.submissionId,
      questionId: row.question_id || row.questionId,
      answerValue: row.answer_value || row.answer,
      questionText: row.question_text || row.questionText,
      section: row.section,
      createdAt: row.created_at || row.createdAt,
    });
  }

  /**
   * Serialisasi objek Answer untuk response API
   */
  toJSON() {
    const obj = {
      questionId: this.questionId,
      answer: this.answerValue,
    };
    if (this.questionText) obj.questionText = this.questionText;
    if (this.section) obj.section = this.section;
    return obj;
  }
}

module.exports = Answer;
