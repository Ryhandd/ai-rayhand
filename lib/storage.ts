import type { Attachment, Conversation, Settings } from './types';
import { DEFAULT_SETTINGS } from './config';

const K_CONVS = 'ai.convs.v2';
const K_SET = 'ai.settings.v2';
const K_CUR = 'ai.current.v2';

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(K_SET);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(K_SET, JSON.stringify(s));
  } catch {
    /* storage penuh */
  }
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(K_CONVS);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

/**
 * Simpan riwayat. Bila kuota localStorage habis, buang percakapan paling lama
 * sampai muat (maks 3 percakapan) agar aplikasi tidak pernah mati total.
 */
export function saveConversations(list: Conversation[]): Conversation[] {
  let data = list;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(K_CONVS, JSON.stringify(data));
      return data;
    } catch {
      if (data.length <= 1) return data;
      data = data.slice(0, Math.max(1, Math.floor(data.length / 2)));
    }
  }
  return data;
}

export function loadCurrentId(): string | null {
  try {
    return localStorage.getItem(K_CUR);
  } catch {
    return null;
  }
}

export function saveCurrentId(id: string | null): void {
  try {
    if (id) localStorage.setItem(K_CUR, id);
    else localStorage.removeItem(K_CUR);
  } catch {
    /* noop */
  }
}

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function extOf(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/** Susun isi pesan: teks pengguna + isi dokumen terlampir. */
export function composeContent(text: string, files: Attachment[]): string {
  const ready = files.filter((f) => !f.loading && !f.error && f.text);
  if (!ready.length) return text;
  const docs = ready
    .map((f) => `--- FILE: ${f.name} ---\n${f.text}\n--- AKHIR ${f.name} ---`)
    .join('\n\n');
  return `${text ? text + '\n\n' : ''}Dokumen terlampir:\n\n${docs}`;
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}
