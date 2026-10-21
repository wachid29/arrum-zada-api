/**
 * Middleware Validasi & Sanitasi Input (Defense-in-Depth against SQL Injection & Input Tampering)
 */
const { sendResponse } = require('../utils/responseHelper');
const { normalizeToLocalPhone } = require('../utils/phoneHelper');

// Menghapus karakter null byte (\0) yang sering dipakai untuk mem-bypass parser/driver
function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.replace(/\0/g, '').trim().slice(0, maxLength);
}

/**
 * Validasi ketat untuk POST /feedback
 */
function validateFeedbackPayload(req, res, next) {
  const { respondent, answers } = req.body;

  // 1. Validasi Answers
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return sendResponse(res, 400, 'Payload tidak valid: array "answers" wajib disertakan dan tidak boleh kosong.', null);
  }

  if (answers.length > 50) {
    return sendResponse(res, 400, 'Jumlah jawaban melebihi batas wajar (maksimal 50 item).', null);
  }

  const cleanAnswers = [];
  for (let i = 0; i < answers.length; i++) {
    const item = answers[i];
    if (!item || typeof item !== 'object') {
      return sendResponse(res, 400, `Format butir jawaban pada indeks [${i}] tidak valid.`, null);
    }

    // Validasi ketat: hanya izinkan karakter digit murni (mencegah bypass parseInt '1 OR 1=1')
    const qIdStr = String(item.questionId).trim();
    if (!/^\d+$/.test(qIdStr)) {
      return sendResponse(res, 400, `ID pertanyaan pada indeks [${i}] harus berupa angka murni tanpa karakter asing.`, null);
    }

    const questionIdNum = parseInt(qIdStr, 10);
    if (questionIdNum <= 0) {
      return sendResponse(res, 400, `ID pertanyaan pada indeks [${i}] harus bernilai lebih besar dari 0.`, null);
    }

    if (item.answer === undefined || item.answer === null) {
      return sendResponse(res, 400, `Jawaban untuk questionId [${questionIdNum}] tidak boleh kosong.`, null);
    }

    // Konversi jawaban ke teks aman (maksimal 5000 karakter per jawaban)
    let rawAnswer = '';
    if (typeof item.answer === 'object') {
      rawAnswer = JSON.stringify(item.answer);
    } else {
      rawAnswer = String(item.answer);
    }

    cleanAnswers.push({
      questionId: questionIdNum,
      answer: sanitizeString(rawAnswer, 5000),
    });
  }

  // 2. Validasi Respondent (Opsional tapi harus bersih jika ada)
  const cleanRespondent = {
    fullName: null,
    phoneNumber: null,
    ageRange: null,
    targetHajjYear: null,
  };

  if (respondent && typeof respondent === 'object') {
    if (respondent.fullName) {
      cleanRespondent.fullName = sanitizeString(respondent.fullName, 150);
    }

    if (respondent.phoneNumber) {
      const phone = sanitizeString(respondent.phoneNumber, 25);
      // Validasi hanya angka, tanda +, spasi, tanda hubung (-)
      if (!/^[0-9+\s-]{6,25}$/.test(phone)) {
        return sendResponse(res, 400, 'Format nomor telepon tidak valid. Hanya boleh angka, +, spasi, atau tanda hubung.', null);
      }
      // Otomatis normalisasi format nomor ke format lokal diawali 08 (misal: +628... -> 08...)
      cleanRespondent.phoneNumber = normalizeToLocalPhone(phone);
    }

    if (respondent.ageRange) {
      cleanRespondent.ageRange = sanitizeString(respondent.ageRange, 50);
    }

    if (respondent.targetHajjYear !== undefined && respondent.targetHajjYear !== null && respondent.targetHajjYear !== '') {
      const yearStr = String(respondent.targetHajjYear).trim();
      if (!/^\d{4}$/.test(yearStr)) {
        return sendResponse(res, 400, 'Tahun target haji harus berupa 4 digit angka tahun yang valid (2024 - 2100).', null);
      }
      const year = parseInt(yearStr, 10);
      if (year < 2024 || year > 2100) {
        return sendResponse(res, 400, 'Tahun target haji harus antara tahun 2024 dan 2100.', null);
      }
      cleanRespondent.targetHajjYear = year;
    }
  }

  // Simpan data bersih yang sudah tersanitasi ke req.cleanData
  req.cleanData = {
    respondent: cleanRespondent,
    answers: cleanAnswers,
  };

  next();
}

/**
 * Validasi ketat untuk query params pada GET /submissions
 */
function validateSubmissionsQuery(req, res, next) {
  let limit = parseInt(req.query.limit || '50', 10);
  if (isNaN(limit) || limit < 1) {
    limit = 50;
  } else if (limit > 100) {
    limit = 100; // Batasi maksimal 100 baris per request
  }

  let page = parseInt(req.query.page || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  const offset = (page - 1) * limit;

  req.cleanQuery = {
    limit,
    page,
    offset,
  };

  next();
}

/**
 * Validasi ketat untuk registrasi akun pegawai PT Pegadaian (POST /api/v1/auth/register)
 * Aturan validasi:
 * - fullName: string, minimal 3 karakter
 * - email: string, format email valid, domain kedinasan (e.g. @pegadaian.co.id), bersifat unik
 * - phoneNumber: string, format nomor telepon seluler (E.164, diawali +62 atau 08)
 * - nip: string, Nomor Induk Pegawai PT Pegadaian (bersifat unik)
 * - position: string, nama jabatan struktural/fungsional pegawai
 * - role: enum, pilihan: 'Super Admin' atau 'Administrator'
 * - password: string, minimal 8 karakter
 * - confirmPassword: string, harus sama persis dengan password
 */
function validateRegisterPayload(req, res, next) {
  const {
    fullName,
    email,
    phoneNumber,
    nip,
    position,
    role,
    password,
    confirmPassword,
  } = req.body || {};

  // 1. Validasi fullName (Minimal 3 karakter)
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
    return sendResponse(
      res,
      400,
      'Nama lengkap (fullName) wajib diisi dan memiliki panjang minimal 3 karakter.',
      null
    );
  }

  // 2. Validasi email (format email valid dan domain kedinasan e.g. @pegadaian.co.id)
  if (!email || typeof email !== 'string') {
    return sendResponse(res, 400, 'Alamat email wajib diisi.', null);
  }

  const cleanEmail = sanitizeString(email.toLowerCase(), 255);
  const generalEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!generalEmailRegex.test(cleanEmail)) {
    return sendResponse(res, 400, 'Format alamat email tidak valid.', null);
  }

  // Cek domain kedinasan resmi PT Pegadaian (e.g. @pegadaian.co.id atau sub-domain resmi)
  const officialDomainRegex = /^[\w.+-]+@(?:[a-zA-Z0-9-]+\.)*pegadaian\.co\.id$/i;
  if (!officialDomainRegex.test(cleanEmail)) {
    return sendResponse(
      res,
      400,
      'Email harus menggunakan domain kedinasan resmi PT Pegadaian (contoh: nama@pegadaian.co.id).',
      null
    );
  }

  // 3. Validasi phoneNumber (Format seluler E.164, diawali +62 atau 08)
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return sendResponse(res, 400, 'Nomor telepon seluler (phoneNumber) wajib diisi.', null);
  }

  // Hapus spasi dan strip jika ada untuk pengecekan pola nomor
  const cleanPhone = sanitizeString(phoneNumber.replace(/[\s-]/g, ''), 25);
  const cellularPhoneRegex = /^(?:\+62|08)[0-9]{8,13}$/;
  if (!cellularPhoneRegex.test(cleanPhone)) {
    return sendResponse(
      res,
      400,
      'Format nomor telepon seluler tidak valid. Nomor harus diawali dengan +62 atau 08 dengan 10-15 digit angka.',
      null
    );
  }

  // Otomatis normalisasi format nomor ke format lokal diawali 08 (misal: +628... -> 08...)
  const normalizedPhone = normalizeToLocalPhone(cleanPhone);

  // 4. Validasi NIP (Nomor Induk Pegawai PT Pegadaian)
  if (!nip || typeof nip !== 'string') {
    return sendResponse(res, 400, 'Nomor Induk Pegawai (nip) wajib diisi.', null);
  }

  const cleanNip = sanitizeString(nip, 50);
  if (cleanNip.length < 3 || cleanNip.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(cleanNip)) {
    return sendResponse(
      res,
      400,
      'NIP harus berupa karakter alfanumerik antara 3 hingga 50 karakter.',
      null
    );
  }

  // 5. Validasi position (Nama jabatan struktural/fungsional pegawai)
  if (!position || typeof position !== 'string' || position.trim().length < 2) {
    return sendResponse(
      res,
      400,
      'Nama jabatan pegawai (position) wajib diisi minimal 2 karakter.',
      null
    );
  }
  const cleanPosition = sanitizeString(position, 100);

  // 6. Validasi role (Enum: 'Super Admin' atau 'Administrator')
  const validRoles = ['Super Admin', 'Administrator'];
  if (!role || typeof role !== 'string' || !validRoles.includes(role.trim())) {
    return sendResponse(
      res,
      400,
      "Peran pengguna (role) wajib dipilih antara 'Super Admin' atau 'Administrator'.",
      null
    );
  }
  const cleanRole = role.trim();

  // 7. Validasi password (Minimal 8 karakter)
  if (!password || typeof password !== 'string' || password.length < 8) {
    return sendResponse(
      res,
      400,
      'Kata sandi (password) wajib diisi dan memiliki panjang minimal 8 karakter.',
      null
    );
  }

  // 8. Validasi confirmPassword (Harus sama persis dengan password)
  if (confirmPassword === undefined || confirmPassword === null) {
    return sendResponse(
      res,
      400,
      'Konfirmasi kata sandi (confirmPassword) wajib disertakan.',
      null
    );
  }

  if (confirmPassword !== password) {
    return sendResponse(
      res,
      400,
      'Konfirmasi kata sandi (confirmPassword) harus sama persis dengan kata sandi (password).',
      null
    );
  }

  // Siapkan data bersih yang sudah tersanitasi
  req.cleanRegister = {
    fullName: sanitizeString(fullName, 150),
    email: cleanEmail,
    phoneNumber: normalizedPhone,
    nip: cleanNip,
    position: cleanPosition,
    role: cleanRole,
    password, // Password asli diteruskan untuk di-hash oleh service
  };

  next();
}

/**
 * Validasi ketat untuk login akun pengguna (POST /api/v1/auth/login)
 */
function validateLoginPayload(req, res, next) {
  const { identifier, email, nip, password } = req.body || {};
  const targetId = (identifier || email || nip || '').trim();

  if (!targetId) {
    return sendResponse(
      res,
      400,
      'Identitas login (email atau NIP) wajib diisi.',
      null
    );
  }

  if (!password || typeof password !== 'string') {
    return sendResponse(
      res,
      400,
      'Kata sandi (password) wajib diisi.',
      null
    );
  }

  req.cleanLogin = {
    identifier: sanitizeString(targetId, 255),
    password,
  };

  next();
}

module.exports = {
  validateFeedbackPayload,
  validateSubmissionsQuery,
  validateRegisterPayload,
  validateLoginPayload,
  sanitizeString,
};
