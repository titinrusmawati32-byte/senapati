/**
 * Google Apps Script - SD Negeri Sumberejo 04 Backend API
 * REAL-TIME: Data di Google Sheets langsung terhubung detik ini juga ke website!
 */

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSpreadsheet() {
  let sheetId = getProperty("SHEET_ID");
  if (sheetId && !sheetId.includes("MASUKKAN_ID")) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {}
  }

  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      PropertiesService.getScriptProperties().setProperty("SHEET_ID", active.getId());
      return active;
    }
  } catch (e) {}

  try {
    const newSs = SpreadsheetApp.create("SDN Sumberejo 04 - Database");
    PropertiesService.getScriptProperties().setProperty("SHEET_ID", newSs.getId());
    return newSs;
  } catch (err) {
    throw new Error("Gagal membuka/membuat spreadsheet: " + err.message);
  }
}

function getSpmbFolder() {
  let folderId = getProperty("FOLDER_SPMB_ID");
  if (folderId && !folderId.includes("MASUKKAN_ID")) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }

  try {
    const newFolder = DriveApp.createFolder("SPMB SD Negeri Sumberejo 04");
    PropertiesService.getScriptProperties().setProperty("FOLDER_SPMB_ID", newFolder.getId());
    return newFolder;
  } catch (err) {
    throw new Error("Gagal membuka/membuat folder Drive: " + err.message);
  }
}

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
      default:
        return fail("BAD_REQUEST", "Action tidak dikenal: " + action);
    }
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return fail("INTERNAL_ERROR", "Terjadi kesalahan internal server: " + err.message);
  }
}

// ==========================================
// LOGIKA ENDPOINT GET REAL-TIME (LANGSUNG DARI SHEETS)
// ==========================================

function getSiteConfig() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) throw new Error("Sheet 'Pengaturan' tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  const config = {};

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

  return config;
}

function getPengumuman(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 10);
  const rows = getPublicRowsFromSheet("Pengumuman");
  rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  return rows.slice(0, limit);
}

function getGuru() {
  const rows = getPublicRowsFromSheet("Guru");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
  return rows;
}

function getEkskul() {
  return getPublicRowsFromSheet("Ekstrakurikuler");
}

function getFasilitas() {
  const rows = getPublicRowsFromSheet("Fasilitas");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
  return rows;
}

function getGaleri(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 20);
  const rows = getPublicRowsFromSheet("Galeri");
  rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  return rows.slice(0, limit);
}

function cekStatus(nomor) {
  if (!nomor || typeof nomor !== "string") {
    throw new Error("Parameter nomor pendaftaran wajib disertakan.");
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pendaftar");
  if (!sheet) throw new Error("Sheet 'Pendaftar' tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { ditemukan: false, message: "Belum ada data pendaftaran." };

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
  if (body.honeypot && String(body.honeypot).trim() !== "") {
    return {
      nomorPendaftaran: "SPMB-" + new Date().getFullYear() + "-0000",
      tanggal: new Date().toISOString()
    };
  }

  const data = body.data || {};
  const berkas = body.berkas || [];

  validasiDataPendaftar(data);
  validasiBerkas(berkas);

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000);
  if (!hasLock) {
    throw new Error("INTERNAL_ERROR: Sistem sedang sibuk memproses pendaftaran lain.");
  }

  const uploadedFiles = [];
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Pendaftar");
    if (!sheet) throw new Error("Sheet 'Pendaftar' tidak ditemukan di database.");

    const existingValues = sheet.getDataRange().getValues();
    const headers = existingValues[0].map(h => String(h).trim());
    const nikIdx = headers.indexOf("nik");

    if (nikIdx !== -1) {
      for (let i = 1; i < existingValues.length; i++) {
        const valNik = String(existingValues[i][nikIdx]).replace(/^'/, "").trim();
        if (valNik === data.nik) {
          throw new Error("VALIDATION_ERROR: NIK " + data.nik + " sudah terdaftar di sistem.");
        }
      }
    }

    const now = new Date();
    const tahun = now.getFullYear();
    const totalPendaftar = existingValues.length;
    const nomorUrut = ("0000" + totalPendaftar).slice(-4);
    const nomorPendaftaran = `SPMB-${tahun}-${nomorUrut}`;

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

    return {
      nomorPendaftaran: nomorPendaftaran,
      tanggal: waktuDaftar
    };
  } catch (err) {
    uploadedFiles.forEach(f => {
      try { f.setTrashed(true); } catch (e) {}
    });
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function validasiDataPendaftar(data) {
  if (!data) throw new Error("VALIDATION_ERROR: Data formulir tidak boleh kosong.");
  if (!data.namaMurid || String(data.namaMurid).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Nama lengkap calon murid wajib diisi.");
  }
  if (!data.nik || !/^\d{16}$/.test(String(data.nik).trim())) {
    throw new Error("VALIDATION_ERROR: NIK calon murid harus tepat 16 digit angka.");
  }
  if (!data.namaOrtu || String(data.namaOrtu).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Nama orang tua/wali wajib diisi.");
  }
  if (!data.alamat || String(data.alamat).trim().length === 0) {
    throw new Error("VALIDATION_ERROR: Alamat domisili wajib diisi.");
  }
  if (!data.setujuData) {
    throw new Error("VALIDATION_ERROR: Anda harus menyetujui pernyataan kebenaran data.");
  }
}

function validasiBerkas(berkas) {
  if (!Array.isArray(berkas) || berkas.length < 2) {
    throw new Error("VALIDATION_ERROR: Berkas Kartu Keluarga (KK) dan Akta Kelahiran wajib diunggah.");
  }
}

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
