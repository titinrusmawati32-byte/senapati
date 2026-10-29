/**
 * Google Apps Script - SD Negeri Sumberejo 04 Backend API
 * Sesuai spesifikasi PRD.md dan API.md versi 1.0
 */

// Konfigurasi Script Properties
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSpreadsheet() {
  const sheetId = getProperty("SHEET_ID");
  if (!sheetId) throw new Error("SHEET_ID belum dikonfigurasi di Script Properties.");
  return SpreadsheetApp.openById(sheetId);
}

function getSpmbFolder() {
  const folderId = getProperty("FOLDER_SPMB_ID");
  if (!folderId) throw new Error("FOLDER_SPMB_ID belum dikonfigurasi di Script Properties.");
  return DriveApp.getFolderById(folderId);
}

/**
 * Endpoint GET publik
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : "";
    switch (action) {
      case "getSiteConfig":
        return ok(getSiteConfig());
      case "getPengumuman":
        return ok(getPengumuman(e.parameter.limit));
      case "getGuru":
        return ok(getGuru());
      case "getEkskul":
        return ok(getEkskul());
      case "getFasilitas":
        return ok(getFasilitas());
      case "getGaleri":
        return ok(getGaleri(e.parameter.limit));
      case "cekStatus":
        return ok(cekStatus(e.parameter.nomor));
      default:
        return fail("BAD_REQUEST", "Action tidak dikenal atau parameter kosong.");
    }
  } catch (err) {
    Logger.log("doGet Error: " + err.toString());
    return fail("INTERNAL_ERROR", "Terjadi kesalahan di server: " + err.message);
  }
}

/**
 * Endpoint POST
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return fail("BAD_REQUEST", "Konten permintaan tidak ditemukan.");
    }
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case "submitPendaftaran":
        return ok(submitPendaftaran(body), "Pendaftaran berhasil. Simpan nomor pendaftaran Anda.");
      case "admin_refreshCache":
        return adminRefreshCache(body);
      case "admin_setPeriode":
        return adminSetPeriode(body);
      default:
        return fail("BAD_REQUEST", "Action tidak dikenal: " + action);
    }
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return fail("INTERNAL_ERROR", "Terjadi kesalahan internal server: " + err.message);
  }
}

// ==========================================
// LOGIKA ENDPOINT GET & CACHE
// ==========================================

function getSiteConfig() {
  const cacheKey = "site_config_v1";
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) throw new Error("Sheet 'Pengaturan' tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  const config = {};

  // Daftar putih kunci publik sesuai spesifikasi API.md
  const publicKeys = [
    "namaSekolah", "alamat", "telepon", "email", "whatsapp",
    "jamLayanan", "mapEmbedUrl", "spmbStatus", "spmbMulai",
    "spmbSelesai", "spmbJadwalBerikutnya", "biayaPendaftaran",
    "akreditasi", "jumlahSiswa", "jumlahGuru", "sambutanKepsek"
  ];

  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0]).trim();
    let val = values[i][1];
    if (val instanceof Date) {
      val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
    }
    if (publicKeys.includes(key)) {
      config[key] = val !== undefined ? val : "";
    }
  }

  cache.put(cacheKey, JSON.stringify(config), 300); // 5 menit
  return config;
}

function getPengumuman(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 10);
  const cacheKey = "pengumuman_limit_" + limit;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getPublicRowsFromSheet("Pengumuman");
  // Urutkan tanggal terbaru
  rows.sort((a, b) => {
    const da = new Date(a.tanggal || 0).getTime();
    const db = new Date(b.tanggal || 0).getTime();
    return db - da;
  });

  const result = rows.slice(0, limit);
  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

function getGuru() {
  const cacheKey = "guru_list_v1";
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getPublicRowsFromSheet("Guru");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));

  cache.put(cacheKey, JSON.stringify(rows), 300);
  return rows;
}

function getEkskul() {
  const cacheKey = "ekskul_list_v1";
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getPublicRowsFromSheet("Ekstrakurikuler");
  cache.put(cacheKey, JSON.stringify(rows), 300);
  return rows;
}

function getFasilitas() {
  const cacheKey = "fasilitas_list_v1";
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getPublicRowsFromSheet("Fasilitas");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));

  cache.put(cacheKey, JSON.stringify(rows), 300);
  return rows;
}

function getGaleri(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 20);
  const cacheKey = "galeri_limit_" + limit;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getPublicRowsFromSheet("Galeri");
  rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  const result = rows.slice(0, limit);

  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

function cekStatus(nomor) {
  if (!nomor || typeof nomor !== "string") {
    throw new Error("Parameter nomor pendaftaran wajib disertakan.");
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pendaftar");
  if (!sheet) throw new Error("Sheet 'Pendaftar' tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return { ditemukan: false, message: "Belum ada data pendaftaran." };
  }

  const headers = values[0].map(h => String(h).trim());
  const idxNomor = headers.indexOf("nomorPendaftaran");
  const idxNama = headers.indexOf("namaMurid");
  const idxStatus = headers.indexOf("status");
  const idxWaktu = headers.indexOf("waktuDaftar");
  const idxCatatan = headers.indexOf("catatanAdmin");

  const target = nomor.trim().toUpperCase();

  for (let i = 1; i < values.length; i++) {
    const rowNomor = String(values[i][idxNomor]).trim().toUpperCase();
    if (rowNomor === target) {
      return {
        ditemukan: true,
        nomorPendaftaran: values[i][idxNomor],
        namaMurid: values[i][idxNama],
        status: values[i][idxStatus] || "diproses",
        waktuDaftar: values[i][idxWaktu],
        catatanAdmin: values[i][idxCatatan] || ""
      };
    }
  }

  return { ditemukan: false, message: "Nomor pendaftaran tidak ditemukan." };
}

function getPublicRowsFromSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const tampilIdx = headers.indexOf("tampil");

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Filter hanya yang tampil === true atau "TRUE"
    if (tampilIdx !== -1) {
      const isTampil = row[tampilIdx] === true || String(row[tampilIdx]).toUpperCase() === "TRUE";
      if (!isTampil) continue;
    }

    const obj = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
      }
      obj[h] = val !== undefined ? val : "";
    });
    results.push(obj);
  }
  return results;
}

// ==========================================
// LOGIKA PENDAFTARAN (submitPendaftaran)
// ==========================================

function submitPendaftaran(body) {
  // 1. Honeypot check: Bot detection
  if (body.honeypot && String(body.honeypot).trim() !== "") {
    // Return fake success
    return {
      nomorPendaftaran: "SPMB-" + new Date().getFullYear() + "-0000",
      tanggal: new Date().toISOString()
    };
  }

  const data = body.data || {};
  const berkas = body.berkas || [];

  // Validasi isian formulir
  validasiDataPendaftar(data);
  validasiBerkas(berkas);

  // 2. Anti-Spam / Rate Limit
  const cache = CacheService.getScriptCache();
  const rateLimitKey = "rate_limit_" + Utilities.base64EncodeWebSafe(data.nik + "_" + data.hp);
  if (cache.get(rateLimitKey)) {
    throw new Error("RATE_LIMITED: Anda sudah mengirim pendaftaran baru-baru ini. Mohon tunggu 1 menit.");
  }

  // 3. Cek Periode SPMB
  const allConfig = getFullConfigMap();
  const statusSpmb = (allConfig.spmbStatus || "tutup").toLowerCase().trim();
  const now = new Date();
  const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");

  if (statusSpmb !== "buka") {
    throw new Error("OUT_OF_PERIOD: Pendaftaran SPMB saat ini sedang ditutup.");
  }

  if (allConfig.spmbMulai && todayStr < allConfig.spmbMulai) {
    throw new Error("OUT_OF_PERIOD: Periode pendaftaran belum dimulai.");
  }

  if (allConfig.spmbSelesai && todayStr > allConfig.spmbSelesai) {
    throw new Error("OUT_OF_PERIOD: Periode pendaftaran telah berakhir.");
  }

  // Cek batas harian
  const dailyKey = "spmb_count_" + todayStr;
  const currentDailyCount = parseInt(cache.get(dailyKey) || "0", 10);
  const maxDaily = parseInt(allConfig.batasHarianDaftar || "100", 10);
  if (currentDailyCount >= maxDaily) {
    throw new Error("RATE_LIMITED: Batas kuota pendaftaran hari ini telah tercapai. Silakan coba kembali besok.");
  }

  // 4. Kunci transaksi dengan LockService untuk mencegah data race & duplikasi nomor
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000); // Tunggu sampai 30 detik
  if (!hasLock) {
    throw new Error("INTERNAL_ERROR: Sistem sedang sibuk memproses pendaftaran lain. Silakan coba sesaat lagi.");
  }

  const uploadedFiles = [];
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Pendaftar");
    if (!sheet) throw new Error("Sheet 'Pendaftar' tidak ditemukan di database.");

    // Cek duplikasi NIK di sheet Pendaftar
    const existingValues = sheet.getDataRange().getValues();
    const headers = existingValues[0].map(h => String(h).trim());
    const nikIdx = headers.indexOf("nik");

    if (nikIdx !== -1) {
      for (let i = 1; i < existingValues.length; i++) {
        const valNik = String(existingValues[i][nikIdx]).replace(/^'/, "").trim();
        if (valNik === data.nik) {
          throw new Error("VALIDATION_ERROR: NIK " + data.nik + " sudah terdaftar di sistem. Silakan hubungi admin sekolah bila ada kendala.");
        }
      }
    }

    // 5. Generate Nomor Pendaftaran SPMB-YYYY-XXXX
    const tahun = now.getFullYear();
    const totalPendaftar = existingValues.length; // Baris 1 adalah header, baris 2 adalah pendaftar ke-1
    const nomorUrut = ("0000" + totalPendaftar).slice(-4);
    const nomorPendaftaran = `SPMB-${tahun}-${nomorUrut}`;

    // 6. Simpan Berkas ke Google Drive
    const spmbFolder = getSpmbFolder();
    let linkKk = "";
    let linkAkta = "";

    berkas.forEach(b => {
      const field = b.field;
      const mime = b.mime;
      const base64Str = b.base64;
      const extension = mime === "application/pdf" ? "pdf" : (mime === "image/png" ? "png" : "jpg");
      const fileName = `${nomorPendaftaran}_${field}.${extension}`;

      const decodedBytes = Utilities.base64Decode(base64Str);
      const blob = Utilities.newBlob(decodedBytes, mime, fileName);
      const file = spmbFolder.createFile(blob);
      uploadedFiles.push(file);

      if (field === "kk") linkKk = file.getUrl();
      if (field === "akta") linkAkta = file.getUrl();
    });

    // 7. Simpan Baris ke Sheet Pendaftar
    const waktuDaftar = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    const newRow = [
      nomorPendaftaran,
      waktuDaftar,
      data.namaMurid.trim(),
      "'" + data.nik.trim(),
      data.tempatLahir.trim(),
      data.tanggalLahir.trim(),
      data.jenisKelamin.trim(),
      data.namaOrtu.trim(),
      "'" + data.nikOrtu.trim(),
      "'" + data.hp.trim(),
      (data.email || "").trim(),
      data.alamat.trim(),
      (data.asalTk || "").trim(),
      linkKk,
      linkAkta,
      "baru",
      ""
    ];

    sheet.appendRow(newRow);

    // Update daily counter
    cache.put(dailyKey, String(currentDailyCount + 1), 86400);
    // Rate limit per NIK/HP 60 detik
    cache.put(rateLimitKey, "1", 60);

    // 8. Kirim notifikasi email ke Admin jika dikonfigurasi
    const adminEmail = allConfig.emailNotifikasi;
    if (adminEmail && adminEmail.includes("@")) {
      try {
        MailApp.sendEmail({
          to: adminEmail,
          subject: `[SPMB SDN Sumberejo 04] Pendaftar Baru: ${nomorPendaftaran} - ${data.namaMurid}`,
          body: `Halo Admin,\n\nTelah masuk pendaftaran murid baru:\n\n` +
            `Nomor Pendaftaran : ${nomorPendaftaran}\n` +
            `Waktu             : ${waktuDaftar}\n` +
            `Nama Calon Murid  : ${data.namaMurid}\n` +
            `NIK Murid         : ${data.nik}\n` +
            `Nama Orang Tua    : ${data.namaOrtu}\n` +
            `No. WhatsApp/HP   : ${data.hp}\n` +
            `Alamat            : ${data.alamat}\n\n` +
            `Berkas KK         : ${linkKk}\n` +
            `Berkas Akta       : ${linkAkta}\n\n` +
            `Silakan tinjau data selengkapnya di Google Sheets Pendaftar.`
        });
      } catch (mailErr) {
        Logger.log("Gagal mengirim email notifikasi admin: " + mailErr.toString());
      }
    }

    return {
      nomorPendaftaran: nomorPendaftaran,
      tanggal: waktuDaftar
    };
  } catch (err) {
    // Rollback: Hapus file drive yang sempat dibuat jika proses gagal
    uploadedFiles.forEach(f => {
      try { f.setTrashed(true); } catch (e) {}
    });
    throw err;
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// VALIDASI FORMULIR & BERKAS
// ==========================================

function validasiDataPendaftar(data) {
  if (!data) throw new Error("VALIDATION_ERROR: Data formulir tidak boleh kosong.");

  if (!data.namaMurid || String(data.namaMurid).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Nama lengkap calon murid wajib diisi.");
  }
  if (data.namaMurid.length > 100) {
    throw new Error("VALIDATION_ERROR: Nama murid maksimal 100 karakter.");
  }

  if (!data.nik || !/^\d{16}$/.test(String(data.nik).trim())) {
    throw new Error("VALIDATION_ERROR: NIK calon murid harus tepat 16 digit angka.");
  }

  if (!data.tempatLahir || String(data.tempatLahir).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Tempat lahir wajib diisi.");
  }

  if (!data.tanggalLahir || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.tanggalLahir).trim())) {
    throw new Error("VALIDATION_ERROR: Tanggal lahir harus dalam format YYYY-MM-DD.");
  }

  if (!data.jenisKelamin || (data.jenisKelamin !== "Laki-laki" && data.jenisKelamin !== "Perempuan")) {
    throw new Error("VALIDATION_ERROR: Jenis kelamin harus 'Laki-laki' atau 'Perempuan'.");
  }

  if (!data.namaOrtu || String(data.namaOrtu).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Nama orang tua/wali wajib diisi.");
  }

  if (!data.nikOrtu || !/^\d{16}$/.test(String(data.nikOrtu).trim())) {
    throw new Error("VALIDATION_ERROR: NIK orang tua/wali harus tepat 16 digit angka.");
  }

  const cleanHp = String(data.hp || "").trim();
  if (!cleanHp || !/^(08|62)\d{8,12}$/.test(cleanHp)) {
    throw new Error("VALIDATION_ERROR: Nomor HP/WhatsApp harus 10-14 digit dan diawali '08' atau '62'.");
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) {
    throw new Error("VALIDATION_ERROR: Format email tidak valid.");
  }

  if (!data.alamat || String(data.alamat).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Alamat domisili sesuai KK wajib diisi.");
  }
  if (data.alamat.length > 250) {
    throw new Error("VALIDATION_ERROR: Alamat maksimal 250 karakter.");
  }

  if (!data.setujuData) {
    throw new Error("VALIDATION_ERROR: Anda harus menyetujui pernyataan kebenaran data dan kebijakan privasi.");
  }
}

function validasiBerkas(berkas) {
  if (!Array.isArray(berkas) || berkas.length < 2) {
    throw new Error("VALIDATION_ERROR: Berkas Kartu Keluarga (KK) dan Akta Kelahiran wajib diunggah.");
  }

  const fields = berkas.map(b => b.field);
  if (!fields.includes("kk")) throw new Error("VALIDATION_ERROR: Berkas KK (Kartu Keluarga) belum diunggah.");
  if (!fields.includes("akta")) throw new Error("VALIDATION_ERROR: Berkas Akta Kelahiran belum diunggah.");

  const allowedMime = ["application/pdf", "image/jpeg", "image/png"];

  berkas.forEach(b => {
    if (!allowedMime.includes(b.mime)) {
      throw new Error(`VALIDATION_ERROR: Format berkas '${b.nama}' tidak didukung. Gunakan PDF, JPG, atau PNG.`);
    }
    // Perkiraan ukuran dari base64 (3/4 * panjang base64)
    const sizeInBytes = Math.ceil((b.base64.length * 3) / 4);
    if (sizeInBytes > 2 * 1024 * 1024) {
      throw new Error(`VALIDATION_ERROR: Ukuran berkas '${b.nama}' melebihi batas maksimal 2 MB.`);
    }
  });
}

function getFullConfigMap() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const k = String(values[i][0]).trim();
    let v = values[i][1];
    if (v instanceof Date) {
      v = Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
    }
    map[k] = v;
  }
  return map;
}

// ==========================================
// LOGIKA ADMIN & SECURITY
// ==========================================

function verifyAdminToken(token) {
  const adminToken = getProperty("ADMIN_TOKEN");
  if (!adminToken || !token) return false;
  // Constant-time string comparison to prevent timing attacks
  if (token.length !== adminToken.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ adminToken.charCodeAt(i);
  }
  return result === 0;
}

function adminRefreshCache(body) {
  if (!verifyAdminToken(body.token)) {
    return fail("UNAUTHORIZED", "Token admin tidak sah.");
  }
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    "site_config_v1", "guru_list_v1", "ekskul_list_v1", "fasilitas_list_v1",
    "pengumuman_limit_3", "pengumuman_limit_5", "pengumuman_limit_10", "galeri_limit_20"
  ]);
  return ok({ refreshed: true }, "Cache berhasil dibersihkan.");
}

function adminSetPeriode(body) {
  if (!verifyAdminToken(body.token)) {
    return fail("UNAUTHORIZED", "Token admin tidak sah.");
  }
  const newStatus = (body.status || "").toLowerCase().trim();
  if (newStatus !== "buka" && newStatus !== "tutup") {
    return fail("VALIDATION_ERROR", "Status harus 'buka' atau 'tutup'.");
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) return fail("INTERNAL_ERROR", "Sheet Pengaturan tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === "spmbStatus") {
      sheet.getRange(i + 1, 2).setValue(newStatus);
      // Bersihkan cache config
      CacheService.getScriptCache().remove("site_config_v1");
      return ok({ spmbStatus: newStatus }, "Status SPMB berhasil diubah ke: " + newStatus);
    }
  }
  return fail("NOT_FOUND", "Kunci spmbStatus tidak ditemukan di Pengaturan.");
}

// ==========================================
// FUNGSI INISIALISASI DATABASE (setupAwal)
// ==========================================

/**
 * Jalankan fungsi ini sekali dari Apps Script Editor untuk inisialisasi sheet & struktur kolom
 */
function setupAwal() {
  const ss = getSpreadsheet();
  Logger.log("Menyiapkan struktur sheet SD Negeri Sumberejo 04...");

  const struktur = {
    "Pengaturan": ["kunci", "nilai"],
    "Pengumuman": ["id", "judul", "tanggal", "isi", "tampil"],
    "Guru": ["id", "nama", "jabatan", "fotoUrl", "urutan", "tampil"],
    "Ekstrakurikuler": ["id", "nama", "deskripsi", "pembina", "jadwal", "fotoUrl", "tampil"],
    "Fasilitas": ["id", "nama", "deskripsi", "fotoUrl", "urutan", "tampil"],
    "Galeri": ["id", "judul", "tanggal", "tipe", "url", "tampil"],
    "Pendaftar": [
      "nomorPendaftaran", "waktuDaftar", "namaMurid", "nik", "tempatLahir",
      "tanggalLahir", "jenisKelamin", "namaOrtu", "nikOrtu", "hp", "email",
      "alamat", "asalTk", "linkKk", "linkAkta", "status", "catatanAdmin"
    ]
  };

  Object.keys(struktur).forEach(sheetName => {
    let s = ss.getSheetByName(sheetName);
    if (!s) {
      s = ss.insertSheet(sheetName);
      Logger.log("Membuat sheet: " + sheetName);
    }
    const headers = struktur[sheetName];
    if (s.getLastRow() === 0) {
      s.appendRow(headers);
      s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      Logger.log("Menambahkan header untuk: " + sheetName);
    }
  });

  // Contoh data default Pengaturan jika masih kosong
  const pSheet = ss.getSheetByName("Pengaturan");
  if (pSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ["namaSekolah", "SD Negeri Sumberejo 04"],
      ["alamat", "Jl. Raya Sumberejo No. 4, Kec. Banyuputih, Kab. Situbondo, Jawa Timur"],
      ["telepon", "(0338) 123456"],
      ["email", "sdn.sumberejo04@gmail.com"],
      ["whatsapp", "6281234567890"],
      ["jamLayanan", "Senin - Jumat, 07:00 - 13:00 WIB"],
      ["mapEmbedUrl", "https://maps.google.com/maps?q=SDN+Sumberejo&t=&z=15&ie=UTF8&iwloc=&output=embed"],
      ["spmbStatus", "buka"],
      ["spmbMulai", "2027-01-10"],
      ["spmbSelesai", "2027-01-31"],
      ["spmbJadwalBerikutnya", "Pendaftaran Gelombang Berikutnya dibuka Mei 2027"],
      ["emailNotifikasi", "sdn.sumberejo04@gmail.com"],
      ["biayaPendaftaran", "Gratis (Bebas Biaya)"],
      ["akreditasi", "A"],
      ["jumlahSiswa", "185"],
      ["jumlahGuru", "14"],
      ["sambutanKepsek", "Selamat datang di website resmi SD Negeri Sumberejo 04. Kami berkomitmen mewujudkan generasi cerdas, berkarakter mulia, berprestasi, dan berwawasan lingkungan melalui pendidikan yang inklusif dan menyenangkan."],
      ["batasHarianDaftar", "100"]
    ];
    defaultSettings.forEach(r => pSheet.appendRow(r));
    Logger.log("Data default Pengaturan berhasil dimasukkan.");
  }

  // Format kolom NIK di Pendaftar sebagai Plain Text
  const pendSheet = ss.getSheetByName("Pendaftar");
  if (pendSheet) {
    pendSheet.getRange("D:D").setNumberFormat("@"); // nik
    pendSheet.getRange("I:I").setNumberFormat("@"); // nikOrtu
    pendSheet.getRange("J:J").setNumberFormat("@"); // hp
  }

  // Periksa folder Drive
  try {
    const spmbFolder = getSpmbFolder();
    Logger.log("Folder SPMB terhubung: " + spmbFolder.getName());
  } catch (e) {
    Logger.log("Peringatan Folder SPMB: " + e.message);
  }

  Logger.log("Setup awal selesai dan siap digunakan!");
}

// ==========================================
// HELPER RESPONSE JSON
// ==========================================

function ok(data, message = "Berhasil") {
  return createJsonResponse({
    ok: true,
    data: data,
    message: message,
    time: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd'T'HH:mm:ssXXX")
  });
}

function fail(code, message) {
  return createJsonResponse({
    ok: false,
    data: null,
    message: message,
    code: code
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
