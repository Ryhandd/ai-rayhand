import {
  MAX_FILE_CHARS,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIDE,
  MAX_PDF_PAGES,
  TEXT_EXT,
} from './config';
import { extOf } from './storage';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Gagal memuat pustaka pembaca file'));
    document.head.appendChild(el);
  });
}

async function readPdf(file: File): Promise<string> {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  // @ts-expect-error pustaka global dari CDN
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) throw new Error('pdf.js tidak tersedia');
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = '';
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES);

  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((i: { str: string }) => i.str).join(' ') + '\n\n';
    if (out.length > MAX_FILE_CHARS) break;
  }
  if (doc.numPages > pages) {
    out += `[... ${doc.numPages - pages} halaman berikutnya tidak dibaca]`;
  }
  return out;
}

async function readDocx(file: File): Promise<string> {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  // @ts-expect-error pustaka global dari CDN
  const mammoth = window.mammoth;
  if (!mammoth) throw new Error('mammoth tidak tersedia');
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value as string;
}

/** Baca file apa pun menjadi teks siap kirim. */
export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('ukuran melebihi 20 MB');
  }

  const ext = extOf(file.name);
  let text: string;

  if (ext === 'pdf') {
    text = await readPdf(file);
  } else if (ext === 'docx') {
    text = await readDocx(file);
  } else if (ext === 'doc') {
    throw new Error('format .doc lama tidak didukung — simpan sebagai .docx');
  } else if (
    TEXT_EXT.includes(ext) ||
    file.type.startsWith('text/') ||
    file.type === 'application/json'
  ) {
    text = await file.text();
  } else {
    text = await file.text();
  }

  if (!text.trim()) throw new Error('file kosong atau tidak ada teks');
  if (text.length > MAX_FILE_CHARS) {
    text =
      text.slice(0, MAX_FILE_CHARS) +
      `\n\n[... dipotong, total ${text.length.toLocaleString('id-ID')} karakter]`;
  }
  return text;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(extOf(file.name));
}

/**
 * Perkecil gambar di browser lalu ubah menjadi data URL.
 *
 * Alasan: model vision lokal (moondream) tetap bisa membaca teks pada gambar
 * 1280 px, sedangkan gambar 4000 px hanya memboroskan bandwidth dan token
 * (tiap potongan gambar menambah ribuan token prompt).
 */
export function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES * 2) {
      reject(new Error('gambar melebihi 8 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('gagal membaca gambar'));
    reader.onload = () => {
      const raw = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('berkas gambar rusak'));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(raw); // tidak bisa kompres — kirim apa adanya
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // 0.85 cukup tajam untuk OCR dan jauh lebih kecil dari PNG.
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
