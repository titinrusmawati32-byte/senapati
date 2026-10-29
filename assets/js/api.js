/**
 * Klien API Frontend SD Negeri Sumberejo 04
 * Menghubungkan antarmuka web dengan Google Apps Script Web App secara REAL-TIME
 */

(function () {
  const getApiUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : "";
  };

  /**
   * Panggilan HTTP GET publik secara REAL-TIME tanpa cache browser
   * @param {string} action Nama endpoint aksi
   * @param {object} params Parameter query tambahan
   * @returns {Promise<any>}
   */
  async function apiGet(action, params = {}) {
    const url = getApiUrl();
    if (!url || url.includes("SAMPLE_DEPLOYMENT_ID")) {
      console.warn(`[API] API_URL belum dikonfigurasi. Menggunakan tampilan bawaan.`);
      return null;
    }

    try {
      // Tambahkan timestamp (_t) dan no-store agar data SELALU langsung diambil dari Google Sheets
      const qs = new URLSearchParams({ action, ...params, _t: Date.now() });
      const res = await fetch(`${url}?${qs.toString()}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: Gagal menghubungi server.`);
      }

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.message || "Permintaan API gagal diproses.");
      }
      return json.data;
    } catch (err) {
      console.error(`[API Error - ${action}]:`, err);
      throw err;
    }
  }

  /**
   * Panggilan HTTP POST (pendaftaran & formulir)
   * Menggunakan Content-Type text/plain;charset=utf-8 untuk menghindari CORS preflight
   * @param {object} payload Payload data JSON
   * @returns {Promise<any>}
   */
  async function apiPost(payload) {
    const url = getApiUrl();
    if (!url || url.includes("SAMPLE_DEPLOYMENT_ID")) {
      throw new Error("URL API belum dikonfigurasi.");
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: Gagal mengirim data ke server.`);
      }

      const json = await res.json();
      if (!json.ok) {
        const error = new Error(json.message || "Gagal memproses pendaftaran.");
        error.code = json.code;
        error.data = json.data;
        throw error;
      }
      return json.data;
    } catch (err) {
      console.error("[API POST Error]:", err);
      throw err;
    }
  }

  // Ekspor ke window global
  window.SchoolAPI = {
    get: apiGet,
    post: apiPost
  };
})();
