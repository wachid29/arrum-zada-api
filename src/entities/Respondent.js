/**
 * Entity Respondent
 * Mendefinisikan objek Identitas / Profil Responden
 */
class Respondent {
  constructor({ fullName = null, phoneNumber = null, ageRange = null, targetHajjYear = null } = {}) {
    this.fullName = fullName || null;
    this.phoneNumber = phoneNumber || null;
    this.ageRange = ageRange || null;
    this.targetHajjYear = targetHajjYear ? Number(targetHajjYear) : null;
  }

  /**
   * Factory method untuk membuat objek Respondent dari payload API
   */
  static fromPayload(data = {}) {
    if (!data) return new Respondent();
    return new Respondent({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      ageRange: data.ageRange,
      targetHajjYear: data.targetHajjYear,
    });
  }

  /**
   * Serialisasi objek Respondent
   */
  toJSON() {
    return {
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      ageRange: this.ageRange,
      targetHajjYear: this.targetHajjYear,
    };
  }
}

module.exports = Respondent;
