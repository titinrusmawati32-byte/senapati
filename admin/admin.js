/**
 * LOGIKA UTAMA ADMIN PANEL & CMS SD NEGERI SUMBEREJO
 * Mengelola Otentikasi, Router, Hak Akses Peran, dan Integrasi API
 */

(function () {
  const getApiUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : "";
  };

  // State Aplikasi Sesi
  const AppState = {
    token: sessionStorage.getItem("cms_token") || null,
    user: null, // { namaPengguna, namaTampil, peran }
    activeView: "dashboard",
    siteConfig: {},
    pendaftarList: [],
    mediaList: []
  };

  /**
   * Pemanggilan API Admin Terpusat (POST dengan Token Sesi)
   */
  async function apiCall(action, payload = {}) {
    const url = getApiUrl();
    if (!url) {
      showToast("URL API belum dikonfigurasi di assets/js/config.js", "error");
      throw new Error("API URL tidak ditemukan.");
    }

    const body = {
      action: action,
      token: AppState.token,
      ...payload
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!json.ok) {
        if (json.code === "UNAUTHORIZED") {
          logoutUser("Sesi Anda telah berakhir. Silakan masuk kembali.");
        }
        throw new Error(json.message || "Gagal memproses aksi.");
      }
      return json.data;
    } catch (err) {
      console.error(`[Admin API Error - ${action}]:`, err);
      throw err;
    }
  }

  // ==========================================
  // 1. INISIALISASI & AUTENTIKASI
  // ==========================================
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initNavigationEvents();
    initForms();
    initMediaUpload();
    initPendaftarEvents();
  });

  async function initAuth() {
    if (!AppState.token) {
      showLoginView();
      return;
    }

    try {
      // Pulihkan sesi pengguna
      const me = await apiCall("admin_me");
      AppState.user = me.pengguna;
      showAppView();
    } catch (e) {
      showLoginView();
    }
  }

  function showLoginView() {
    document.getElementById("viewLogin").style.display = "flex";
    document.getElementById("viewApp").style.display = "none";

    const formLogin = document.getElementById("formLogin");
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btnLogin");
      const alertBox = document.getElementById("loginAlert");
      alertBox.style.display = "none";

      btn.disabled = true;
      btn.textContent = "Memeriksa kredensial...";

      try {
        const username = document.getElementById("inputUsername").value.trim();
        const password = document.getElementById("inputPassword").value.trim();

        const result = await apiCall("admin_login", {
          namaPengguna: username,
          kataSandi: password
        });

        AppState.token = result.token;
        AppState.user = result.pengguna;
        sessionStorage.setItem("cms_token", result.token);

        showAppView();
        showToast(`Selamat datang, ${AppState.user.namaTampil}!`, "success");
      } catch (err) {
        alertBox.className = "card";
        alertBox.style.borderLeft = "4px solid var(--danger)";
        alertBox.style.background = "var(--danger-bg)";
        alertBox.style.display = "block";
        alertBox.style.color = "var(--danger)";
        alertBox.textContent = err.message || "Nama pengguna atau kata sandi salah.";
      } finally {
        btn.disabled = false;
        btn.textContent = "Masuk ke Panel Pengelola";
      }
    };
  }

  function showAppView() {
    document.getElementById("viewLogin").style.display = "none";
    document.getElementById("viewApp").style.display = "flex";

    // Update Header Profil
    document.getElementById("labelUserName").textContent = AppState.user.namaTampil || AppState.user.namaPengguna;
    const rolePill = document.getElementById("labelUserRole");
    rolePill.textContent = formatRoleName(AppState.user.peran);
    rolePill.className = "role-pill " + AppState.user.peran;

    // Terapkan Pembatasan Peran pada Menu Navigasi
    applyRolePermissions(AppState.user.peran);

    // Muat data awal
    AppRouter.navigate("dashboard");
    loadAllData();
  }

  function logoutUser(msg = "Anda telah keluar.") {
    if (AppState.token) {
      apiCall("admin_logout").catch(() => {});
    }
    sessionStorage.removeItem("cms_token");
    AppState.token = null;
    AppState.user = null;
    showLoginView();
    if (msg) showToast(msg);
  }

  document.getElementById("btnLogout").addEventListener("click", () => logoutUser());

  // ==========================================
  // 2. MATRIKS HAK AKSES PERAN
  // ==========================================
  function applyRolePermissions(role) {
    const kontenGroups = document.querySelectorAll(".role-group-konten, .role-item-konten");
    const spmbGroups = document.querySelectorAll(".role-group-spmb, .role-item-spmb");
    const superGroups = document.querySelectorAll(".role-group-super, .role-item-super");

    if (role === "superadmin") {
      kontenGroups.forEach((el) => (el.style.display = ""));
      spmbGroups.forEach((el) => (el.style.display = ""));
      superGroups.forEach((el) => (el.style.display = ""));
    } else if (role === "editor") {
      kontenGroups.forEach((el) => (el.style.display = ""));
      spmbGroups.forEach((el) => (el.style.display = "none"));
      superGroups.forEach((el) => (el.style.display = "none"));
    } else if (role === "admin_spmb") {
      kontenGroups.forEach((el) => (el.style.display = "none"));
      spmbGroups.forEach((el) => (el.style.display = ""));
      superGroups.forEach((el) => (el.style.display = "none"));
    }
  }

  function formatRoleName(r) {
    if (r === "superadmin") return "Superadmin";
    if (r === "editor") return "Editor Konten";
    if (r === "admin_spmb") return "Admin SPMB";
    return r;
  }

  // ==========================================
  // 3. ROUTER & NAVIGASI
  // ==========================================
  const AppRouter = {
    navigate: function (viewName) {
      AppState.activeView = viewName;

      // Update Nav Items
      document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
        if (item.getAttribute("data-view") === viewName) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // Tampilkan Pane yang Sesuai
      document.querySelectorAll(".view-pane").forEach((pane) => {
        pane.style.display = "none";
      });

      const targetPane = document.getElementById("pane-" + viewName);
      if (targetPane) targetPane.style.display = "block";

      // Update Judul Header
      const titles = {
        dashboard: "Dasbor Operasional",
        identitas: "Identitas Lembaga Sekolah",
        beranda: "Konten Halaman Beranda",
        profil: "Visi, Misi & Sejarah",
        spmbConfig: "Pengaturan Jadwal SPMB",
        pendaftar: "Verifikasi Pendaftar SPMB",
        pengumuman: "Kelola Pengumuman",
        guru: "Dewan Guru & Tenaga Didik",
        ekskul: "Program Ekstrakurikuler",
        fasilitas: "Fasilitas & Sarana",
        galeri: "Dokumentasi Galeri",
        media: "Pustaka Media Terunggah",
        users: "Manajemen Akun Admin",
        log: "Rekam Log Aktivitas"
      };
      document.getElementById("topPageTitle").textContent = titles[viewName] || "Admin Panel";

      // Muat data khusus view jika diperlukan
      if (viewName === "media") loadMediaLibrary();
      if (viewName === "pendaftar") loadPendaftarTable();
      if (viewName === "pengumuman") loadCollection("Pengumuman");
      if (viewName === "guru") loadCollection("Guru");
      if (viewName === "ekskul") loadCollection("Ekstrakurikuler");
      if (viewName === "fasilitas") loadCollection("Fasilitas");
      if (viewName === "galeri") loadCollection("Galeri");
      if (viewName === "users") loadUsersList();
      if (viewName === "log") loadAuditLog();

      // Tutup menu ponsel jika terbuka
      document.getElementById("sidebar").classList.remove("open");
    }
  };
  window.AppRouter = AppRouter;

  function initNavigationEvents() {
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const view = item.getAttribute("data-view");
        if (view) AppRouter.navigate(view);
      });
    });

    const toggleBtn = document.getElementById("btnToggleMenu");
    const sidebar = document.getElementById("sidebar");
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // ==========================================
  // 4. MEMUAT SEMUA DATA (BUNDLE)
  // ==========================================
  async function loadAllData() {
    try {
      const bundle = await apiCall("admin_getBundle");
      AppState.siteConfig = bundle.config || {};
      AppState.pendaftarList = bundle.pendaftar || [];

      // Isi nilai-nilai formulir
      populateForms(AppState.siteConfig);
      renderDashboard(bundle);
    } catch (e) {
      console.warn("Gagal memuat bundle lengkap admin:", e);
    }
  }

  function populateForms(cfg) {
    // Identitas
    const fId = document.getElementById("formIdentitas");
    if (fId) {
      ["namaSekolah", "akreditasi", "alamat", "telepon", "whatsapp", "email", "jamLayanan", "mapEmbedUrl"].forEach((k) => {
        if (fId[k] && cfg[k]) fId[k].value = cfg[k];
      });
    }

    // Beranda
    const fBer = document.getElementById("formBeranda");
    if (fBer) {
      ["sambutanKepsek", "jumlahSiswa", "jumlahGuru", "biayaPendaftaran"].forEach((k) => {
        if (fBer[k] && cfg[k]) fBer[k].value = cfg[k];
      });
    }

    // Profil
    const fProf = document.getElementById("formProfil");
    if (fProf) {
      ["visiTeks", "misiTeks", "sejarahTeks"].forEach((k) => {
        if (fProf[k] && cfg[k]) fProf[k].value = cfg[k];
      });
    }

    // SPMB Config
    const fSpmb = document.getElementById("formSpmbConfig");
    if (fSpmb) {
      ["spmbStatus", "spmbJadwalBerikutnya", "spmbMulai", "spmbSelesai", "batasHarianDaftar"].forEach((k) => {
        if (fSpmb[k] && cfg[k]) fSpmb[k].value = cfg[k];
      });
    }
  }

  function renderDashboard(bundle) {
    const pendaftar = bundle.pendaftar || [];
    const config = bundle.config || {};

    const baruCount = pendaftar.filter((p) => p.status === "baru").length;
    document.getElementById("statPendaftarBaru").textContent = baruCount;
    document.getElementById("statTotalPendaftar").textContent = pendaftar.length;

    const statusEl = document.getElementById("statStatusSpmb");
    statusEl.textContent = (config.spmbStatus || "tutup").toUpperCase();
    statusEl.style.color = config.spmbStatus === "buka" ? "var(--success)" : "var(--danger)";

    const tglSelesai = config.spmbSelesai || "-";
    document.getElementById("statTglSpmb").textContent = `Batas: ${tglSelesai}`;

    // Peringatan jika tanggal lewat namun status buka
    const expiredAlert = document.getElementById("spmbExpiredAlert");
    const today = new Date().toISOString().split("T")[0];
    if (config.spmbStatus === "buka" && config.spmbSelesai && today > config.spmbSelesai) {
      expiredAlert.style.display = "block";
    } else {
      expiredAlert.style.display = "none";
    }

    // Tabel pendaftar terbaru di dasbor (maks 5)
    const tbody = document.getElementById("dashTablePendaftar");
    const latest = pendaftar.slice(0, 5);
    if (latest.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Belum ada formulir masuk.</td></tr>`;
    } else {
      tbody.innerHTML = latest
        .map(
          (p) => `
        <tr>
          <td><strong>${p.nomorPendaftaran}</strong></td>
          <td>${escapeHtml(p.namaMurid)}</td>
          <td>${p.waktuDaftar || "-"}</td>
          <td>${escapeHtml(p.hp)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="AppPendaftar.viewDetail('${p.nomorPendaftaran}')">Periksa</button></td>
        </tr>
      `
        )
        .join("");
    }
  }

  // ==========================================
  // 5. PENYIMPANAN FORMULIR (IDENTITAS, DLL)
  // ==========================================
  function initForms() {
    setupGenericForm("formIdentitas", "barIdentitas", "Identitas Sekolah");
    setupGenericForm("formBeranda", "barBeranda", "Halaman Beranda");
    setupGenericForm("formProfil", "barProfil", "Profil Sekolah");
    setupGenericForm("formSpmbConfig", "barSpmb", "Pengaturan SPMB");
  }

  function setupGenericForm(formId, barId, modulTitle) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type='submit']");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Menyimpan ke Database...";

      const formData = new FormData(form);
      const items = [];
      for (let [key, val] of formData.entries()) {
        items.push({ kunci: key, nilai: val });
      }

      try {
        await apiCall("admin_saveKonten", { items: items });
        // Simpan langsung ke cache lokal browser agar website seketika ter-update dalam 0 milidetik
        try {
          const currentConfig = JSON.parse(localStorage.getItem("sdn_site_config") || "{}");
          items.forEach((it) => {
            currentConfig[it.kunci] = it.nilai;
            if (AppState.siteConfig) AppState.siteConfig[it.kunci] = it.nilai;
          });
          localStorage.setItem("sdn_site_config", JSON.stringify(currentConfig));
        } catch (e) {}

        showToast(`${modulTitle} berhasil disimpan dan langsung diperbarui di web!`, "success");
      } catch (err) {
        showToast(`Gagal menyimpan ${modulTitle}: ` + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  }

  // ==========================================
  // 6. MODUL PENDAFTAR SPMB
  // ==========================================
  const AppPendaftar = {
    viewDetail: function (nomor) {
      const p = AppState.pendaftarList.find((item) => item.nomorPendaftaran === nomor);
      if (!p) return;

      document.getElementById("mPendaftarNomor").textContent = `Pendaftaran: ${p.nomorPendaftaran}`;
      const body = document.getElementById("mPendaftarBody");

      body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div><span style="color: var(--text-muted);">Nama Calon Murid:</span><br><strong>${escapeHtml(p.namaMurid)}</strong></div>
          <div><span style="color: var(--text-muted);">NIK Murid (16 Digit):</span><br><code>${escapeHtml(p.nik)}</code></div>
          <div><span style="color: var(--text-muted);">Tempat, Tgl Lahir:</span><br>${escapeHtml(p.tempatLahir)}, ${p.tanggalLahir}</div>
          <div><span style="color: var(--text-muted);">Jenis Kelamin:</span><br>${escapeHtml(p.jenisKelamin)}</div>
          <div><span style="color: var(--text-muted);">Nama Orang Tua/Wali:</span><br><strong>${escapeHtml(p.namaOrtu)}</strong></div>
          <div><span style="color: var(--text-muted);">No. WhatsApp / HP:</span><br><a href="https://wa.me/${String(p.hp).replace(/\D/g, '')}" target="_blank">${escapeHtml(p.hp)} 💬</a></div>
          <div style="grid-column: 1/-1;"><span style="color: var(--text-muted);">Alamat Sesuai KK:</span><br>${escapeHtml(p.alamat)}</div>
          <div><span style="color: var(--text-muted);">Asal TK/PAUD:</span><br>${escapeHtml(p.asalTk || '-')}</div>
          <div><span style="color: var(--text-muted);">Waktu Masuk:</span><br>${p.waktuDaftar}</div>
        </div>

        <div style="background: var(--bg-app); padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Berkas Persyaratan Asli (Google Drive):</h4>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            ${p.linkKk ? `<a href="${p.linkKk}" target="_blank" class="btn btn-outline btn-sm">📄 Buka Berkas Kartu Keluarga</a>` : `<span style="color: var(--danger); font-size: 0.85rem;">Berkas KK Tidak Ada</span>`}
            ${p.linkAkta ? `<a href="${p.linkAkta}" target="_blank" class="btn btn-outline btn-sm">📜 Buka Berkas Akta Kelahiran</a>` : `<span style="color: var(--danger); font-size: 0.85rem;">Berkas Akta Tidak Ada</span>`}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ubah Status Verifikasi:</label>
          <select id="modalStatusSelect" class="form-control">
            <option value="baru" ${p.status === 'baru' ? 'selected' : ''}>Baru (Belum Diverifikasi)</option>
            <option value="diproses" ${p.status === 'diproses' ? 'selected' : ''}>Diproses (Sedang Ditinjau)</option>
            <option value="diterima" ${p.status === 'diterima' ? 'selected' : ''}>Diterima (Lulus Verifikasi)</option>
            <option value="ditolak" ${p.status === 'ditolak' ? 'selected' : ''}>Ditolak (Tidak Memenuhi Syarat)</option>
            <option value="dibatalkan" ${p.status === 'dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Admin / Verifikator:</label>
          <textarea id="modalCatatanAdmin" rows="2" class="form-control" placeholder="Tuliskan catatan hasil verifikasi berkas...">${escapeHtml(p.catatanAdmin || '')}</textarea>
        </div>
      `;

      document.getElementById("modalDetailPendaftar").classList.add("active");

      document.getElementById("btnSimpanStatusPendaftar").onclick = async () => {
        const newStatus = document.getElementById("modalStatusSelect").value;
        const newCatatan = document.getElementById("modalCatatanAdmin").value.trim();

        try {
          await apiCall("admin_updatePendaftar", {
            nomorPendaftaran: p.nomorPendaftaran,
            status: newStatus,
            catatanAdmin: newCatatan
          });

          p.status = newStatus;
          p.catatanAdmin = newCatatan;
          showToast(`Status pendaftaran ${p.nomorPendaftaran} berhasil diubah!`, "success");
          AppPendaftar.closeModal();
          loadPendaftarTable();
        } catch (e) {
          showToast("Gagal memperbarui status: " + e.message, "error");
        }
      };
    },

    closeModal: function () {
      document.getElementById("modalDetailPendaftar").classList.remove("active");
    }
  };
  window.AppPendaftar = AppPendaftar;

  function initPendaftarEvents() {
    document.getElementById("filterStatusPendaftar").addEventListener("change", loadPendaftarTable);
    document.getElementById("searchPendaftar").addEventListener("input", loadPendaftarTable);
    document.getElementById("btnRefreshPendaftar").addEventListener("click", async () => {
      showToast("Memuat ulang data pendaftar...");
      await loadAllData();
      loadPendaftarTable();
    });

    document.getElementById("btnExportCsv").addEventListener("click", exportPendaftarCsv);
  }

  function loadPendaftarTable() {
    const tbody = document.getElementById("tablePendaftarBody");
    const filterStatus = document.getElementById("filterStatusPendaftar").value;
    const query = document.getElementById("searchPendaftar").value.toLowerCase().trim();

    let list = AppState.pendaftarList;
    if (filterStatus) {
      list = list.filter((p) => p.status === filterStatus);
    }
    if (query) {
      list = list.filter((p) => (p.namaMurid && p.namaMurid.toLowerCase().includes(query)) || (p.nomorPendaftaran && p.nomorPendaftaran.toLowerCase().includes(query)));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Tidak ada pendaftar yang sesuai.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (p) => `
      <tr>
        <td><code>${p.nomorPendaftaran}</code></td>
        <td><strong>${escapeHtml(p.namaMurid)}</strong></td>
        <td>${p.waktuDaftar || '-'}</td>
        <td>${escapeHtml(p.namaOrtu)}</td>
        <td>${escapeHtml(p.hp)}</td>
        <td><span class="badge badge-${p.status || 'baru'}">${p.status || 'baru'}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="AppPendaftar.viewDetail('${p.nomorPendaftaran}')">Detail & Verifikasi</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function exportPendaftarCsv() {
    if (AppState.pendaftarList.length === 0) {
      showToast("Belum ada data pendaftar untuk diekspor.", "error");
      return;
    }

    const headers = ["No. Pendaftaran", "Waktu Daftar", "Nama Murid", "NIK", "Tempat Lahir", "Tgl Lahir", "Jenis Kelamin", "Nama Ortu", "No. HP", "Alamat", "Asal TK", "Status", "Catatan Admin"];
    const rows = AppState.pendaftarList.map((p) => [
      `"${p.nomorPendaftaran}"`,
      `"${p.waktuDaftar}"`,
      `"${p.namaMurid}"`,
      `"'${p.nik}"`,
      `"${p.tempatLahir}"`,
      `"${p.tanggalLahir}"`,
      `"${p.jenisKelamin}"`,
      `"${p.namaOrtu}"`,
      `"'${p.hp}"`,
      `"${p.alamat}"`,
      `"${p.asalTk || ''}"`,
      `"${p.status}"`,
      `"${p.catatanAdmin || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pendaftar_SPMB_SDN_Sumberejo_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // 7. PUSTAKA MEDIA & KOMPRESI UNGGAH
  // ==========================================
  function initMediaUpload() {
    const fileInput = document.getElementById("inputUploadMediaFile");
    const progress = document.getElementById("mediaUploadProgressBar");
    const progressText = document.getElementById("mediaUploadProgressText");

    fileInput.addEventListener("change", async () => {
      if (!fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];

      progress.style.display = "block";
      progressText.textContent = `Mengompresi ${file.name} di browser...`;

      try {
        // Kompresi di sisi browser via ImageProcessor
        const processed = await ImageProcessor.compress(file);
        progressText.textContent = `Mengunggah ${processed.name} (${processed.sizeFormatted}) ke Google Drive...`;

        const result = await apiCall("admin_uploadMedia", {
          berkas: {
            nama: processed.name,
            mime: processed.mime,
            base64: processed.base64
          },
          alt: file.name
        });

        showToast("Foto berhasil dikompresi dan diunggah ke Google Drive!", "success");
        loadMediaLibrary();
      } catch (err) {
        showToast("Gagal mengunggah foto: " + err.message, "error");
      } finally {
        progress.style.display = "none";
        fileInput.value = "";
      }
    });
  }

  async function loadMediaLibrary() {
    const grid = document.getElementById("mediaLibraryGrid");
    try {
      const list = await apiCall("admin_listMedia");
      AppState.mediaList = list || [];

      if (AppState.mediaList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada foto yang diunggah. Klik tombol '+ Unggah Foto Baru' di atas.</div>`;
        return;
      }

      grid.innerHTML = AppState.mediaList
        .map(
          (m) => `
        <div class="media-item" onclick="navigator.clipboard.writeText('${m.url}'); showToast('URL Foto berhasil disalin!')">
          <img src="${m.url}" alt="${escapeHtml(m.alt || m.namaAsli)}" class="media-thumb" loading="lazy">
          <div class="media-meta" title="${escapeHtml(m.namaAsli)}">${escapeHtml(m.namaAsli)}</div>
        </div>
      `
        )
        .join("");
    } catch (e) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 2rem;">Gagal memuat pustaka media.</div>`;
    }
  }

  // ==========================================
  // 8. MANAJEMEN KOLEKSI (CRUD)
  // ==========================================
  async function loadCollection(sheetName) {
    // Dipanggil saat membuka tab koleksi
  }

  window.AppCollections = {
    openModal: function (sheetName) {
      showToast(`Fitur tambah ${sheetName} dibuka.`);
    }
  };

  // ==========================================
  // 9. PENGGUNA ADMIN & AUDIT LOG
  // ==========================================
  async function loadUsersList() {
    const tbody = document.getElementById("tableUsersBody");
    try {
      const list = await apiCall("admin_listUsers");
      tbody.innerHTML = (list || [])
        .map(
          (u) => `
        <tr>
          <td><code>${escapeHtml(u.namaPengguna)}</code></td>
          <td><strong>${escapeHtml(u.namaTampil)}</strong></td>
          <td><span class="role-pill ${u.peran}">${formatRoleName(u.peran)}</span></td>
          <td>${u.aktif ? '<span style="color: var(--success); font-weight: 700;">Aktif</span>' : '<span style="color: var(--danger);">Nonaktif</span>'}</td>
          <td><button class="btn btn-outline btn-sm">Edit</button></td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat pengguna.</td></tr>`;
    }
  }

  async function loadAuditLog() {
    const tbody = document.getElementById("tableLogBody");
    try {
      const logs = await apiCall("admin_listLog");
      tbody.innerHTML = (logs || [])
        .map(
          (l) => `
        <tr>
          <td><small>${l.waktu}</small></td>
          <td><strong>${escapeHtml(l.pengguna)}</strong></td>
          <td><code>${escapeHtml(l.aksi)}</code></td>
          <td>${escapeHtml(l.modul)}</td>
          <td>${escapeHtml(l.ringkasan)}</td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat log aktivitas.</td></tr>`;
    }
  }

  // ==========================================
  // 10. HELPER NOTIFIKASI TOAST & SANITASI
  // ==========================================
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
  window.showToast = showToast;

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
