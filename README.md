# AI Rayhand — Asisten Akademik

Antarmuka chat ala ChatGPT untuk demo akademik Politeknik Negeri Manado.
Dibangun dengan **Next.js 14 (App Router) + Tailwind CSS**. Otak AI berjalan di
**sandbox instabox** (Ollama, CPU-only) dan diakses lewat **ngrok** dengan domain
tetap, lalu dilindungi **proxy** di sisi Next.js sehingga bebas masalah CORS.

```
Browser → Vercel (Next.js + /api proxy) → ngrok (domain tetap) → Ollama di instabox
```

Model default: **`qwen3:8b-q4_K_M`** (Qwen3 8B, Q4_K_M, 5,2 GB) di
4 vCPU / 8 GiB RAM — sekitar **13 tok/s**.
Model pembaca gambar: **`moondream:1.8b`** (1,7 GB). Pembuat gambar memakai
layanan eksternal **Pollinations.AI** (tanpa kunci API) karena sandbox tanpa GPU.

## Fitur

| Fitur | Keterangan |
|---|---|
| Streaming jawaban | Token muncul bertahap, ada tombol hentikan |
| Mode akademik | 5 preset yang menyetel prompt sistem + temperature sekaligus |
| Baca gambar | Lampirkan screenshot/foto — otomatis dialihkan ke model vision |
| Buat gambar | Ketik `gambar: …` di kolom pesan |
| Mode berpikir | Qwen3 menampilkan penalaran (`/think`), bisa dilipat |
| Perintah `/` | Ketik `/` di kolom pesan — menu muncul otomatis |
| Lampiran file | Tombol 📎, **tarik-lepas**, atau **tempel** Ctrl+V |
| Format didukung | PDF, DOCX, TXT, MD, CSV, JSON, semua file kode, dan gambar |
| Markdown | Heading, daftar, tabel, tebal, blok kode + tombol salin |
| Riwayat | Sidebar percakapan, tersimpan di localStorage |
| Pilih model | Terisi otomatis dari `/v1/models` |
| Status server | Indikator hijau/kuning/merah, diperiksa tiap 60 detik |
| Pengaturan | Base URL, API key, model, temperature, prompt sistem, mode |
| Ekspor | `/export` mengunduh percakapan sebagai Markdown |

Batas aman: **20 MB** per file, isi dipotong di **24.000 karakter**, maksimal
**40 halaman** PDF, gambar diperkecil ke maks **1280 px**, pesan maksimal **6 MB**.

## Mode akademik

Lima preset, dapat dipilih dari sidebar, dialog Pengaturan, atau `/mode <nama>`.
Setiap preset mengganti prompt sistem dan temperature sekaligus.

| id | Nama | Temp | Guna |
|---|---|---|---|
| `umum` | ✦ Chat umum | 0,7 | Tanya apa saja, jawaban dirapikan |
| `viva` | 🎓 Viva Voce | 0,6 | Menilai naskah, titik lemah, 3 pertanyaan cecaran (*butuh dokumen*) |
| `rps` | 📋 RPS & PBL | 0,5 | RPS 16 pertemuan, studi kasus PBL, 3 soal bertingkat, rubrik |
| `rag` | 🔎 RAG Regulasi | 0,2 | Jawab hanya berdasarkan regulasi terlampir (*butuh dokumen*) |
| `eyd` | ✍️ Periksa EYD | 0,2 | Koreksi ejaan & kalimat dalam bentuk tabel |

## Baca gambar

Lampirkan gambar lewat 📎, tarik-lepas, atau Ctrl+V. UI mendeteksi lampiran
bergambar lalu otomatis memakai model vision — tidak perlu mengganti model
manual. Gambar diperkecil ke maks 1280 px di browser sebelum dikirim agar
prompt tidak membengkak, dan hanya gambar pada pesan terakhir yang dikirim.

Model vision yang dipakai dicari berurutan dari `VISION_MODELS`
(`moondream:1.8b`, lalu `qwen2.5vl:3b`). `moondream` cepat (~8–13 detik) tapi
hanya mendeskripsikan; `qwen2.5vl` bisa OCR teks kecil tapi lambat (~67 detik).

## Buat gambar

Ketik salah satu bentuk ini, lalu Enter:

```
gambar: kucing oren lucu
buatkan gambar pemandangan gunung
/img matahari terbenam
draw a red apple
lukis: bunga matahari
```

Tambahkan kata **lebar/landscape** untuk rasio 16:9, atau **potret/portrait**
untuk 9:16. Default persegi 1024×1024.

> Gambar dibuat oleh **Pollinations.AI**, bukan model lokal — CPU tanpa GPU tidak
> mampu menghasilkan gambar. Kalau layanan itu membalas 503, UI mencoba ulang
> otomatis sampai 3 kali dengan seed baru sebelum menyerah.

## Base URL — apa yang diisi di mana

Ada dua tingkat, dan keduanya berbeda:

### 1. Di situs ini (ai-rayhand.vercel.app)

Biarkan **kosong** di dialog Pengaturan. Artinya memakai `/api`, yaitu proxy
milik situs ini sendiri. Browser hanya bicara ke domain yang sama — URL ngrok
tidak pernah tampil, dan tidak ada CORS.

| Kolom | Isi |
|---|---|
| Base URL | *(kosong)* → otomatis `/api` |
| API key | `ollama-local` |

Hanya isi Base URL langsung kalau kamu memang ingin melewati proxy, misalnya
saat menguji: `https://subscribe-cancel-reckless.ngrok-free.dev/v1`.

### 2. Di situs/aplikasi lain (eksternal)

Mereka tidak boleh memakai `/api` — itu milik situs ini. Arahkan ke proxy
Vercel, atau langsung ke ngrok:

| Tujuan | Base URL | API key |
|---|---|---|
| Lewat proxy Vercel (disarankan) | `https://ai-rayhand.vercel.app/api` | `ollama-local` |
| Langsung ke ngrok | `https://subscribe-cancel-reckless.ngrok-free.dev/v1` | `ollama-local` |

Model: `qwen3:8b-q4_K_M` — atau `moondream:1.8b` untuk gambar.

Proxy Vercel sudah mengirim header CORS (`access-control-allow-origin: *`),
jadi bisa dipanggil langsung dari browser situs lain. Endpoint yang
diteruskan hanya `models`, `chat/completions`, `completions`, `embeddings`.

Contoh dari mana saja:

```bash
curl -N https://ai-rayhand.vercel.app/api/chat/completions \
  -H "Authorization: Bearer ollama-local" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b-q4_K_M","stream":true,"reasoning_effort":"none",
       "messages":[{"role":"user","content":"Halo"}]}'
```

> **Wajib `stream: true`.** Proxy port instabox memutus koneksi yang diam
> ~20 detik. Dengan `stream: false` jawaban panjang berakhir 502.

## Perintah di kolom pesan

Ketik `/` untuk membuka menu (↑↓ pilih, Tab/Enter jalankan, Esc batal).

| Perintah | Guna |
|---|---|
| `/mode` | Ganti mode akademik. Tanpa argumen: tampilkan daftar |
| `/model` | Daftar model. `/model qwen3` memilih berdasarkan potongan nama |
| `/img` | Buat gambar. `/img kucing oren` |
| `/think` | Nyalakan/matikan mode berpikir. `/think on` atau `/think off` |
| `/system` | Ganti prompt sistem |
| `/url` | Lihat/ganti Base URL |
| `/info` | Model aktif, temperature, endpoint |
| `/settings` | Buka dialog pengaturan |
| `/new` | Percakapan baru |
| `/clear` | Kosongkan percakapan aktif |
| `/export` | Unduh percakapan sebagai `.md` |
| `/help` | Daftar perintah |

Temperature tidak punya perintah sendiri karena diatur oleh preset mode —
ubah lewat `/settings` bila perlu nilai lain.

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

### Environment Variables (opsional)

Di Vercel → Project → Settings → Environment Variables:

| Nama | Nilai contoh | Guna |
|---|---|---|
| `AI_UPSTREAM` | `https://subscribe-cancel-reckless.ngrok-free.dev` | Alamat backend. Boleh beberapa, pisah koma |
| `AI_KEY` | `ollama-local` | Kunci yang dikirim ke backend |
| `AI_DEFAULT_MODEL` | `qwen3:8b-q4_K_M` | Model bila klien tidak mengirim field `model` |

Kalau tidak diisi, nilai default di `app/api/[...path]/route.ts` yang dipakai.
**Kalau domain ngrok berubah, cukup ubah `AI_UPSTREAM` di Vercel dan Redeploy —
tidak perlu mengubah kode.**

## Struktur

```
app/
  layout.tsx                Root layout + font + metadata
  page.tsx                  Komponen utama chat
  globals.css               Tailwind + gaya markdown
  api/[...path]/route.ts    Proxy streaming ke backend (CORS, 6 MB)
components/
  Message.tsx               Balon pesan, penalaran, gambar, pratinjau, salin
  Markdown.tsx              Renderer markdown ringan
  ModePicker.tsx            Daftar 5 mode akademik di sidebar
  ModelPicker.tsx           Daftar model otomatis
  SettingsModal.tsx         Dialog pengaturan + pilihan mode
  CommandMenu.tsx           Menu saran perintah
lib/
  api.ts                    fetchModels + streamChat (SSE, `reasoning`, vision)
  commands.ts               Daftar perintah + parser
  config.ts                 Default, model vision, batas gambar
  presets.ts                5 preset mode akademik
  imagegen.ts               Deteksi permintaan gambar + pembuatan + retry
  files.ts                  Ekstraksi PDF/DOCX/teks + gambar → dataURL
  storage.ts                localStorage + util
  types.ts                  Tipe bersama
  useAttachments.ts         Hook lampiran (drag/drop, paste, pilih file)
```

## Catatan operasional

### Proxy harus streaming, bukan buffering

Versi lama memakai `await upstream.text()`, yang menahan seluruh jawaban
sebelum mengirim satu byte pun. Pada model CPU yang hanya ~13 tok/s, jawaban
60 detik membuat proxy timeout 120 detik terpicu dan berakhir `502`. Sekarang
body di-pipe (`new Response(upstream.body)`), timeout hanya berlaku sampai
byte pertama. **Jangan kembalikan ke `.text()` untuk endpoint chat.**

### Field penalaran Qwen3 bernama `reasoning`

Bukan `reasoning_content` seperti banyak dokumentasi. Membaca field yang salah
membuat jawaban tampak kosong. Untuk mematikan mode berpikir, kirim
`"reasoning_effort": "none"` — satu jawaban turun dari 61 detik ke 7 detik.

Saat ada gambar, `reasoning_effort` tidak dikirim sama sekali karena model
vision tidak memahaminya.

### Tiga model berbagi 8 GiB RAM — jangan dipaksa bersamaan

`qwen3:8b` 5,2 GB + `moondream` 1,7 GB + `qwen2.5vl` 3,2 GB. Ollama meng-unload
model yang tidak terpakai, tetapi `OLLAMA_KEEP_ALIVE=60m` menahannya cukup
lama. Menjalankan model teks dan vision berbarengan pernah memicu **OOM kill**
pada `llama-server`. Hal teraman: biarkan Ollama yang mengelola, jangan
menaikkan `OLLAMA_NUM_PARALLEL`.

### Sandbox instabox

- Sesi gratis maksimal **120 menit** (bisa tumbuh sampai 480), lalu cooldown 60–75 menit
- Idle **30 menit** mem-pause otomatis
- Bangunkan: `instabox wake qwen`
- Model tersimpan di `/data/models`, tidak perlu unduh ulang
- Diagnosa: `instabox exec qwen -- "tail -20 /data/ollama.log"`
- Cek RAM sebelum kirim gambar: `instabox exec qwen -- "free -m; ollama ps"`
