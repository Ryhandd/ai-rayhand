'use client';

import { useEffect, useState } from 'react';
import type { Msg } from '@/lib/types';
import { copyText, formatSize } from '@/lib/storage';
import { extOf } from '@/lib/storage';
import Markdown from './Markdown';

interface Props {
  msg: Msg;
  streaming?: boolean;
  streamText?: string;
  onRegenerate?: () => void;
  onToast: (t: string) => void;
}

function fileIcon(name: string) {
  const e = extOf(name);
  if (e === 'pdf') return '📕';
  if (e === 'docx' || e === 'doc') return '📘';
  if (['csv', 'json', 'xlsx', 'tsv'].includes(e)) return '📊';
  if (['py', 'js', 'ts', 'java', 'c', 'cpp', 'html', 'css', 'sql'].includes(e)) return '⌨';
  return '📄';
}

export default function Message({
  msg,
  streaming,
  streamText,
  onRegenerate,
  onToast,
}: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const isUser = msg.role === 'user';
  const body = streaming ? (streamText ?? '') : msg.content;

  // buang lampiran dokumen dari tampilan (tetap dipakai model)
  const displayText = (() => {
    if (!isUser) return body;
    const cut = body.indexOf('\n\nDokumen terlampir:');
    return cut >= 0 ? body.slice(0, cut) : body;
  })();

  return (
    <div className="mb-6 flex animate-fade-up gap-3">
      <div
        className={`mt-0.5 flex h-[31px] w-[31px] shrink-0 place-items-center rounded-[9px] text-sm ${
          isUser
            ? 'bg-ink-700 text-dim'
            : 'bg-gradient-to-br from-accent-500 to-violet-500 text-white shadow-[0_2px_10px_rgba(91,140,255,.3)]'
        }`}
      >
        {isUser ? '🧑' : '✦'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold tracking-wide text-faint">
          {isUser ? 'Anda' : 'AI Rayhand'}
          {!isUser && !streaming && msg.model && (
            <span className="rounded-full bg-ink-750 px-2 py-0.5 text-[10px] font-medium text-faint">
              {msg.model}
            </span>
          )}
        </div>

        {isUser ? (
          <div className="rounded-[14px] border border-ink-600 bg-ink-750 px-3.5 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
            {displayText || <span className="text-faint">(dokumen tanpa teks)</span>}
            {!!msg.files?.length && (
              <div className="mt-2.5 flex flex-wrap gap-2 border-t border-ink-600 pt-2.5">
                {msg.files.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink-800 px-2 py-1 text-[11.5px] text-dim"
                  >
                    <span>{fileIcon(f.name)}</span>
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <span className="text-faint">{formatSize(f.size)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {streaming && !body ? (
              <div className="flex items-center gap-1 py-1">
                <span className="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-dim" />
                <span
                  className="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-dim"
                  style={{ animationDelay: '.18s' }}
                />
                <span
                  className="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-dim"
                  style={{ animationDelay: '.36s' }}
                />
              </div>
            ) : showRaw ? (
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-ink-600 bg-ink-950 p-3.5 text-[12.6px] leading-relaxed whitespace-pre-wrap text-[#c8d3e8]">
                {body}
              </pre>
            ) : (
              <Markdown content={body} streaming={streaming} />
            )}
          </>
        )}

        {!streaming && body && (
          <div className="mt-1.5 flex gap-3 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 [.msg:hover_&]:opacity-100">
            <button
              onClick={async () => {
                await copyText(body);
                onToast('Disalin');
              }}
              className="text-[11.5px] text-faint transition-colors hover:text-accent-300"
            >
              Salin
            </button>
            {!isUser && (
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-[11.5px] text-faint transition-colors hover:text-accent-300"
              >
                {showRaw ? 'Terformat' : 'Teks asli'}
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-[11.5px] text-faint transition-colors hover:text-accent-300"
              >
                Ulangi
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
