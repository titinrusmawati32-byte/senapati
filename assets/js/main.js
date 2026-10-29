/**
 * Logika Frontend SD Negeri Sumberejo 04
 * Menangani interaksi UI, pemanggilan API GAS, validasi form, dan rendering data dinamis.
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initGlobalData();
  initHomyzTransitions();
  initPageSpecific();
});

// ==========================================
// 1. TRANSISI & ANIMASI MODERN (GAYA HOMYZ / FRAMER MOTION)
// ==========================================
function initHomyzTransitions() {
  initNavbarScrollEffect();
  triggerHomyzReveal();
  initAnimatedCounters();
}

function initNavbarScrollEffect() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

function triggerHomyzReveal() {
  const targets = document.querySelectorAll(
    ".section, .card, .stat-card, .section-header, .steps-grid > *, .hero-badge, .cta-banner, .footer-col"
  );

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -30px 0px"
    }
  );

  targets.forEach((el) => {
    if (!el.classList.contains("homyz-reveal")) {
      el.classList.add("homyz-reveal");
    }
    observer.observe(el);
  });
}
window.triggerHomyzReveal = triggerHomyzReveal;

function initAnimatedCounters() {
  const statNumbers = document.querySelectorAll(".stat-number");
  if (statNumbers.length === 0) return;

  const animateNumber = (el, targetStr) => {
    // Abaikan jika bukan angka (misal Akreditasi "A")
    const numericMatch = targetStr.match(/\d+/);
    if (!numericMatch) return;

    const numericVal = parseInt(numericMatch[0], 10);
    const isPercent = targetStr.includes("%");
    const isPlus = targetStr.includes("+");

    const duration = 1500; // 1.5 detik
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease Out Cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easeProgress * numericVal);

      el.textContent = `${currentVal}${isPlus ? "+" : ""}${isPercent ? "%" : ""}`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = targetStr;
      }
    };

    requestAnimationFrame(updateCounter);
  };

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetText = el.textContent.trim();
          animateNumber(el, targetText);
          obs.unobserve(el);
        }
      });
    },
    { threshold: 0.4 }
  );

  statNumbers.forEach((el) => observer.observe(el));
}

// ==========================================
// 2. NAVIGASI & MENU MOBILE
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
function renderPengumumanCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada pengumuman terbaru.</div>`;
    return;
  }
  container.innerHTML = list
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
  triggerHomyzReveal();
}

async function initHomePage() {
  const container = document.getElementById("pengumumanContainer");
  if (!container) return;

  // 1. Tampilkan instan (0 ms) dari cache lokal jika ada
  try {
    const cached = localStorage.getItem("sdn_pengumuman_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderPengumumanCards(container, parsed);
      }
    }
  } catch (e) {}

  // 2. Sinkronkan data segar dari server di latar belakang
  try {
    const list = await SchoolAPI.get("getPengumuman", { limit: 3 });
    if (list && Array.isArray(list)) {
      localStorage.setItem("sdn_pengumuman_list", JSON.stringify(list));
      renderPengumumanCards(container, list);
    }
  } catch (e) {
    console.warn("Gagal menyinkronkan pengumuman terbaru.");
  }
}

// ------------------------------------------
// Direktori Guru (guru.html)
// ------------------------------------------
function renderGuruCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">Belum ada data guru.</div>`;
    return;
  }
  container.innerHTML = list
    .map((guru) => {
      const formattedUrl = formatPhotoUrl(guru.fotoUrl);
      const driveId = extractDriveId(guru.fotoUrl);

      const photoHtml = formattedUrl
        ? `<div class="guru-photo-wrap">
             <img src="${escapeHtml(formattedUrl)}" 
                  alt="${escapeHtml(guru.nama)}" 
                  class="guru-photo" 
                  loading="lazy" 
                  referrerpolicy="no-referrer"
                  onerror="this.onerror=null; ${driveId ? `this.src='https://lh3.googleusercontent.com/d/${driveId}'; this.onerror=function(){this.parentElement.outerHTML=getDefaultAvatarHtml('${escapeHtml(guru.nama)}');};` : `this.parentElement.outerHTML=getDefaultAvatarHtml('${escapeHtml(guru.nama)}');`}">
           </div>`
        : getDefaultAvatarHtml(guru.nama);

      return `
      <div class="card guru-card">
        ${photoHtml}
        <div class="guru-card-body">
          <h3 class="guru-name">${escapeHtml(guru.nama)}</h3>
          <span class="guru-role-badge">${escapeHtml(guru.jabatan)}</span>
        </div>
      </div>
    `;
    })
    .join("");
  triggerHomyzReveal();
}

async function initGuruPage() {
  const container = document.getElementById("guruContainer");
  if (!container) return;

  // 1. Tampilkan instan (0 ms) dari cache lokal jika ada
  try {
    const cached = localStorage.getItem("sdn_guru_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderGuruCards(container, parsed);
      }
    }
  } catch (e) {}

  // 2. Sinkronkan data segar dari server di latar belakang
  try {
    const list = await SchoolAPI.get("getGuru");
    if (list && Array.isArray(list)) {
      localStorage.setItem("sdn_guru_list", JSON.stringify(list));
      renderGuruCards(container, list);
    }
  } catch (e) {
    console.warn("Gagal memuat guru terbaru.");
  }
}

// ------------------------------------------
// Program & Ekstrakurikuler (program.html)
// ------------------------------------------
function renderEkskulCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">Belum ada program ekstrakurikuler.</div>`;
    return;
  }
  container.innerHTML = list
    .map(
      (item) => `
    <div class="card">
      ${item.fotoUrl ? `<img src="${formatPhotoUrl(item.fotoUrl)}" alt="${escapeHtml(item.nama)}" class="card-img" referrerpolicy="no-referrer">` : ""}
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
  triggerHomyzReveal();
}

async function initProgramPage() {
  const container = document.getElementById("ekskulContainer");
  if (!container) return;

  try {
    const cached = localStorage.getItem("sdn_ekskul_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) renderEkskulCards(container, parsed);
    }
  } catch (e) {}

  try {
    const list = await SchoolAPI.get("getEkskul");
    if (list && Array.isArray(list)) {
      localStorage.setItem("sdn_ekskul_list", JSON.stringify(list));
      renderEkskulCards(container, list);
    }
  } catch (e) {
    console.warn("Gagal memuat ekskul dari API.");
  }
}

// ------------------------------------------
// Fasilitas (fasilitas.html)
// ------------------------------------------
function renderFasilitasCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">Belum ada data fasilitas.</div>`;
    return;
  }
  container.innerHTML = list
    .map((fasilitas) => {
      const photoHtml = fasilitas.fotoUrl
        ? `<img src="${formatPhotoUrl(fasilitas.fotoUrl)}" alt="${escapeHtml(fasilitas.nama)}" class="card-img" referrerpolicy="no-referrer" onerror="this.outerHTML=getDefaultFacilityImgHtml()">`
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
  triggerHomyzReveal();
}

async function initFasilitasPage() {
  const container = document.getElementById("fasilitasContainer");
  if (!container) return;

  try {
    const cached = localStorage.getItem("sdn_fasilitas_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) renderFasilitasCards(container, parsed);
    }
  } catch (e) {}

  try {
    const list = await SchoolAPI.get("getFasilitas");
    if (list && Array.isArray(list)) {
      localStorage.setItem("sdn_fasilitas_list", JSON.stringify(list));
      renderFasilitasCards(container, list);
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
    <div class="guru-photo-wrap" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff;">
      <div style="font-size: 4.5rem; font-weight: 800; line-height: 1; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${initial}</div>
      <div style="font-size: 0.82rem; opacity: 0.9; margin-top: 0.5rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">Foto Pendidik</div>
    </div>
  `;
}

function formatPhotoUrl(url) {
  if (!url) return "";
  const clean = String(url).trim();
  const fileId = extractDriveId(clean);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return clean;
}

function extractDriveId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const m1 = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m3) return m3[1];
  return null;
}

function getDefaultFacilityImgHtml() {
  return `
    <div class="card-img" style="background: #e2e8f0; color: #64748b; font-size: 2.5rem;">
      🏫
    </div>
  `;
}
