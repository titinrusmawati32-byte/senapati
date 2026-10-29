/**
 * Modul Kompresi dan Pengolahan Gambar Klien (Client-Side Image Processing)
 * Mengompresi foto langsung di browser pengguna sebelum diunggah ke Google Drive
 * Sesuai spesifikasi PRD-CMS.md Bagian 9
 */

window.ImageProcessor = (function () {
  const MAX_INPUT_SIZE = 50 * 1024 * 1024; // 50 MB (Limit maksimal foto per upload sesuai permintaan)
  const TARGET_MAX_OUTPUT_SIZE = 800 * 1024; // 800 KB (Kualitas HD jernih & tajam)
  const ABSOLUTE_MAX_OUTPUT_SIZE = 4.5 * 1024 * 1024; // 4.5 MB (Batas aman payload GAS)
  const MAX_DIMENSION_DEFAULT = 1800; // px
  const MAX_DIMENSION_HERO = 2400; // px

  /**
   * Mengompresi berkas gambar dari input file
   * @param {File} file Berkas gambar asli dari input/kamera (hingga 50 MB)
   * @param {string} purpose Tujuan penggunaan ('hero', 'guru', 'fasilitas', dll)
   * @returns {Promise<{base64: string, mime: string, name: string, width: number, height: number, size: number}>}
   */
  async function compressImage(file, purpose = "general") {
    if (!file) throw new Error("Berkas gambar tidak ditemukan.");

    if (file.size > MAX_INPUT_SIZE) {
      throw new Error(`Ukuran foto (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 50 MB. Mohon pilih foto di bawah 50 MB.`);
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

    // Kompresi bertahap untuk mencapai target di bawah 800 KB dengan kualitas visual tinggi
    let quality = 0.85;
    let blob = await getCanvasBlob(canvas, "image/jpeg", quality);

    while (blob.size > TARGET_MAX_OUTPUT_SIZE && quality > 0.45) {
      quality -= 0.08;
      blob = await getCanvasBlob(canvas, "image/jpeg", quality);
    }

    if (blob.size > ABSOLUTE_MAX_OUTPUT_SIZE) {
      // Jika masih terlalu besar, lakukan resize sekunder 80%
      canvas.width = Math.round(width * 0.8);
      canvas.height = Math.round(height * 0.8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
      blob = await getCanvasBlob(canvas, "image/jpeg", 0.75);
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
