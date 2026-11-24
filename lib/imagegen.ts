import { IMAGE_GEN_BASE } from './config';

/** Ukuran gambar yang didukung. */
export type ImageSize = 'square' | 'landscape' | 'portrait';

const DIMS: Record<ImageSize, { w: number; h: number }> = {
  square: { w: 1024, h: 1024 },
  landscape: { w: 1280, h: 720 },
  portrait: { w: 720, h: 1280 },
};

/** Kata kunci pemicu generate gambar di awal pesan pengguna. */
const GEN_HINTS = [
  /^\/?(?:gambar|image|img|buatkan gambar|bikin gambar|generate)\b[:\s]+(.+)/i,
  /^\/?(?:draw|lukis)\b[:\s]+(.+)/i,
];

export interface GenRequest {
  prompt: string;
  size: ImageSize;
}

/**
 * Deteksi apakah pesan pengguna minta dibuatkan gambar.
 * Mengembalikan prompt gambar, atau null bila pesan biasa.
 */
export function parseImageRequest(input: string): GenRequest | null {
  const text = input.trim();
  if (!text) return null;

  for (const re of GEN_HINTS) {
    const m = text.match(re);
    if (m?.[1]?.trim()) {
      const prompt = m[1].trim();
      const size: ImageSize = /(lebar|landscape|horizontal)/i.test(text)
        ? 'landscape'
        : /(tinggi|potret|portrait|vertikal)/i.test(text)
          ? 'portrait'
          : 'square';
      return { prompt, size };
    }
  }
  return null;
}

/**
 * Susun URL gambar. Dipakai langsung sebagai <img src>, jadi tidak perlu
 * fetch dan tidak ada masalah CORS.
 *
 * Catatan: layanan ini berjalan di luar sandbox (Pollinations.AI), bukan
 * model lokal — CPU 8 GB tanpa GPU tidak mampu membuat gambar.
 */
export function buildImageUrl(prompt: string, size: ImageSize = 'square', seed?: number): string {
  const { w, h } = DIMS[size];
  const q = new URLSearchParams({
    width: String(w),
    height: String(h),
    nologo: 'true',
    seed: String(seed ?? Math.floor(Math.random() * 1_000_000)),
  });
  return `${IMAGE_GEN_BASE}/${encodeURIComponent(prompt)}?${q.toString()}`;
}

/** Tunggu sampai gambar benar-benar termuat (atau gagal) sebelum ditampilkan. */
export function preloadImage(url: string, timeoutMs = 90_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => {
      img.src = '';
      reject(new Error('gambar gagal dimuat (timeout)'));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('gambar gagal dibuat'));
    };
    img.src = url;
  });
}

/**
 * Buat gambar dengan beberapa percobaan. Layanan gambar publik kadang
 * membalas 503 saat antre; seed baru biasanya langsung berhasil.
 * Mengembalikan URL yang sudah terbukti termuat.
 */
export async function generateImage(
  prompt: string,
  size: ImageSize = 'square',
  attempts = 3,
): Promise<string> {
  let last: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    const url = buildImageUrl(prompt, size);
    try {
      await preloadImage(url, 75_000);
      return url;
    } catch (e) {
      last = e as Error;
      await new Promise((r) => setTimeout(r, 1_500 * (i + 1)));
    }
  }
  throw last ?? new Error('gambar gagal dibuat');
}
