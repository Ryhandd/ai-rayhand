'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Settings } from '@/lib/types';
import { DEFAULT_MODEL, PUBLIC_ENDPOINT } from '@/lib/config';
import { PRESETS, getPreset } from '@/lib/presets';

/** Perintah yang tersedia. */
export interface Command {
  name: string;
  args: string;
  desc: string;
  run: (arg: string, ctx: CommandCtx) => void;
}

export interface CommandCtx {
  settings: Settings;
  setSettings: (s: Settings) => void;
  setInput: (s: string) => void;
  toast: (t: string) => void;
  openSettings: () => void;
  newChat: () => void;
  models: string[];
  clearChat: () => void;
  exportChat: () => string;
  /** Nyalakan mode akademik: ganti preset + prompt sistem sekaligus. */
  setMode: (id: string) => void;
}

export const COMMANDS: Command[] = [
  {
    name: '/mode',
    args: '[nama]',
    desc: 'Ganti mode akademik (umum, viva, rps, rag, eyd). Tanpa argumen: tampilkan daftar.',
    run: (arg, ctx) => {
      const want = arg.trim().toLowerCase();
      if (!want) {
        ctx.toast(`Mode: ${PRESETS.map((p) => p.id).join(', ')} — sekarang: ${ctx.settings.mode}`);
        return;
      }
      const hit =
        PRESETS.find((p) => p.id === want) ??
        PRESETS.find((p) => p.title.toLowerCase().includes(want)) ??
        PRESETS.find((p) => p.short.toLowerCase().includes(want));
      if (!hit) {
        ctx.toast(`Mode "${want}" tidak ada. Pilihan: ${PRESETS.map((p) => p.id).join(', ')}`);
        return;
      }
      ctx.setMode(hit.id);
      ctx.toast(`Mode → ${hit.title}`);
    },
  },
  {
    name: '/model',
    args: '<nama>',
    desc: 'Ganti model. Tanpa argumen, tampilkan daftar model.',
    run: (arg, ctx) => {
      const want = arg.trim();
      if (!want) {
        ctx.toast(
          ctx.models.length ? `Model: ${ctx.models.join(', ')}` : 'Daftar model belum termuat',
        );
        return;
      }
      const hit =
        ctx.models.find((m) => m === want) ??
        ctx.models.find((m) => m.toLowerCase() === want.toLowerCase()) ??
        ctx.models.find((m) => m.toLowerCase().includes(want.toLowerCase()));
      if (!hit) {
        ctx.toast(`Model "${want}" tidak ada. Coba: ${ctx.models.join(', ') || '(kosong)'}`);
        return;
      }
      ctx.setSettings({ ...ctx.settings, model: hit });
      ctx.toast(`Model → ${hit}`);
    },
  },
  {
    name: '/img',
    args: '<deskripsi>',
    desc: 'Buat gambar dari deskripsi teks. Contoh: /img kucing oren sedang belajar.',
    run: (arg, ctx) => {
      const p = arg.trim();
      if (!p) {
        ctx.toast('Tulis deskripsi gambar. Contoh: /img pemandangan gunung saat fajar');
        return;
      }
      ctx.setInput(`gambar: ${p}`);
      ctx.toast('Tekan Enter untuk membuat gambar');
    },
  },
  {
    name: '/think',
    args: '[on|off]',
    desc: 'Tampilkan proses berpikir model sebelum menjawab.',
    run: (arg, ctx) => {
      const a = arg.trim().toLowerCase();
      const on = a ? a === 'on' || a === 'true' || a === '1' : !ctx.settings.thinking;
      ctx.setSettings({ ...ctx.settings, thinking: on });
      ctx.toast(`Mode berpikir: ${on ? 'AKTIF' : 'mati'}`);
    },
  },
  {
    name: '/system',
    args: '<teks>',
    desc: 'Ganti prompt sistem. Tanpa argumen, tampilkan yang sekarang.',
    run: (arg, ctx) => {
      const a = arg.trim();
      if (!a) {
        ctx.toast(`Prompt sistem: ${ctx.settings.systemPrompt.slice(0, 60)}…`);
        return;
      }
      ctx.setSettings({ ...ctx.settings, systemPrompt: a });
      ctx.toast('Prompt sistem diperbarui');
    },
  },
  {
    name: '/url',
    args: '[base-url]',
    desc: 'Lihat atau ganti Base URL backend.',
    run: (arg, ctx) => {
      const a = arg.trim();
      if (!a) {
        ctx.toast(`Base URL: ${ctx.settings.url === '/api' ? PUBLIC_ENDPOINT : ctx.settings.url}`);
        return;
      }
      ctx.setSettings({ ...ctx.settings, url: a.replace(/\/+$/, '') });
      ctx.toast(`Base URL → ${a}`);
    },
  },
  {
    name: '/settings',
    args: '',
    desc: 'Buka dialog pengaturan.',
    run: (_arg, ctx) => ctx.openSettings(),
  },
  {
    name: '/new',
    args: '',
    desc: 'Mulai percakapan baru.',
    run: (_arg, ctx) => ctx.newChat(),
  },
  {
    name: '/clear',
    args: '',
    desc: 'Kosongkan percakapan yang sedang terbuka.',
    run: (_arg, ctx) => ctx.clearChat(),
  },
  {
    name: '/export',
    args: '',
    desc: 'Unduh percakapan ini sebagai berkas Markdown.',
    run: (_arg, ctx) => {
      const md = ctx.exportChat();
      if (!md) {
        ctx.toast('Belum ada isi untuk diekspor');
        return;
      }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `chat-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
      ctx.toast('Diekspor');
    },
  },
  {
    name: '/info',
    args: '',
    desc: 'Tampilkan mode, model aktif, dan endpoint.',
    run: (_arg, ctx) => {
      const p = getPreset(ctx.settings.mode);
      ctx.toast(
        `${p.title} · ${ctx.settings.model} · ${
          ctx.settings.url === '/api' ? PUBLIC_ENDPOINT : ctx.settings.url
        }`,
      );
    },
  },
  {
    name: '/help',
    args: '',
    desc: 'Tampilkan daftar perintah.',
    run: (_arg, ctx) => ctx.toast(`${COMMANDS.length} perintah — ketik "/" di kolom pesan`),
  },
];

/** Saring perintah sesuai apa yang sudah diketik (mis. "/mo" → /model). */
export function matchCommands(input: string): Command[] {
  if (!input.startsWith('/')) return [];
  const first = input.split('\n')[0];
  const token = first.split(/\s+/)[0].toLowerCase();
  if (first.includes(' ')) {
    // sudah ada argumen: menu hanya muncul kalau nama perintahnya pasti
    const exact = COMMANDS.find((c) => c.name === token);
    return exact ? [exact] : [];
  }
  return COMMANDS.filter((c) => c.name.startsWith(token));
}

/**
 * Jalankan input pengguna bila itu sebuah perintah.
 * Mengembalikan true bila sudah ditangani (tidak perlu dikirim ke model).
 */
export function runCommand(raw: string, ctx: CommandCtx): boolean {
  const line = raw.trim();
  if (!line.startsWith('/')) return false;
  const [token, ...rest] = line.split(/\s+/);
  const cmd = COMMANDS.find((c) => c.name === token.toLowerCase());
  if (!cmd) return false;
  cmd.run(rest.join(' '), ctx);
  return true;
}

/** Hook kecil: mengelola indeks terpilih di menu perintah. */
export function useCommandMenu(input: string) {
  const items = useMemo(() => matchCommands(input), [input]);
  const [selected, setSelected] = useState(0);
  const lastInput = useRef(input);

  useEffect(() => {
    if (lastInput.current !== input) {
      lastInput.current = input;
      setSelected(0);
    }
  }, [input]);

  return {
    items,
    selected: Math.max(0, Math.min(selected, items.length - 1)),
    setSelected,
    open: items.length > 0,
  };
}

export { DEFAULT_MODEL };
