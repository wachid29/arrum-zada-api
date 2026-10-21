/**
 * Middleware Validasi & Sanitasi Input (Defense-in-Depth against SQL Injection & Input Tampering)
 */
const { sendResponse } = require('../utils/responseHelper');

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
      cleanRespondent.phoneNumber = phone;
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

module.exports = {
  validateFeedbackPayload,
  validateSubmissionsQuery,
  sanitizeString,
};
