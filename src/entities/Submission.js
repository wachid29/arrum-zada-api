const Respondent = require('./Respondent');
const Answer = require('./Answer');

/**
 * Entity Submission
 * Mendefinisikan objek Masukan Formulir Feedback Lengkap (Master & Answers)
 */
class Submission {
  constructor({
    id,
    fullName = null,
    phoneNumber = null,
    ageRange = null,
    targetHajjYear = null,
    userAgent = null,
    ipAddress = null,
    createdAt = new Date(),
    answers = [],
  }) {
    this.id = id;
    this.respondent = new Respondent({
      fullName,
      phoneNumber,
      ageRange,
      targetHajjYear,
    });
    this.userAgent = userAgent ? String(userAgent).slice(0, 500) : null;
    this.ipAddress = ipAddress || null;
    this.createdAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
    this.answers = Array.isArray(answers) ? answers : [];
  }

  get fullName() {
    return this.respondent.fullName;
  }

  get phoneNumber() {
    return this.respondent.phoneNumber;
  }

  get ageRange() {
    return this.respondent.ageRange;
  }

  get targetHajjYear() {
    return this.respondent.targetHajjYear;
  }

  /**
   * Factory method untuk membuat entitas Submission baru dari payload & client info
   */
  static create({ id, respondent, clientInfo = {}, answers = [] }) {
    const respObj = Respondent.fromPayload(respondent);
    const parsedAnswers = (answers || []).map((item) => Answer.fromPayload(id, item));

    return new Submission({
      id,
      fullName: respObj.fullName,
      phoneNumber: respObj.phoneNumber,
      ageRange: respObj.ageRange,
      targetHajjYear: respObj.targetHajjYear,
      userAgent: clientInfo.userAgent,
      ipAddress: clientInfo.ipAddress,
      answers: parsedAnswers,
    });
  }

  /**
   * Factory method untuk memetakan row database ke entitas Submission
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Submission({
      id: row.submissionId || row.id,
      fullName: row.fullName || row.full_name,
      phoneNumber: row.phoneNumber || row.phone_number,
      ageRange: row.ageRange || row.age_range,
      targetHajjYear: row.targetHajjYear || row.target_hajj_year,
      userAgent: row.userAgent || row.user_agent,
      ipAddress: row.ipAddress || row.ip_address,
      createdAt: row.createdAt || row.created_at,
      answers: row.answers || [],
    });
  }

  /**
   * Serialisasi entitas Submission untuk output API publik / admin
   */
  toJSON() {
    return {
      submissionId: this.id,
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      ageRange: this.ageRange,
      targetHajjYear: this.targetHajjYear,
      createdAt: this.createdAt,
      answers: this.answers,
    };
  }
}

module.exports = Submission;
