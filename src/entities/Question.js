/**
 * Entity Question
 * Mendefinisikan objek Master Pertanyaan Feedback/Kuesioner
 */
class Question {
  constructor({
    id = null,
    section,
    questionText,
    questionType,
    options = null,
    orderNo = 1,
    isRequired = true,
    isActive = true,
    createdAt = new Date(),
  }) {
    this.id = id !== undefined && id !== null ? Number(id) : null;
    this.section = section;
    this.questionText = questionText;
    this.questionType = questionType;
    this.options = Array.isArray(options)
      ? options
      : typeof options === 'string'
      ? JSON.parse(options)
      : options;
    this.orderNo = Number(orderNo) || 1;
    this.isRequired = Boolean(isRequired);
    this.isActive = Boolean(isActive);
    this.createdAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
  }

  /**
   * Factory method untuk memetakan database row ke objek Question
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Question({
      id: row.id,
      section: row.section,
      questionText: row.questionText || row.question_text,
      questionType: row.questionType || row.question_type,
      options: row.options,
      orderNo: row.orderNo !== undefined ? row.orderNo : row.order_no,
      isRequired: row.isRequired !== undefined ? row.isRequired : row.is_required,
      isActive: row.isActive !== undefined ? row.isActive : row.is_active,
      createdAt: row.createdAt || row.created_at,
    });
  }

  /**
   * Serialisasi objek Question untuk response API
   */
  toJSON() {
    return {
      id: this.id,
      section: this.section,
      questionText: this.questionText,
      questionType: this.questionType,
      options: this.options,
      orderNo: this.orderNo,
      isRequired: this.isRequired,
    };
  }
}

module.exports = Question;
