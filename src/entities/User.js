/**
 * Entity User
 * Merepresentasikan akun pengguna / pegawai PT Pegadaian (Super Admin / Administrator)
 */
class User {
  constructor({
    id = null,
    fullName = '',
    email = '',
    phoneNumber = '',
    nip = '',
    position = '',
    role = 'Administrator',
    passwordHash = null,
    isActive = true,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id ? Number(id) : null;
    this.fullName = fullName ? String(fullName).trim() : '';
    this.email = email ? String(email).trim().toLowerCase() : '';
    this.phoneNumber = phoneNumber ? String(phoneNumber).trim() : '';
    this.nip = nip ? String(nip).trim() : '';
    this.position = position ? String(position).trim() : '';
    this.role = role ? String(role).trim() : 'Administrator';
    this.passwordHash = passwordHash || null;
    this.isActive = typeof isActive === 'boolean' ? isActive : true;
    this.createdAt = createdAt || null;
    this.updatedAt = updatedAt || null;
  }

  /**
   * Factory method untuk membuat instance User dari database row PostgreSQL
   * @param {Object} row
   * @returns {User}
   */
  static fromDatabaseRow(row = {}) {
    if (!row) return null;
    return new User({
      id: row.id,
      fullName: row.full_name || row.fullName,
      email: row.email,
      phoneNumber: row.phone_number || row.phoneNumber,
      nip: row.nip,
      position: row.position,
      role: row.role,
      passwordHash: row.password_hash || row.passwordHash,
      isActive: row.is_active !== undefined ? row.is_active : row.isActive,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    });
  }

  /**
   * Factory method untuk membuat instance User dari payload pendaftaran (register)
   * @param {Object} payload
   * @param {string} passwordHash - Hash hasil enkripsi bcrypt
   * @returns {User}
   */
  static fromPayload(payload = {}, passwordHash = null) {
    return new User({
      fullName: payload.fullName,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      nip: payload.nip,
      position: payload.position,
      role: payload.role,
      passwordHash,
      isActive: true,
    });
  }

  /**
   * Serialisasi profil publik aman (tanpa pernah mengekspos hash kata sandi)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      nip: this.nip,
      position: this.position,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = User;
