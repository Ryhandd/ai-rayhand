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

## Fitur

| Fitur | Keterangan |
|---|---|
| Streaming jawaban | Token muncul bertahap, ada tombol hentikan |
| Mode berpikir | Qwen3 menampilkan penalaran (`/think`), bisa dilipat |
| Perintah `/` | Ketik `/` di kolom pesan — menu muncul otomatis |
| Lampiran file | Tombol 📎, **tarik-lepas**, atau **tempel** Ctrl+V |
| Format didukung | PDF, DOCX, TXT, MD, CSV, JSON, dan semua file kode |
| Markdown | Heading, daftar, tabel, tebal, blok kode + tombol salin |
| Riwayat | Sidebar percakapan, tersimpan di localStorage |
| Pilih model | Terisi otomatis dari `/v1/models` |
| Status server | Indikator hijau/kuning/merah, diperiksa tiap 60 detik |
| Pengaturan | Base URL, API key, model, temperature, prompt sistem |
| Ekspor | `/export` mengunduh percakapan sebagai Markdown |

Batas aman: **20 MB** per file, isi dipotong di **24.000 karakter**, maksimal
**40 halaman** PDF, pesan maksimal **1 MB**.

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

Model: `qwen3:8b-q4_K_M`

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
| `/model` | Daftar model. `/model qwen3` memilih berdasarkan potongan nama |
| `/think` | Nyalakan/matikan mode berpikir. `/think on` atau `/think off` |
| `/temp` | Temperature. Tanpa argumen: tampilkan nilai sekarang |
| `/system` | Ganti prompt sistem |
| `/url` | Lihat/ganti Base URL |
| `/info` | Model aktif, temperature, endpoint |
| `/reset` | Kembalikan pengaturan ke bawaan |
| `/settings` | Buka dialog pengaturan |
| `/new` | Percakapan baru |
| `/clear` | Kosongkan percakapan aktif |
| `/export` | Unduh percakapan sebagai `.md` |
| `/help` | Daftar perintah |

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
  api/[...path]/route.ts    Proxy streaming ke backend (edge runtime)
components/
  Message.tsx               Balon pesan + penalaran + tombol salin/ulangi
  Markdown.tsx              Renderer markdown ringan
  ModelPicker.tsx           Daftar model otomatis
  SettingsModal.tsx         Dialog pengaturan
  CommandMenu.tsx           Menu saran perintah
lib/
  api.ts                    fetchModels + streamChat (SSE, tangkap `reasoning`)
  commands.ts               Daftar perintah + parser
  config.ts                 Default + prompt sistem
  files.ts                  Ekstraksi PDF/DOCX/teks
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

### Sandbox instabox

- Sesi gratis maksimal **120 menit**, lalu cooldown 60–75 menit
- Idle **30 menit** mem-pause otomatis
- Bangunkan: `instabox wake qwen`
- Model tersimpan di `/data/models`, tidak perlu unduh ulang
- Diagnosa: `instabox exec qwen -- "tail -20 /data/ollama.log"`
