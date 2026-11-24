'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attachment, Conversation, Settings } from '@/lib/types';
import { fetchModels } from '@/lib/api';
import { DEFAULT_SETTINGS } from '@/lib/config';

function shorten(n: string, max = 22) {
  return n.length > max ? n.slice(0, max - 1) + '…' : n;
}

export default function ModelPicker({
  settings,
  onChange,
  online,
}: {
  settings: Settings;
  onChange: (model: string) => void;
  online: boolean;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    setLoading(true);
    fetchModels(settings, ctl.signal)
      .then((list) => {
        if (!alive) return;
        const ids = list.map((m) => m.id);
        setModels(ids);
        if (!ids.includes(settings.model) && ids[0]) onChange(ids[0]);
      })
      .catch(() => alive && setModels([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.url, settings.key, online]);

  const list = models.length ? models : [settings.model];

  return (
    <div className="px-4">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.8px] text-faint">
        Model
      </div>
      <div className="relative">
        <select
          value={settings.model}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-[9px] border border-ink-600 bg-ink-750 px-2.5 py-2 pr-7 text-[12px] text-[#e9ecf5] outline-none transition-colors hover:border-ink-500 focus:border-accent-500"
        >
          {list.map((m) => (
            <option key={m} value={m}>
              {shorten(m.replace(':', ' '))}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-faint">
          ▼
        </span>
      </div>
      {loading && <div className="mt-1 text-[10px] text-faint">memuat model…</div>}
    </div>
  );
}
