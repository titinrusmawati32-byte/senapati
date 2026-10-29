/**
 * Logika Frontend SD Negeri Sumberejo 04
 * Menangani interaksi UI, pemanggilan API GAS, validasi form, dan rendering data dinamis.
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initGlobalData();
  initPageSpecific();
});

// ==========================================
// 1. NAVIGASI & MENU MOBILE
// ==========================================
function initNavigation() {
  const toggleBtn = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBtn.classList.toggle("open");
      navMenu.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleBtn.classList.remove("open");
        navMenu.classList.remove("open");
      }
    });
  }

  // Tandai link aktif
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

// ==========================================
// 2. DATA GLOBAL DARI GETSITECONFIG (INSTAN VIA LOCALSTORAGE)
// ==========================================
function applyConfigToDom(config) {
  if (!config) return;

  // Terapkan ke elemen yang memakai atribut data-config
  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (config[key] !== undefined && config[key] !== "") {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = config[key];
      } else if (el.tagName === "A" && key === "whatsapp") {
        const cleanWa = String(config[key]).replace(/\D/g, "");
        el.href = `https://wa.me/${cleanWa}?text=Halo%20Admin%20${encodeURIComponent(config.namaSekolah || "SD Negeri Sumberejo")},%20saya%20ingin%20bertanya%20informasi%20sekolah.`;
      } else if (el.tagName === "A" && key === "telepon") {
        el.href = `tel:${config[key]}`;
        el.textContent = config[key];
      } else if (el.tagName === "A" && key === "email") {
        el.href = `mailto:${config[key]}`;
        el.textContent = config[key];
      } else if (el.tagName === "IFRAME" && key === "mapEmbedUrl") {
        el.src = config[key];
      } else {
        el.textContent = config[key];
      }
    }
  });

  // Perbarui tautan tombol floating WhatsApp jika ada
  const floatWa = document.getElementById("floatingWa");
  if (floatWa && config.whatsapp) {
    const cleanWa = String(config.whatsapp).replace(/\D/g, "");
    floatWa.href = `https://wa.me/${cleanWa}?text=Halo%20Admin%20${encodeURIComponent(config.namaSekolah || "SD Negeri Sumberejo")},%20saya%20ingin%20bertanya.`;
  }

  // Status pendaftaran SPMB global
  const spmbStatusBadges = document.querySelectorAll(".spmb-status-badge");
  spmbStatusBadges.forEach((badge) => {
    if (config.spmbStatus === "buka") {
      badge.className = "spmb-status-badge alert alert-success";
      badge.innerHTML = `<strong>SPMB Telah Dibuka!</strong> Pendaftaran dibuka mulai tanggal ${formatDateId(config.spmbMulai)} hingga ${formatDateId(config.spmbSelesai)}.`;
    } else {
      badge.className = "spmb-status-badge alert alert-warning";
      badge.innerHTML = `<strong>Pendaftaran Ditutup.</strong> ${config.spmbJadwalBerikutnya || "Nantikan pembukaan gelombang berikutnya."}`;
    }
  });
}

function initGlobalData() {
  // 1. Terapkan seketika (0 ms) dari cache lokal jika ada
  try {
    const cached = localStorage.getItem("sdn_site_config");
    if (cached) {
      applyConfigToDom(JSON.parse(cached));
    }
  } catch (e) {}

  // 2. Ambil data segar langsung dari Google Apps Script di latar belakang
  SchoolAPI.get("getSiteConfig")
    .then((freshConfig) => {
      if (freshConfig && Object.keys(freshConfig).length > 0) {
        localStorage.setItem("sdn_site_config", JSON.stringify(freshConfig));
        applyConfigToDom(freshConfig);
      }
    })
    .catch((err) => {
      console.warn("[Config Sync]: Menggunakan cache/data lokal.");
    });
}

// ==========================================
// 3. LOGIKA TIAP HALAMAN
// ==========================================
function initPageSpecific() {
  const path = window.location.pathname.split("/").pop() || "index.html";

  if (path === "index.html" || path === "") {
    initHomePage();
  } else if (path === "guru.html") {
    initGuruPage();
  } else if (path === "program.html") {
    initProgramPage();
  } else if (path === "fasilitas.html") {
    initFasilitasPage();
  } else if (path === "spmb.html") {
    initSpmbPage();
  } else if (path === "daftar.html") {
    initDaftarPage();
  } else if (path === "kontak.html") {
    initKontakPage();
  }
}

// ------------------------------------------
// Beranda (index.html)
// ------------------------------------------
async function initHomePage() {
  const pengumumanContainer = document.getElementById("pengumumanContainer");
  if (!pengumumanContainer) return;

  try {
    const list = await SchoolAPI.get("getPengumuman", { limit: 3 });
    if (list && list.length > 0) {
      pengumumanContainer.innerHTML = list
        .map(
          (item) => `
        <article class="card">
          <div class="card-body">
            <div class="card-meta">
              <span>📅 ${formatDateId(item.tanggal)}</span>
            </div>
            <h3 class="card-title">${escapeHtml(item.judul)}</h3>
            <p>${escapeHtml(item.isi)}</p>
          </div>
        </article>
      `
        )
        .join("");
    }
  } catch (e) {
    // Biarkan pengumuman bawaan HTML tetap tampil
  }
}

// ------------------------------------------
// Direktori Guru (guru.html)
// ------------------------------------------
async function initGuruPage() {
  const container = document.getElementById("guruContainer");
  if (!container) return;

  try {
    const list = await SchoolAPI.get("getGuru");
    if (list && list.length > 0) {
      container.innerHTML = list
        .map((guru) => {
          const photoHtml = guru.fotoUrl
            ? `<img src="${escapeHtml(guru.fotoUrl)}" alt="${escapeHtml(guru.nama)}" class="card-img" onerror="this.outerHTML=getDefaultAvatarHtml('${escapeHtml(guru.nama)}')">`
            : getDefaultAvatarHtml(guru.nama);

          return `
          <div class="card">
            ${photoHtml}
            <div class="card-body" style="text-align: center;">
              <h3 class="card-title" style="font-size: 1.15rem; margin-bottom: 0.35rem;">${escapeHtml(guru.nama)}</h3>
              <p style="color: var(--primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 0;">${escapeHtml(guru.jabatan)}</p>
            </div>
          </div>
        `;
        })
        .join("");
    }
  } catch (e) {
    console.warn("Gagal memuat guru dari API, mempertahankan konten default.");
  }
}

// ------------------------------------------
// Program & Ekstrakurikuler (program.html)
// ------------------------------------------
async function initProgramPage() {
  const container = document.getElementById("ekskulContainer");
  if (!container) return;

  try {
    const list = await SchoolAPI.get("getEkskul");
    if (list && list.length > 0) {
      container.innerHTML = list
        .map(
          (item) => `
        <div class="card">
          <div class="card-body">
            <h3 class="card-title" style="color: var(--primary);">${escapeHtml(item.nama)}</h3>
            <p>${escapeHtml(item.deskripsi)}</p>
            <div class="card-footer" style="font-size: 0.88rem; color: var(--text-muted);">
              <div><strong>Pembina:</strong> ${escapeHtml(item.pembina || "-")}</div>
              <div><strong>Jadwal:</strong> ${escapeHtml(item.jadwal || "-")}</div>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    }
  } catch (e) {
    console.warn("Gagal memuat ekskul dari API.");
  }
}

// ------------------------------------------
// Fasilitas (fasilitas.html)
// ------------------------------------------
async function initFasilitasPage() {
  const container = document.getElementById("fasilitasContainer");
  if (!container) return;

  try {
    const list = await SchoolAPI.get("getFasilitas");
    if (list && list.length > 0) {
      container.innerHTML = list
        .map((fasilitas) => {
          const photoHtml = fasilitas.fotoUrl
            ? `<img src="${escapeHtml(fasilitas.fotoUrl)}" alt="${escapeHtml(fasilitas.nama)}" class="card-img" onerror="this.outerHTML=getDefaultFacilityImgHtml()">`
            : getDefaultFacilityImgHtml();

          return `
          <div class="card">
            ${photoHtml}
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(fasilitas.nama)}</h3>
              <p>${escapeHtml(fasilitas.deskripsi)}</p>
            </div>
          </div>
        `;
        })
        .join("");
    }
  } catch (e) {
    console.warn("Gagal memuat fasilitas dari API.");
  }
}

// ------------------------------------------
// SPMB Info (spmb.html)
// ------------------------------------------
async function initSpmbPage() {
  const btnDaftar = document.getElementById("btnKePendaftaran");
  const spmbAlert = document.getElementById("spmbStatusAlert");

  try {
    const config = await SchoolAPI.get("getSiteConfig");
    if (!config) return;

    if (config.spmbStatus === "buka") {
      if (spmbAlert) {
        spmbAlert.className = "alert alert-success";
        spmbAlert.innerHTML = `<strong>Pendaftaran Terbuka!</strong> Segera daftarkan putra/putri Anda. Periode berlangsung dari ${formatDateId(config.spmbMulai)} hingga ${formatDateId(config.spmbSelesai)}.`;
      }
      if (btnDaftar) {
        btnDaftar.classList.remove("btn-outline");
        btnDaftar.classList.add("btn-secondary");
      }
    } else {
      if (spmbAlert) {
        spmbAlert.className = "alert alert-warning";
        spmbAlert.innerHTML = `<strong>Pendaftaran Saat Ini Ditutup.</strong> ${config.spmbJadwalBerikutnya || "Informasi jadwal gelombang berikutnya akan diumumkan di sini."}`;
      }
      if (btnDaftar) {
        btnDaftar.removeAttribute("href");
        btnDaftar.style.opacity = "0.5";
        btnDaftar.style.cursor = "not-allowed";
        btnDaftar.textContent = "Pendaftaran Ditutup";
      }
    }
  } catch (e) {
    console.warn("Menggunakan status default SPMB.");
  }
}

// ------------------------------------------
// Formulir Pendaftaran (daftar.html)
// ------------------------------------------
function initDaftarPage() {
  const form = document.getElementById("spmbForm");
  const alertContainer = document.getElementById("formAlertContainer");
  const submitBtn = document.getElementById("btnSubmitDaftar");
  const modal = document.getElementById("successModal");

  // Periksa periode terlebih dahulu
  checkPeriodOnDaftar(form, submitBtn, alertContainer);

  // Setup preview status unggah file
  setupFileInput("inputKk", "statusKk");
  setupFileInput("inputAkta", "statusAkta");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormAlert(alertContainer);

    // 1. Validasi Formulir
    const isValid = validateFormInputs(form);
    if (!isValid) {
      showFormAlert(alertContainer, "danger", "Harap periksa kembali isian formulir yang ditandai merah.");
      return;
    }

    // 2. Baca file menjadi Base64
    const fileKk = document.getElementById("inputKk").files[0];
    const fileAkta = document.getElementById("inputAkta").files[0];

    if (!fileKk || !fileAkta) {
      showFormAlert(alertContainer, "danger", "Berkas Kartu Keluarga dan Akta Kelahiran wajib diunggah.");
      return;
    }

    // Ubah status tombol menjadi loading
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Sedang memproses dan mengunggah berkas...`;

    try {
      const [base64Kk, base64Akta] = await Promise.all([
        readFileAsBase64(fileKk),
        readFileAsBase64(fileAkta)
      ]);

      const payload = {
        action: "submitPendaftaran",
        honeypot: form.honeypot ? form.honeypot.value : "",
        data: {
          namaMurid: form.namaMurid.value.trim(),
          nik: form.nik.value.trim(),
          tempatLahir: form.tempatLahir.value.trim(),
          tanggalLahir: form.tanggalLahir.value.trim(),
          jenisKelamin: form.jenisKelamin.value,
          namaOrtu: form.namaOrtu.value.trim(),
          nikOrtu: form.nikOrtu.value.trim(),
          hp: form.hp.value.trim(),
          email: form.email.value.trim(),
          alamat: form.alamat.value.trim(),
          asalTk: form.asalTk ? form.asalTk.value.trim() : "",
          setujuData: form.setujuData.checked
        },
        berkas: [
          {
            field: "kk",
            nama: fileKk.name,
            mime: fileKk.type || "application/pdf",
            base64: base64Kk
          },
          {
            field: "akta",
            nama: fileAkta.name,
            mime: fileAkta.type || "application/pdf",
            base64: base64Akta
          }
        ]
      };

      const result = await SchoolAPI.post(payload);

      // Tampilkan Modal Berhasil
      showSuccessModal(modal, result.nomorPendaftaran, payload.data);
      form.reset();
      document.getElementById("statusKk").textContent = "";
      document.getElementById("statusAkta").textContent = "";
    } catch (err) {
      showFormAlert(alertContainer, "danger", err.message || "Gagal mengirim formulir pendaftaran. Silakan coba kembali atau hubungi sekolah.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

async function checkPeriodOnDaftar(form, submitBtn, alertContainer) {
  try {
    const config = await SchoolAPI.get("getSiteConfig");
    if (config && config.spmbStatus !== "buka") {
      showFormAlert(alertContainer, "warning", `Pendaftaran SPMB saat ini sedang ditutup. ${config.spmbJadwalBerikutnya || ""}`);
      if (form) {
        const inputs = form.querySelectorAll("input, select, textarea, button");
        inputs.forEach((el) => (el.disabled = true));
      }
    }
  } catch (e) {
    // Fallback jika API belum aktif
  }
}

function setupFileInput(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  if (!input || !status) return;

  input.addEventListener("change", () => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 2 * 1024 * 1024) {
        status.style.color = "var(--danger)";
        status.textContent = `❌ Ukuran berkas terlalu besar (${sizeMb} MB). Maksimal 2 MB.`;
        input.value = "";
      } else {
        status.style.color = "var(--success)";
        status.textContent = `✓ ${file.name} (${sizeMb} MB) siap diunggah`;
      }
    } else {
      status.textContent = "";
    }
  });
}

function validateFormInputs(form) {
  let isValid = true;

  const markField = (input, valid, msg) => {
    const feedback = input.parentElement.querySelector(".invalid-feedback");
    if (!valid) {
      input.classList.add("is-invalid");
      if (feedback) feedback.textContent = msg;
      isValid = false;
    } else {
      input.classList.remove("is-invalid");
    }
  };

  // Nama Murid
  const namaMurid = form.namaMurid;
  markField(namaMurid, namaMurid.value.trim().length > 0 && namaMurid.value.length <= 100, "Nama lengkap calon murid wajib diisi (maks 100 karakter).");

  // NIK Murid
  const nik = form.nik;
  markField(nik, /^\d{16}$/.test(nik.value.trim()), "NIK murid harus tepat 16 digit angka.");

  // Tempat Lahir
  const tempatLahir = form.tempatLahir;
  markField(tempatLahir, tempatLahir.value.trim().length > 0, "Tempat lahir wajib diisi.");

  // Tanggal Lahir
  const tanggalLahir = form.tanggalLahir;
  const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir.value.trim()) && new Date(tanggalLahir.value) <= new Date();
  markField(tanggalLahir, isDateValid, "Pilih tanggal lahir yang valid (tidak melebihi hari ini).");

  // Jenis Kelamin
  const jenisKelamin = form.jenisKelamin;
  markField(jenisKelamin, jenisKelamin.value !== "", "Pilih jenis kelamin.");

  // Nama Ortu
  const namaOrtu = form.namaOrtu;
  markField(namaOrtu, namaOrtu.value.trim().length > 0, "Nama orang tua/wali wajib diisi.");

  // NIK Ortu
  const nikOrtu = form.nikOrtu;
  markField(nikOrtu, /^\d{16}$/.test(nikOrtu.value.trim()), "NIK orang tua/wali harus tepat 16 digit angka.");

  // No HP / WhatsApp
  const hp = form.hp;
  markField(hp, /^(08|62)\d{8,12}$/.test(hp.value.trim()), "Nomor HP/WA harus diawali 08 atau 62 (10-14 digit).");

  // Email (opsional bila diisi harus valid)
  const email = form.email;
  if (email.value.trim() !== "") {
    markField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), "Format email tidak valid.");
  } else {
    markField(email, true);
  }

  // Alamat
  const alamat = form.alamat;
  markField(alamat, alamat.value.trim().length > 0 && alamat.value.length <= 250, "Alamat domisili wajib diisi (maks 250 karakter).");

  // Persetujuan
  const setuju = form.setujuData;
  if (!setuju.checked) {
    alert("Anda harus mencentang persetujuan kebenaran data.");
    isValid = false;
  }

  return isValid;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Hasil berupa "data:image/jpeg;base64,/9j/4AAQSk..." -> ambil setelah koma
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function showSuccessModal(modal, nomorPendaftaran, data) {
  if (!modal) return;
  const regNumberEl = document.getElementById("modalNomorPendaftaran");
  const detailEl = document.getElementById("modalDataRingkas");

  if (regNumberEl) regNumberEl.textContent = nomorPendaftaran;
  if (detailEl) {
    detailEl.innerHTML = `
      <table style="width: 100%; text-align: left; font-size: 0.9rem; margin-top: 1rem; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: var(--text-muted);">Nama Calon Murid:</td><td><strong>${escapeHtml(data.namaMurid)}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: var(--text-muted);">NIK Murid:</td><td>${escapeHtml(data.nik)}</td></tr>
        <tr><td style="padding: 4px 0; color: var(--text-muted);">Orang Tua / Wali:</td><td>${escapeHtml(data.namaOrtu)}</td></tr>
        <tr><td style="padding: 4px 0; color: var(--text-muted);">No. WhatsApp:</td><td>${escapeHtml(data.hp)}</td></tr>
      </table>
    `;
  }

  modal.classList.add("active");

  const btnCopy = document.getElementById("btnSalinNomor");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(nomorPendaftaran).then(() => {
        btnCopy.textContent = "✓ Tersalin!";
        setTimeout(() => (btnCopy.textContent = "Salin Nomor"), 2000);
      });
    };
  }

  const btnTutup = document.getElementById("btnTutupModal");
  if (btnTutup) {
    btnTutup.onclick = () => modal.classList.remove("active");
  }
}

function showFormAlert(container, type, message) {
  if (!container) return;
  container.className = `alert alert-${type}`;
  container.textContent = message;
  container.style.display = "block";
  container.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideFormAlert(container) {
  if (!container) return;
  container.style.display = "none";
}

// ------------------------------------------
// Kontak & Lokasi (kontak.html)
// ------------------------------------------
function initKontakPage() {
  // Sudah disinkronkan otomatis lewat data-config di initGlobalData
}

// ==========================================
// 4. HELPER & FORMAT
// ==========================================
function formatDateId(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDefaultAvatarHtml(nama) {
  const initial = (nama || "G").charAt(0).toUpperCase();
  return `
    <div class="card-img" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #ffffff; font-size: 2.5rem; font-weight: 700;">
      ${initial}
    </div>
  `;
}

function getDefaultFacilityImgHtml() {
  return `
    <div class="card-img" style="background: #e2e8f0; color: #64748b; font-size: 2.5rem;">
      🏫
    </div>
  `;
}
