'use client';

import { PRESETS } from '@/lib/presets';

interface Props {
  mode: string;
  onChange: (id: string) => void;
}

/**
 * Pemilih mode akademik. Ditempatkan di sidebar; menampilkan pintasan
 * keempat fitur laporan agar dosen/penguji langsung melihat kesesuaiannya.
 */
export default function ModePicker({ mode, onChange }: Props) {
  return (
    <div className="mb-2">
      <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
        Mode Akademik
      </div>
      <div className="grid gap-1">
        {PRESETS.map((p) => {
          const on = p.id === mode;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              title={p.desc}
              className={`flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                on
                  ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
                  : 'text-dim hover:bg-ink-750 hover:text-[#e9ecf5]'
              }`}
            >
              <span className="shrink-0 text-[13px]">{p.icon}</span>
              <span className="flex-1 truncate">{p.short}</span>
              {on && <span className="shrink-0 text-[9px]">●</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
