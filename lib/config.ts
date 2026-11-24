import type { Settings } from './types';

export const DEFAULT_URL = '/api';
export const DEFAULT_KEY = 'ollama-local';

/** Model default: Qwen3 8B (Q4_K_M) di instabox. */
export const DEFAULT_MODEL = 'qwen3:8b-q4_K_M';

/** Domain tetap ngrok → sandbox instabox. Dipakai untuk dokumentasi & fallback. */
export const PUBLIC_ENDPOINT = 'https://subscribe-cancel-reckless.ngrok-free.dev';

export const DEFAULT_SYSTEM_PROMPT = `Kamu adalah asisten AI akademik untuk mahasiswa dan dosen Politeknik Negeri Manado (Polimdo).

Aturan:
- Selalu jawab dalam Bahasa Indonesia yang baik dan benar sesuai PUEBI.
- Susun jawaban rapi: gunakan heading, daftar bernomor, dan tabel bila membantu.
- Untuk soal teknis, berikan langkah konkret yang bisa langsung dijalankan.
- Bila pengguna melampirkan dokumen, jawab berdasarkan isi dokumen dan sebutkan bagian mana yang dipakai.
- Jangan mengarang referensi, angka, atau kutipan. Bila tidak yakin, katakan tidak tahu.
- Akhiri jawaban panjang dengan satu kalimat pengingat untuk memverifikasi informasi penting.`;

export const DEFAULT_SETTINGS: Settings = {
  url: DEFAULT_URL,
  key: DEFAULT_KEY,
  model: DEFAULT_MODEL,
  temperature: 0.7,
  thinking: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILE_CHARS = 24_000; // potong isi agar tidak meledak konteks
export const MAX_PDF_PAGES = 40;

export const TEXT_EXT = [
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'py', 'js', 'mjs',
  'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs',
  'php', 'rb', 'html', 'css', 'scss', 'xml', 'yml', 'yaml', 'sql', 'ini',
  'toml', 'sh', 'bat', 'ps1', 'env', 'conf', 'gitignore',
];

export const CODE_EXT = [
  'py', 'js', 'mjs', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'scss', 'xml', 'yml',
  'yaml', 'sql', 'sh', 'bat', 'ps1', 'json',
];

export const SUGGESTIONS = [
  {
    icon: '💡',
    title: 'Jelaskan konsep',
    detail: 'cloud computing untuk pemula',
    prompt:
      'Jelaskan konsep dasar cloud computing untuk pemula, lengkap dengan contoh layanan IaaS, PaaS, dan SaaS.',
  },
  {
    icon: '📝',
    title: 'Buat soal',
    detail: '5 pilihan ganda tentang jaringan komputer',
    prompt:
      'Buatkan 5 soal pilihan ganda tentang dasar jaringan komputer beserta kunci jawaban dan pembahasan singkat.',
  },
  {
    icon: '🔍',
    title: 'Periksa ejaan',
    detail: 'dan perbaiki kalimat formal saya',
    prompt:
      'Periksa ejaan, tanda baca, dan gaya bahasa pada kalimat berikut, lalu berikan versi perbaikannya sesuai PUEBI.',
  },
  {
    icon: '🎓',
    title: 'Simulasi viva',
    detail: 'uji pemahaman saya tentang skripsi',
    prompt:
      'Berperanlah sebagai dosen penguji sidang. Ajukan pertanyaan viva voce satu per satu, dan nilai jawaban saya.',
  },
];

export function apiBase(s: Settings): string {
  return (s.url || DEFAULT_URL).replace(/\/+$/, '');
}

export function headers(s: Settings): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${s.key}`,
    'ngrok-skip-browser-warning': 'true',
  };
}
