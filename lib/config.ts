import type { Settings } from './types';
import { DEFAULT_MODE, getPreset } from './presets';

export const DEFAULT_URL = '/api';
export const DEFAULT_KEY = 'ollama-local';

/** Model teks default: Qwen3 8B (Q4_K_M) di instabox. */
export const DEFAULT_MODEL = 'qwen3:8b-q4_K_M';

/** Model yang membaca gambar (vision). Ringan, jalan di CPU 8 GB. */
export const VISION_MODEL = 'moondream:1.8b';

/** Model vision cadangan bila yang utama tidak ada. */
export const VISION_MODELS = ['moondream:1.8b', 'qwen2.5vl:3b'];

/** Domain tetap ngrok → sandbox instabox. Dipakai untuk dokumentasi & fallback. */
export const PUBLIC_ENDPOINT = 'https://subscribe-cancel-reckless.ngrok-free.dev';

/** Endpoint generator gambar (Pollinations, tanpa API key). */
export const IMAGE_GEN_BASE = 'https://image.pollinations.ai/prompt';

export const DEFAULT_SYSTEM_PROMPT = getPreset(DEFAULT_MODE).systemPrompt;

export const DEFAULT_SETTINGS: Settings = {
  url: DEFAULT_URL,
  key: DEFAULT_KEY,
  model: DEFAULT_MODEL,
  temperature: getPreset(DEFAULT_MODE).temperature,
  thinking: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  mode: DEFAULT_MODE,
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILE_CHARS = 24_000; // potong isi agar tidak meledak konteks
export const MAX_PDF_PAGES = 40;
/** Batas gambar: 4 MB (setelah dikompres di browser). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Sisi terpanjang gambar setelah dikompres — cukup untuk OCR, hemat bandwidth. */
export const MAX_IMAGE_SIDE = 1280;

export const TEXT_EXT = [
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'py', 'js', 'mjs',
  'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs',
  'php', 'rb', 'html', 'css', 'scss', 'xml', 'yml', 'yaml', 'sql', 'ini',
  'toml', 'sh', 'bat', 'ps1', 'env', 'conf', 'gitignore',
];

export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

export const CODE_EXT = [
  'py', 'js', 'mjs', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'scss', 'xml', 'yml',
  'yaml', 'sql', 'sh', 'bat', 'ps1', 'json',
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
