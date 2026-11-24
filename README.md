# AI Rayhand — Asisten Akademik

Antarmuka chat ala ChatGPT untuk demo akademik Politeknik Negeri Manado.
Dibangun dengan **Next.js 14 (App Router) + Tailwind CSS**. Otak AI tetap berjalan di
Google Colab (Ollama) dan diakses lewat ngrok, dengan **proxy** di sisi Next.js sehingga
bebas masalah CORS.

```
Browser ──► Vercel (Next.js + /api proxy) ──► ngrok ──► Ollama di Colab
```

## Fitur

| Fitur | Keterangan |
|---|---|
| Streaming jawaban | Token muncul bertahap, ada tombol hentikan (■) |
| Lampiran file | Tombol 📎, **tarik-lepas** ke halaman, atau **tempel** dengan Ctrl+V |
| Format didukung | PDF (pdf.js), DOCX (mammoth), TXT, MD, CSV, JSON, dan semua file kode |
| Markdown | Heading, daftar, tabel, tebal, blok kode + tombol salin |
| Riwayat | Sidebar percakapan, tersimpan di localStorage, bisa dihapus per item |
| Pilih model | Terisi otomatis dari `/v1/models` milik server |
| Status server | Indikator hijau/kuning/merah, diperiksa tiap 60 detik |
| Pengaturan | Base URL, API key, temperature, dan prompt sistem bisa diubah dari UI |
| Responsif | Sidebar jadi panel geser di layar HP |

Batas aman: **20 MB** per file, isi dipotong di **24.000 karakter**, maksimal **40 halaman** PDF,
pesan maksimal **1 MB**.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Deploy ke Vercel

1. Push repo ini ke GitHub
2. vercel.com → **Add New Project** → pilih repo
3. Framework otomatis terdeteksi **Next.js** → **Deploy**

### Environment Variables (opsional, tapi disarankan)

Di Vercel → Project → Settings → Environment Variables:

| Nama | Nilai contoh | Guna |
|---|---|---|
| `AI_UPSTREAM` | `https://subscribe-cancel-reckless.ngrok-free.dev` | Alamat backend. Boleh beberapa, pisah koma: `https://a.ngrok-free.dev,https://b.ngrok-free.dev` |
| `AI_KEY` | `ollama-local` | Kunci yang dikirim ke backend |

Kalau tidak diisi, nilai default di `app/api/[...path]/route.ts` dipakai.
**Kalau URL ngrok Anda berubah, cukup ubah `AI_UPSTREAM` di Vercel dan Redeploy —
tidak perlu mengubah kode atau push ulang.**

## Struktur

```
app/
  layout.tsx                Root layout + font + metadata
  page.tsx                  Komponen utama chat
  globals.css               Tailwind + gaya markdown
  api/[...path]/route.ts    Proxy ke backend (edge runtime)
components/
  Message.tsx               Balon pesan + tombol salin/ulangi
  Markdown.tsx              Renderer markdown ringan
  ModelPicker.tsx           Daftar model otomatis
  SettingsModal.tsx         Dialog pengaturan
lib/
  api.ts                    fetchModels + streamChat (SSE)
  config.ts                 Default + prompt sistem
  files.ts                  Ekstraksi PDF/DOCX/teks
  storage.ts                localStorage + util
  types.ts                  Tipe bersama
  useAttachments.ts         Hook lampiran (drag/drop, paste, pilih file)
```

## Catatan operasional

- Setiap kali Colab di-restart: jalankan ulang cell **"JALANKAN"**, lalu salin URL ngrok
  bila berubah ke `AI_UPSTREAM` di Vercel.
- Selama Colab hidup tapi halaman ini bilang *offline*, tekan tombol **↻** di kanan atas
  atau buka **⚙ Pengaturan** untuk memeriksa Base URL.
- AI dapat membuat kesalahan — selalu verifikasi informasi penting (human-in-the-loop).
