const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../entities');
const { userRepository } = require('../repositories');
const { normalizeToLocalPhone } = require('../utils/phoneHelper');

const BCRYPT_SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'arrum-zada-super-secret-jwt-key-2026-pegadaian-pasti';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Service: Authentication & User Management
 * Menangani registrasi, login, hashing password (bcrypt), dan penerbitan token JWT
 */
class AuthService {
  /**
   * Menghasilkan token JWT untuk pengguna
   * @param {User} user
   * @returns {string}
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      nip: user.nip,
      role: user.role,
      position: user.position,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verifikasi token JWT
   * @param {string} token
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Registrasi akun baru pegawai Pegadaian
   * @param {Object} payload
   * @returns {Promise<{ token: string, tokenType: string, expiresIn: string, user: Object }>}
   */
  async register(payload) {
    const cleanEmail = String(payload.email || '').trim().toLowerCase();
    const cleanNip = String(payload.nip || '').trim();

    // 1. Cek duplikasi email (Unique Constraint)
    const existingEmail = await userRepository.findByEmail(cleanEmail);
    if (existingEmail) {
      const error = new Error('Email sudah terdaftar. Silakan gunakan email kedinasan lain.');
      error.status = 409;
      throw error;
    }

    // 2. Cek duplikasi NIP (Unique Constraint)
    const existingNip = await userRepository.findByNip(cleanNip);
    if (existingNip) {
      const error = new Error('NIP sudah terdaftar. Silakan periksa kembali Nomor Induk Pegawai Anda.');
      error.status = 409;
      throw error;
    }

    // 3. Hash password satu arah menggunakan bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);

    // 4. Buat entitas User dengan normalisasi format nomor HP lokal (08)
    const normalizedPhone = normalizeToLocalPhone(payload.phoneNumber);
    const userEntity = User.fromPayload(
      {
        fullName: payload.fullName,
        email: cleanEmail,
        phoneNumber: normalizedPhone,
        nip: cleanNip,
        position: payload.position,
        role: payload.role,
      },
      passwordHash
    );

    // 5. Simpan ke database
    const savedUser = await userRepository.create(null, userEntity);

    // Registrasi berhasil: kembalikan data user terdaftar tanpa token (user wajib login untuk mendapatkan token)
    return {
      user: savedUser.toJSON(),
    };
  }

  /**
   * Autentikasi dan login pengguna (mendukung identifier berupa email atau NIP)
   * @param {{ identifier?: string, email?: string, nip?: string, password: string }} credentials
   * @returns {Promise<{ token: string, tokenType: string, expiresIn: string, user: Object }>}
   */
  async login({ identifier, email, nip, password }) {
    const targetIdentifier = (identifier || email || nip || '').trim();

    if (!targetIdentifier || !password) {
      const error = new Error('Email/NIP dan password wajib diisi.');
      error.status = 400;
      throw error;
    }

    // 1. Cari user berdasarkan Email atau NIP
    const user = await userRepository.findByIdentifier(targetIdentifier);
    if (!user) {
      const error = new Error('Email/NIP atau password tidak valid.');
      error.status = 401;
      throw error;
    }

    // 2. Verifikasi status keaktifan user
    if (!user.isActive) {
      const error = new Error('Akun dinonaktifkan. Silakan hubungi Administrator.');
      error.status = 403;
      throw error;
    }

    // 3. Komparasi hash password aman
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      const error = new Error('Email/NIP atau password tidak valid.');
      error.status = 401;
      throw error;
    }

    // 4. Terbitkan token JWT
    const token = this.generateToken(user);

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN,
      user: user.toJSON(),
    };
  }

  /**
   * Mengambil data profil pengguna berdasarkan ID
   * @param {number|string} userId
   * @returns {Promise<Object>}
   */
  async getUserProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('Pengguna tidak ditemukan.');
      error.status = 404;
      throw error;
    }
    return user.toJSON();
  }
}

module.exports = new AuthService();
