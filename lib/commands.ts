'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Settings } from '@/lib/types';
import { DEFAULT_MODEL, PUBLIC_ENDPOINT } from '@/lib/config';

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
}

export const COMMANDS: Command[] = [
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
      // cocokkan persis dulu, lalu sebagian (tanpa lihat huruf besar/kecil)
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
    name: '/think',
    args: '[on|off]',
    desc: 'Tampilkan proses berpikir Qwen3 sebelum menjawab.',
    run: (arg, ctx) => {
      const a = arg.trim().toLowerCase();
      const on = a ? a === 'on' || a === 'true' || a === '1' : !ctx.settings.thinking;
      ctx.setSettings({ ...ctx.settings, thinking: on });
      ctx.toast(`Mode berpikir: ${on ? 'AKTIF' : 'mati'}`);
    },
  },
  {
    name: '/temp',
    args: '[0-1.5]',
    desc: 'Atur temperature (kreativitas). Tanpa argumen, tampilkan nilai sekarang.',
    run: (arg, ctx) => {
      const a = arg.trim();
      if (!a) {
        ctx.toast(`Temperature: ${ctx.settings.temperature.toFixed(1)}`);
        return;
      }
      const n = Number(a);
      if (!Number.isFinite(n) || n < 0 || n > 1.5) {
        ctx.toast('Temperature harus angka 0–1.5');
        return;
      }
      ctx.setSettings({ ...ctx.settings, temperature: n });
      ctx.toast(`Temperature → ${n.toFixed(1)}`);
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
        ctx.toast(`Base URL: ${ctx.settings.url}`);
        return;
      }
      ctx.setSettings({ ...ctx.settings, url: a.replace(/\/+$/, '') });
      ctx.toast(`Base URL → ${a}`);
    },
  },
  {
    name: '/reset',
    args: '',
    desc: 'Kembalikan pengaturan ke bawaan (model Qwen3 8B).',
    run: (_arg, ctx) => {
      ctx.setSettings({
        url: '/api',
        key: ctx.settings.key,
        model: DEFAULT_MODEL,
        temperature: 0.7,
        thinking: false,
        systemPrompt: ctx.settings.systemPrompt,
      });
      ctx.toast('Pengaturan direset');
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
    desc: 'Tampilkan model aktif, temperature, dan endpoint.',
    run: (_arg, ctx) => {
      ctx.toast(
        `${ctx.settings.model} · temp ${ctx.settings.temperature.toFixed(1)} · ${
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
