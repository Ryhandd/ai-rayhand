'use client';

import type { Command } from '@/lib/commands';

/** Menu saran perintah di atas kolom pesan. */
export default function CommandMenu({
  items,
  selected,
  onPick,
  onHover,
}: {
  items: Command[];
  selected: number;
  onPick: (c: Command) => void;
  onHover: (i: number) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-2 animate-fade-up overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-[0_8px_30px_rgba(0,0,0,.4)]">
      <div className="border-b border-ink-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.8px] text-faint">
        Perintah — ↑↓ pilih, Enter jalankan
      </div>
      <div className="max-h-[220px] overflow-y-auto py-1">
        {items.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(c);
            }}
            onMouseEnter={() => onHover(i)}
            className={`flex w-full items-baseline gap-2.5 px-3 py-2 text-left transition-colors ${
              i === selected ? 'bg-ink-700' : 'hover:bg-ink-800'
            }`}
          >
            <span className="font-mono text-[12.5px] font-semibold text-accent-300">{c.name}</span>
            {c.args && <span className="font-mono text-[11px] text-faint">{c.args}</span>}
            <span className="truncate text-[11.5px] text-dim">{c.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
