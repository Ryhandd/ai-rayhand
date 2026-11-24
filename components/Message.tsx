'use client';

import { useState } from 'react';
import type { Msg } from '@/lib/types';
import { copyText, formatSize, extOf, DOC_MARKER } from '@/lib/storage';
import Markdown from './Markdown';

interface Props {
  msg: Msg;
  streaming?: boolean;
  streamText?: string;
  streamThink?: string;
  onRegenerate?: () => void;
  onToast: (t: string) => void;
}

function fileIcon(name: string) {
  const e = extOf(name);
  if (e === 'pdf') return '📕';
  if (e === 'docx' || e === 'doc') return '📘';
  if (['csv', 'json', 'xlsx', 'tsv'].includes(e)) return '📊';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(e)) return '🖼️';
  if (['py', 'js', 'ts', 'java', 'c', 'cpp', 'html', 'css', 'sql'].includes(e)) return '⌨';
  return '📄';
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid cursor-zoom-out place-items-center bg-black/85 p-6 backdrop-blur-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Pratinjau" className="max-h-full max-w-full rounded-xl object-contain" />
      <button
        onClick={onClose}
        className="absolute right-5 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/20"
      >
        Tutup ✕
      </button>
    </div>
  );
}

export default function Message({
  msg,
  streaming,
  streamText,
  streamThink,
  onRegenerate,
  onToast,
}: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const isUser = msg.role === 'user';
  const body = streaming ? (streamText ?? '') : msg.content;
  const think = streaming ? (streamThink ?? '') : (msg.reasoning ?? '');

  // buang lampiran dokumen dari tampilan (tetap dipakai model)
  const displayText = (() => {
    if (!isUser) return body;
    const cut = body.indexOf(DOC_MARKER);
    return cut >= 0 ? body.slice(0, cut) : body;
  })();

  const images = msg.images ?? [];

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
            {!!images.length && (
              <div className={`flex flex-wrap gap-2 ${displayText ? 'mb-2.5' : ''}`}>
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setZoom(src)}
                    className="overflow-hidden rounded-[10px] border border-ink-600 transition-transform hover:scale-[1.02]"
                    title="Perbesar"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Lampiran ${i + 1}`}
                      className="max-h-[200px] max-w-[240px] object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            {displayText || (!images.length && <span className="text-faint">(lampiran tanpa teks)</span>)}
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
            {!!think && (
              <div className="mb-2 overflow-hidden rounded-xl border border-ink-600 bg-ink-800/60">
                <button
                  onClick={() => setShowThink((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11.5px] font-medium text-faint transition-colors hover:text-accent-300"
                  aria-expanded={showThink}
                >
                  <span className="text-[9px]">{showThink ? '▼' : '▶'}</span>
                  {streaming ? 'Sedang berpikir…' : 'Proses berpikir'}
                  <span className="text-[10px] text-faint">
                    ({think.length.toLocaleString('id-ID')} karakter)
                  </span>
                </button>
                {showThink && (
                  <div className="max-h-[280px] overflow-y-auto border-t border-ink-600 px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap text-dim">
                    {think}
                  </div>
                )}
              </div>
            )}

            {msg.generated && (
              <figure className="mb-3 overflow-hidden rounded-xl border border-ink-600 bg-ink-800">
                <button
                  onClick={() => setZoom(msg.generated!.url)}
                  className="block w-full"
                  title="Perbesar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.generated.url}
                    alt={msg.generated.prompt}
                    className="max-h-[420px] w-full object-contain"
                  />
                </button>
                <figcaption className="flex items-center gap-3 border-t border-ink-600 px-3 py-2 text-[11.5px] text-faint">
                  <span className="flex-1 truncate" title={msg.generated.prompt}>
                    🎨 {msg.generated.prompt}
                  </span>
                  <a
                    href={msg.generated.url}
                    download={`gambar-${Date.now()}.jpg`}
                    className="shrink-0 transition-colors hover:text-accent-300"
                  >
                    Unduh
                  </a>
                </figcaption>
              </figure>
            )}

            {streaming && !body && !think && !msg.generated ? (
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
            ) : !body && msg.generated ? null : showRaw ? (
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-ink-600 bg-ink-950 p-3.5 text-[12.6px] leading-relaxed whitespace-pre-wrap text-[#c8d3e8]">
                {body}
              </pre>
            ) : (
              <Markdown content={body} streaming={streaming} />
            )}
          </>
        )}

        {!streaming && (body || msg.generated) && (
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
            {!isUser && !!body && (
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

      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
