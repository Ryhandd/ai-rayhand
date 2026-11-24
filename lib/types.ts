export type Role = 'user' | 'assistant' | 'system';

/** Lampiran bisa berupa dokumen teks atau gambar. */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  /** Isi teks (khusus dokumen). */
  text: string;
  /** 'text' = dokumen dibaca jadi teks, 'image' = dikirim ke model vision. */
  kind: 'text' | 'image';
  /** Data URL gambar (khusus kind='image'), dipakai untuk ditampilkan. */
  dataUrl?: string;
  loading?: boolean;
  error?: string;
}

export interface FileMeta {
  name: string;
  size: number;
}

/** Gambar hasil generate (Pollinations). */
export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface Msg {
  id: string;
  role: Role;
  content: string;
  /** Proses berpikir Qwen3, bila mode thinking aktif. */
  reasoning?: string;
  files?: FileMeta[];
  /** Gambar yang dilampirkan pengguna (data URL). */
  images?: string[];
  /** Gambar yang dibuat AI atas permintaan pengguna. */
  generated?: GeneratedImage;
  model?: string;
  ts: number;
}

export interface Conversation {
  id: string;
  title: string;
  msgs: Msg[];
  ts: number;
}

export interface Settings {
  url: string;
  key: string;
  model: string;
  temperature: number;
  /** Qwen3: tampilkan proses berpikir sebelum menjawab. */
  thinking: boolean;
  systemPrompt: string;
  /** Mode akademik aktif (lihat lib/presets.ts). */
  mode: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
  created?: number;
}
