'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';
import { DEFAULT_KEY, DEFAULT_SYSTEM_PROMPT, DEFAULT_URL } from '@/lib/config';

interface Props {
  settings: Settings;
  open: boolean;
  onClose: () => void;
  onSave: (s: Settings) => void;
}

export default function SettingsModal({ settings, open, onClose, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [temp, setTemp] = useState(0.7);
  const [sys, setSys] = useState('');

  useEffect(() => {
    if (!open) return;
    setUrl(settings.url === DEFAULT_URL ? '' : settings.url);
    setKey(settings.key === DEFAULT_KEY ? '' : settings.key);
    setTemp(settings.temperature);
    setSys(settings.systemPrompt);
  }, [open, settings]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-5 backdrop-blur-sm"
    >
      <div className="w-full max-w-[480px] animate-fade-up rounded-[18px] border border-ink-600 bg-ink-850 p-6 shadow-[0_20px_60px_rgba(0,0,0,.5)]">
        <h3 className="text-[16px] font-semibold">⚙ Pengaturan</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">
          Biarkan kosong untuk memakai proxy default <code className="text-accent-300">/api</code>{' '}
          — cara paling aman.
        </p>

        <label className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Base URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/api"
          className="mt-1.5 w-full rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent-500"
        />

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

        <label className="mt-3.5 block text-[10.5px] font-semibold uppercase tracking-[.4px] text-faint">
          Prompt Sistem
        </label>
        <textarea
          value={sys}
          onChange={(e) => setSys(e.target.value)}
          rows={5}
          className="mt-1.5 w-full resize-y rounded-[9px] border border-ink-600 bg-ink-750 px-3 py-2.5 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-accent-500"
        />

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={() => {
              setUrl('');
              setKey('');
              setTemp(0.7);
              setSys(DEFAULT_SYSTEM_PROMPT);
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
                model: settings.model,
                temperature: temp,
                systemPrompt: sys.trim() || DEFAULT_SYSTEM_PROMPT,
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
