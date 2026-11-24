AI Rayhand — Chat UI
Chat AI ala ChatGPT untuk demo akademik Polimdo. UI statis (HTML/CSS/JS murni), otak AI di Ollama Google Colab via ngrok.

Fitur
- Streaming token (SSE), jawaban muncul kata demi kata
- Sidebar riwayat percakapan (tersimpan di localStorage browser)
- Pilih model: gpt-oss:20b / qwen3:14b / qwen3:8b
- Indikator status server (online/offline, cek tiap 60 detik)
- Pengaturan server (URL & API key) bisa diubah dari UI
- Responsif — jalan di HP
- Bahasa Indonesia + prompt sistem asisten akademik + pengingat human-in-the-loop

Konfigurasi default (bisa diubah via ⚙ Server di UI)
- Base URL: https://subscribe-cancel-reckless.ngrok-free.dev/v1
- API key : ollama-local (dummy — Ollama tidak memvalidasi)

Catatan penting
- Colab WAJIB aktif dulu (jalankan cell "AKTIFKAN AI" di notebook Colab)
- Header ngrok-skip-browser-warning sudah disertakan di semua request
- Tanpa build step, tanpa dependency — deploy langsung ke Vercel/static host

Jalankan lokal
Buka index.html langsung di browser, atau:
python -m http.server 3000

Deploy (Vercel)
1. Push repo ini ke GitHub
2. vercel.com → Add New Project → pilih repo
3. Framework Preset: Other → Deploy
