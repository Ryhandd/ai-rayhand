'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';
import { DEFAULT_KEY, DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT, DEFAULT_URL, VISION_MODEL } from '@/lib/config';
import { PRESETS, getPreset } from '@/lib/presets';

interface Props {
  settings: Settings;
  open: boolean;
  onClose: () => void;
  onSave: (s: Settings) => void;
}

export default function SettingsModal({ settings, open, onClose, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temp, setTemp] = useState(0.7);
  const [think, setThink] = useState(false);
  const [sys, setSys] = useState('');
  const [mode, setMode] = useState('umum');

  useEffect(() => {
    if (!open) return;
    setUrl(settings.url === DEFAULT_URL ? '' : settings.url);
    setKey(settings.key === DEFAULT_KEY ? '' : settings.key);
    setModel(settings.model);
    setTemp(settings.temperature);
    setThink(settings.thinking);
    setSys(settings.systemPrompt);
    setMode(settings.mode);
  }, [open, settings]);

  if (!open) return null;

  const applyPreset = (id: string) => {
    const p = getPreset(id);
    setMode(p.id);
    setSys(p.systemPrompt);
    setTemp(p.temperature);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-5 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-[500px] animate-fade-up overflow-y-auto rounded-[18px] border border-ink-600 bg-ink-850 p-6 shadow-[0_20px_60px_rgba(0,0,0,.5)]">
        <h3 className="text-[16px] font-semibold">⚙ Pengaturan</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">
          Biarkan Base URL kosong untuk memakai proxy default{' '}
          <code className="text-accent-300">/api</code> — cara paling aman.
        </p>

        <label className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Mode Akademik
        </label>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`rounded-[9px] border px-3 py-2 text-left text-[12px] transition-colors ${
                mode === p.id
                  ? 'border-accent-500 bg-accent-500/10 text-accent-300'
                  : 'border-ink-600 bg-ink-750 text-dim hover:border-ink-500 hover:text-[#e9ecf5]'
              }`}
            >
              <span className="font-semibold">
                {p.icon} {p.short}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Memilih mode mengisi prompt sistem dan temperature. Prompt masih bisa diubah di bawah.
        </p>

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Base URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/api"
          className="mt-1.5 w-full rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent-500"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Untuk situs eksternal: <code className="text-accent-300">https://ai-rayhand.vercel.app/api</code>
        </p>

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          API Key
        </label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ollama-local"
          className="mt-1.5 w-full rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent-500"
        />

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Model Teks
        </label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={DEFAULT_MODEL}
          className="mt-1.5 w-full rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 font-mono text-[12.5px] outline-none transition-colors focus:border-accent-500"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Baca gambar otomatis memakai{' '}
          <code className="text-accent-300">{VISION_MODEL}</code> — tidak perlu diganti manual.
        </p>

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Temperature — {temp.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.1}
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="mt-2 w-full accent-accent-500"
        />

        <label className="mt-3.5 flex cursor-pointer items-center gap-2.5 text-[12.5px]">
          <input
            type="checkbox"
            checked={think}
            onChange={(e) => setThink(e.target.checked)}
            className="h-4 w-4 accent-accent-500"
          />
          <span>
            Mode berpikir
            <span className="block text-[11px] text-faint">
              Model menampilkan penalaran lebih dulu. Lebih lambat, lebih teliti untuk soal sulit.
            </span>
          </span>
        </label>

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Prompt Sistem
        </label>
        <textarea
          value={sys}
          onChange={(e) => setSys(e.target.value)}
          rows={6}
          className="mt-1.5 w-full resize-y rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-accent-500"
        />

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={() => {
              setUrl('');
              setKey('');
              setModel(DEFAULT_MODEL);
              setTemp(0.7);
              setThink(false);
              setSys(DEFAULT_SYSTEM_PROMPT);
              setMode('umum');
            }}
            className="rounded-[9px] px-4 py-2.5 text-[13px] text-dim transition-colors hover:text-[#e9ecf5]"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="rounded-[9px] bg-ink-750 px-4 py-2.5 text-[13px] font-semibold text-dim transition-colors hover:bg-ink-700 hover:text-[#e9ecf5]"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onSave({
                url: url.trim() || DEFAULT_URL,
                key: key.trim() || DEFAULT_KEY,
                model: model.trim() || DEFAULT_MODEL,
                temperature: temp,
                thinking: think,
                systemPrompt: sys.trim() || DEFAULT_SYSTEM_PROMPT,
                mode,
              })
            }
            className="rounded-[9px] bg-accent-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-400"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
