/**
 * Modul Kompresi dan Pengolahan Gambar Klien (Client-Side Image Processing)
 * Mengompresi foto langsung di browser pengguna sebelum diunggah ke Google Drive
 * Sesuai spesifikasi PRD-CMS.md Bagian 9
 */

window.ImageProcessor = (function () {
  const MAX_INPUT_SIZE = 15 * 1024 * 1024; // 15 MB
  const TARGET_MAX_OUTPUT_SIZE = 600 * 1024; // 600 KB
  const ABSOLUTE_MAX_OUTPUT_SIZE = 1.5 * 1024 * 1024; // 1.5 MB (Batas aman GAS)
  const MAX_DIMENSION_DEFAULT = 1600; // px
  const MAX_DIMENSION_HERO = 2000; // px

  /**
   * Mengompresi berkas gambar dari input file
   * @param {File} file Berkas gambar asli dari input/kamera
   * @param {string} purpose Tujuan penggunaan ('hero', 'guru', 'fasilitas', dll)
   * @returns {Promise<{base64: string, mime: string, name: string, width: number, height: number, size: number}>}
   */
  async function compressImage(file, purpose = "general") {
    if (!file) throw new Error("Berkas gambar tidak ditemukan.");

    if (file.size > MAX_INPUT_SIZE) {
      throw new Error(`Ukuran foto terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maksimal 15 MB sebelum kompresi.`);
    }

    const maxDimension = purpose === "hero" ? MAX_DIMENSION_HERO : MAX_DIMENSION_DEFAULT;

    // Baca berkas sebagai ImageBitmap atau HTMLImageElement dengan orientasi otomatis
    const imgBitmap = await readImageBitmap(file);

    // Hitung dimensi baru proporsional
    let { width, height } = imgBitmap;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Gambar ulang di canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Latar belakang putih untuk menangani PNG transparan yang dikonversi ke JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    // Kompresi bertahap untuk mencapai target di bawah 600 KB
    let quality = 0.82;
    let blob = await getCanvasBlob(canvas, "image/jpeg", quality);

    while (blob.size > TARGET_MAX_OUTPUT_SIZE && quality > 0.55) {
      quality -= 0.08;
      blob = await getCanvasBlob(canvas, "image/jpeg", quality);
    }

    if (blob.size > ABSOLUTE_MAX_OUTPUT_SIZE) {
      throw new Error(`Gagal mengompresi foto ke batas aman (${(blob.size / (1024 * 1024)).toFixed(2)} MB). Mohon gunakan foto dengan resolusi lebih rendah.`);
    }

    // Konversi blob ke base64 murni (tanpa prefix data:image/jpeg;base64,)
    const base64 = await blobToBase64(blob);

    // Bersihkan ekstensi nama berkas asli menjadi .jpg
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const cleanFileName = sanitizeFileName(baseName) + ".jpg";

    return {
      base64: base64,
      mime: "image/jpeg",
      name: cleanFileName,
      width: width,
      height: height,
      size: blob.size,
      sizeFormatted: (blob.size / 1024).toFixed(0) + " KB"
    };
  }

  function readImageBitmap(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => readImageElement(file));
    }
    return readImageElement(file);
  }

  function readImageElement(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Format foto tidak dapat dibaca oleh browser."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Gagal membaca berkas dari perangkat."));
      reader.readAsDataURL(file);
    });
  }

  function getCanvasBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function sanitizeFileName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").substring(0, 40);
  }

  return {
    compress: compressImage
  };
})();
