/**
 * Response Helper Utility
 * Menstandarisasi seluruh format respon API sesuai standar enterprise:
 * - responseCode: HTTP Status Code (misal: 200, 201, 400, 403, 404, 429, 500, 503)
 * - responseDesc: Pesan deskripsi/keterangan respon
 * - data: Hasil balikan fungsi (nullable: objek, array, atau null)
 * - jika terdapat paginasi, objek meta disertakan di dalam data: { items: [...], meta: { ... } }
 */

function formatResponse(responseCode, responseDesc, data = null) {
  return {
    responseCode,
    responseDesc,
    data,
  };
}

function sendResponse(res, responseCode, responseDesc, data = null) {
  return res.status(responseCode).json(formatResponse(responseCode, responseDesc, data));
}

function sendPaginatedResponse(res, responseCode, responseDesc, items, meta) {
  return res.status(responseCode).json(
    formatResponse(responseCode, responseDesc, {
      items,
      meta,
    })
  );
}

module.exports = {
  formatResponse,
  sendResponse,
  sendPaginatedResponse,
};
