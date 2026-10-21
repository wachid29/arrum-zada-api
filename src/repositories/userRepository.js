const db = require('../config/db');
const { User } = require('../entities');

/**
 * Repository: users
 * Mengisolasi seluruh interaksi query database untuk data pengguna / pegawai PT Pegadaian
 */
class UserRepository {
  /**
   * Menyimpan akun pengguna baru ke tabel users
   * @param {import('pg').PoolClient|null} client
   * @param {User} userEntity
   * @returns {Promise<User>}
   */
  async create(client = null, userEntity) {
    const executor = client || db;
    const query = `
      INSERT INTO users (
        full_name, email, phone_number, nip, position, role, password_hash, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, 
        full_name AS "fullName", 
        email, 
        phone_number AS "phoneNumber", 
        nip, 
        position, 
        role, 
        password_hash AS "passwordHash", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt";
    `;

    const values = [
      userEntity.fullName,
      userEntity.email.toLowerCase(),
      userEntity.phoneNumber,
      userEntity.nip,
      userEntity.position,
      userEntity.role,
      userEntity.passwordHash,
      userEntity.isActive !== undefined ? userEntity.isActive : true,
    ];

    const result = await executor.query(query, values);
    return User.fromDatabaseRow(result.rows[0]);
  }

  /**
   * Mencari pengguna berdasarkan alamat email (case-insensitive)
   * @param {string} email
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<User|null>}
   */
  async findByEmail(email, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        id, 
        full_name AS "fullName", 
        email, 
        phone_number AS "phoneNumber", 
        nip, 
        position, 
        role, 
        password_hash AS "passwordHash", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM users 
      WHERE LOWER(email) = LOWER($1) 
      LIMIT 1;
    `;
    const result = await executor.query(query, [email.trim()]);
    if (result.rows.length === 0) return null;
    return User.fromDatabaseRow(result.rows[0]);
  }

  /**
   * Mencari pengguna berdasarkan NIP
   * @param {string} nip
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<User|null>}
   */
  async findByNip(nip, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        id, 
        full_name AS "fullName", 
        email, 
        phone_number AS "phoneNumber", 
        nip, 
        position, 
        role, 
        password_hash AS "passwordHash", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM users 
      WHERE nip = $1 
      LIMIT 1;
    `;
    const result = await executor.query(query, [nip.trim()]);
    if (result.rows.length === 0) return null;
    return User.fromDatabaseRow(result.rows[0]);
  }

  /**
   * Mencari pengguna berdasarkan email atau NIP (berguna untuk fleksibilitas form login)
   * @param {string} identifier
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<User|null>}
   */
  async findByIdentifier(identifier, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        id, 
        full_name AS "fullName", 
        email, 
        phone_number AS "phoneNumber", 
        nip, 
        position, 
        role, 
        password_hash AS "passwordHash", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM users 
      WHERE LOWER(email) = LOWER($1) OR nip = $1 
      LIMIT 1;
    `;
    const cleanId = identifier.trim();
    const result = await executor.query(query, [cleanId]);
    if (result.rows.length === 0) return null;
    return User.fromDatabaseRow(result.rows[0]);
  }

  /**
   * Mencari pengguna berdasarkan ID primary key
   * @param {number|string} id
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<User|null>}
   */
  async findById(id, client = null) {
    const executor = client || db;
    const query = `
      SELECT 
        id, 
        full_name AS "fullName", 
        email, 
        phone_number AS "phoneNumber", 
        nip, 
        position, 
        role, 
        password_hash AS "passwordHash", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM users 
      WHERE id = $1 
      LIMIT 1;
    `;
    const result = await executor.query(query, [parseInt(id, 10)]);
    if (result.rows.length === 0) return null;
    return User.fromDatabaseRow(result.rows[0]);
  }

  /**
   * Menghitung total data pengguna
   * @param {import('pg').PoolClient|null} client
   * @returns {Promise<number>}
   */
  async countAll(client = null) {
    const executor = client || db;
    const result = await executor.query('SELECT COUNT(*) AS total FROM users;');
    return parseInt(result.rows[0].total, 10);
  }
}

module.exports = new UserRepository();
