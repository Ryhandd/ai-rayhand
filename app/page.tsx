'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Message from '@/components/Message';
import ModelPicker from '@/components/ModelPicker';
import SettingsModal from '@/components/SettingsModal';
import { streamChat, fetchModels, ChatError } from '@/lib/api';
import { SUGGESTIONS } from '@/lib/config';
import {
  composeContent,
  loadConversations,
  loadCurrentId,
  loadSettings,
  saveConversations,
  saveCurrentId,
  saveSettings,
  uid,
} from '@/lib/storage';
import { useAttachments } from '@/lib/useAttachments';
import type { Conversation, Settings } from '@/lib/types';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [curId, setCurId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<{ msg: string; detail?: string[] } | null>(null);
  const [online, setOnline] = useState<'wait' | 'on' | 'off'>('wait');
  const [modelCount, setModelCount] = useState(0);
  const [sbOpen, setSbOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const att = useAttachments(useCallback((t: string) => toast(t), [])); // eslint-disable-line

  const cur = useMemo(() => convs.find((c) => c.id === curId) ?? null, [convs, curId]);

  /* ---------- toast ---------- */
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  /* ---------- init ---------- */
  useEffect(() => {
    const list = loadConversations();
    const id = loadCurrentId();
    if (list.length) {
      setConvs(list);
      setCurId(list.some((c) => c.id === id) ? id : list[0].id);
    } else {
      const first: Conversation = { id: uid('c'), title: 'Chat Baru', msgs: [], ts: Date.now() };
      setConvs([first]);
      setCurId(first.id);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveSettings(settings);
  }, [settings, mounted]);

  useEffect(() => {
    if (mounted) saveCurrentId(curId);
  }, [curId, mounted]);

  /* ---------- status server ---------- */
  const checkHealth = useCallback(async () => {
    setOnline('wait');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const models = await fetchModels(settings, ctl.signal);
      clearTimeout(timer);
      setModelCount(models.length);
      setOnline('on');
      if (!models.some((m) => m.id === settings.model)) {
        setSettings((s) => ({ ...s, model: models[0].id }));
      }
    } catch {
      clearTimeout(timer);
      setOnline('off');
    }
  }, [settings]);

  useEffect(() => {
    if (!mounted) return;
    void checkHealth();
    const iv = setInterval(() => void checkHealth(), 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, settings.url, settings.key]);

  /* ---------- auto scroll ---------- */
  const stick = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
  };
  const scrollDown = (force = false) => {
    const el = scrollRef.current;
    if (el && (force || stick.current)) el.scrollTop = el.scrollHeight;
  };
  useEffect(() => {
    scrollDown();
  }, [convs, streamText]);

  /* ---------- persist convs ---------- */
  const persist = useCallback((next: Conversation[]) => {
    setConvs(saveConversations(next));
  }, []);

  /* ---------- actions ---------- */
  const newChat = useCallback(() => {
    const c: Conversation = { id: uid('c'), title: 'Chat Baru', msgs: [], ts: Date.now() };
    persist([c, ...convs]);
    setCurId(c.id);
    setSbOpen(false);
    setError(null);
    setTimeout(() => taRef.current?.focus(), 60);
  }, [convs, persist]);

  const removeConv = useCallback(
    (id: string) => {
      const next = convs.filter((c) => c.id !== id);
      if (!next.length) {
        const c: Conversation = { id: uid('c'), title: 'Chat Baru', msgs: [], ts: Date.now() };
        persist([c]);
        setCurId(c.id);
      } else {
        persist(next);
        if (curId === id) setCurId(next[0].id);
      }
    },
    [convs, curId, persist],
  );

  const runStream = useCallback(
    async (conv: Conversation, model: string) => {
      setBusy(true);
      setError(null);
      setStreamText('');
      const ctl = new AbortController();
      abortRef.current = ctl;

      try {
        const full = await streamChat({
          settings,
          conv,
          model,
          signal: ctl.signal,
          onDelta: (_d, all) => setStreamText(all),
        });

        setConvs((prev) => {
          const next = prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  msgs: [
                    ...c.msgs,
                    { id: uid('m'), role: 'assistant' as const, content: full, model, ts: Date.now() },
                  ],
                }
              : c,
          );
          return saveConversations(next);
        });
        setStreamText('');
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          const partial = streamText;
          if (partial.trim()) {
            setConvs((prev) => {
              const next = prev.map((c) =>
                c.id === conv.id
                  ? {
                      ...c,
                      msgs: [
                        ...c.msgs,
                        {
                          id: uid('m'),
                          role: 'assistant' as const,
                          content: partial,
                          model,
                          ts: Date.now(),
                        },
                      ],
                    }
                  : c,
              );
              return saveConversations(next);
            });
          }
          toast('Dihentikan');
        } else {
          const ce = e as ChatError;
          setError({ msg: ce.message || 'Gagal menghubungi AI', detail: ce.detail });
          setOnline('off');
        }
        setStreamText('');
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [settings, toast, streamText],
  );

  const send = useCallback(async () => {
    if (busy) return;
    const ready = att.items.filter((f) => !f.loading && f.text);
    const text = input.trim();
    if (!text && !ready.length) return;

    let conv = cur;
    if (!conv) {
      conv = { id: uid('c'), title: 'Chat Baru', msgs: [], ts: Date.now() };
      persist([conv, ...convs]);
      setCurId(conv.id);
    }

    const content = composeContent(text, att.items);
    const files = att.items.map((f) => ({ name: f.name, size: f.size }));
    const userMsg = {
      id: uid('m'),
      role: 'user' as const,
      content,
      files,
      ts: Date.now(),
    };

    const updated: Conversation = {
      ...conv,
      title: conv.title === 'Chat Baru' ? (text || files[0]?.name || 'Dokumen').slice(0, 44) : conv.title,
      msgs: [...conv.msgs, userMsg],
    };

    const nextAll = convs.some((c) => c.id === updated.id)
      ? convs.map((c) => (c.id === updated.id ? updated : c))
      : [updated, ...convs];

    persist(nextAll);
    setCurId(updated.id);
    setInput('');
    att.clear();
    setError(null);
    if (taRef.current) taRef.current.style.height = 'auto';

    await runStream(updated, settings.model);
  }, [att, busy, convs, cur, input, persist, runStream, settings.model]);

  const regenerate = useCallback(
    (msgIndex: number) => {
      if (!cur || busy) return;
      const trimmed = cur.msgs.slice(0, msgIndex);
      if (!trimmed.length) return;
      const updated = { ...cur, msgs: trimmed };
      persist(convs.map((c) => (c.id === cur.id ? updated : c)));
      void runStream(updated, settings.model);
    },
    [busy, convs, cur, persist, runStream, settings.model],
  );

  /* ---------- textarea ---------- */
  const grow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  };

  const pill =
    online === 'on'
      ? { cls: 'bg-[#3ddc97] shadow-[0_0_8px_rgba(61,220,151,.7)]', txt: `${modelCount} model` }
      : online === 'off'
        ? { cls: 'bg-[#ff6b6b]', txt: 'offline' }
        : { cls: 'bg-[#ffb74d] animate-pulse', txt: 'menghubungkan' };

  if (!mounted) {
    return (
      <div className="grid h-full place-items-center bg-ink-900">
        <div className="text-sm text-faint">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-ink-900">
      {/* ================= SIDEBAR ================= */}
      <nav
        className={`${
          sbOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-50 w-[272px] shrink-0 flex-col border-r border-ink-600 bg-ink-850 shadow-2xl lg:static lg:flex lg:shadow-none`}
      >
        <div className="flex items-center gap-2.5 border-b border-ink-600 px-[18px] pb-3.5 pt-[18px]">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-gradient-to-br from-accent-500 to-violet-500 text-[15px] text-white shadow-[0_3px_12px_rgba(91,140,255,.35)]">
            ✦
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">AI Rayhand</div>
            <div className="text-[10.5px] font-medium tracking-wide text-faint">Asisten Akademik</div>
          </div>
          <button
            onClick={() => setSbOpen(false)}
            className="ml-auto text-lg text-faint lg:hidden"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="px-3.5 pt-3.5">
          <button
            onClick={newChat}
            className="flex w-full items-center justify-center gap-1.5 rounded-[11px] bg-accent-500 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-accent-400"
          >
            ＋ Chat Baru
          </button>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <SidebarHead count={convs.length} />
          <div className="flex-1 overflow-y-auto px-2.5 pb-2">
            {!convs.length ? (
              <div className="px-3.5 py-4 text-center text-[12px] leading-relaxed text-faint">
                Belum ada percakapan.
              </div>
            ) : (
              convs.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCurId(c.id);
                    setSbOpen(false);
                    setError(null);
                  }}
                  className={`group mb-px flex cursor-pointer items-center gap-2 rounded-[9px] px-3 py-2.5 text-[13px] transition-colors ${
                    c.id === curId
                      ? 'bg-ink-700 text-[#e9ecf5]'
                      : 'text-dim hover:bg-ink-750 hover:text-[#e9ecf5]'
                  }`}
                >
                  <span className="flex-1 truncate">{c.title}</span>
                  <span className="shrink-0 text-[10px] text-faint">{c.msgs.length}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConv(c.id);
                    }}
                    title="Hapus"
                    className="shrink-0 rounded px-1 text-[15px] leading-none text-faint opacity-0 transition-all hover:bg-[rgba(255,107,107,.12)] hover:text-[#ff6b6b] group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-ink-600 px-3.5 py-3 text-[11px]">
          <ModelPicker
            settings={settings}
            online={online === 'on'}
            onChange={(m) => setSettings((s) => ({ ...s, model: m }))}
          />
          <div className="mt-3 flex gap-3.5 border-t border-ink-600 pt-2.5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-[11.5px] text-dim transition-colors hover:text-accent-300"
            >
              ⚙ Pengaturan
            </button>
            <button
              onClick={() => {
                if (confirm('Hapus SEMUA riwayat percakapan?')) {
                  const c: Conversation = {
                    id: uid('c'),
                    title: 'Chat Baru',
                    msgs: [],
                    ts: Date.now(),
                  };
                  persist([c]);
                  setCurId(c.id);
                }
              }}
              className="text-[11.5px] text-dim transition-colors hover:text-accent-300"
            >
              🗑 Bersihkan
            </button>
          </div>
        </div>
      </nav>

      {sbOpen && (
        <div
          onClick={() => setSbOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* ================= MAIN ================= */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex items-center gap-3 border-b border-ink-600 bg-[rgba(17,20,28,.85)] px-[18px] py-3.5 backdrop-blur-md">
          <button
            onClick={() => setSbOpen(true)}
            className="rounded-md px-1.5 py-0.5 text-[17px] leading-none text-dim transition-colors hover:bg-ink-750 hover:text-[#e9ecf5] lg:hidden"
            aria-label="Buka sidebar"
          >
            ☰
          </button>
          <h1 className="flex-1 truncate text-[14px] font-semibold tracking-tight">
            {cur?.title ?? 'Chat Baru'}
          </h1>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-600 bg-ink-750 px-2.5 py-1 text-[11.5px] text-dim">
            <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${pill.cls}`} />
            <span className="whitespace-nowrap">{pill.txt}</span>
          </div>
          <button
            onClick={() => void checkHealth()}
            title="Uji koneksi"
            className="rounded-md px-1.5 py-0.5 text-[13px] text-dim transition-colors hover:bg-ink-750 hover:text-[#e9ecf5]"
          >
            ↻
          </button>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-0 pb-2.5 pt-6">
          <div className="mx-auto max-w-[780px] px-[18px]">
            {!cur?.msgs.length && !busy ? (
              <div className="mx-auto mt-[7vh] max-w-[660px] text-center">
                <div className="mx-auto mb-5 grid h-[62px] w-[62px] place-items-center rounded-[19px] bg-gradient-to-br from-accent-500 to-violet-500 text-[29px] text-white shadow-[0_8px_30px_rgba(91,140,255,.32)]">
                  ✦
                </div>
                <h2 className="mb-2 text-[23px] font-bold tracking-tight">
                  Ada yang bisa saya bantu?
                </h2>
                <p className="mx-auto max-w-[460px] text-[13.5px] leading-relaxed text-dim">
                  Asisten AI akademik — ditenagai model open-source di cloud.
                  <br />
                  Lampirkan file dengan 📎, <b className="text-[#c8d3e8]">tarik-lepas</b>, atau{' '}
                  <b className="text-[#c8d3e8]">tempel</b> (Ctrl+V).
                </p>
                <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => {
                        setInput(s.prompt);
                        taRef.current?.focus();
                        grow();
                      }}
                      className="rounded-xl border border-ink-600 bg-ink-750 p-3.5 text-left transition-all hover:-translate-y-px hover:border-accent-500 hover:bg-ink-700"
                    >
                      <div className="mb-0.5 text-[12.5px] font-semibold">
                        {s.icon} {s.title}
                      </div>
                      <div className="text-[11.5px] text-faint">{s.detail}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {cur?.msgs.map((m, i) => (
                  <Message
                    key={m.id}
                    msg={m}
                    onToast={toast}
                    onRegenerate={m.role === 'assistant' ? () => regenerate(i) : undefined}
                  />
                ))}

                {busy && (
                  <Message
                    msg={{
                      id: 'streaming',
                      role: 'assistant',
                      content: streamText,
                      ts: Date.now(),
                    }}
                    streaming
                    streamText={streamText}
                    onToast={toast}
                  />
                )}

                {error && (
                  <div className="mb-6 animate-fade-up rounded-xl border border-[rgba(255,107,107,.3)] bg-[rgba(255,107,107,.06)] p-4">
                    <div className="mb-1.5 text-[13px] font-semibold text-[#ff8a8a]">
                      ⚠ {error.msg}
                    </div>
                    <div className="text-[12.5px] leading-relaxed text-dim">
                      <p className="mb-1.5">Periksa:</p>
                      <ol className="ml-5 list-decimal space-y-0.5">
                        <li>Cell <b className="text-[#c8d3e8]">“JALANKAN”</b> di Colab masih berjalan (tab jangan ditutup)</li>
                        <li>URL ngrok sama dengan yang tampil di Colab — ganti di ⚙ Pengaturan</li>
                        <li>Jalankan ulang cell setelah Colab restart</li>
                      </ol>
                      {!!error.detail?.length && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11.5px] text-faint">
                            Detail teknis
                          </summary>
                          <pre className="mt-1.5 overflow-x-auto rounded-lg bg-ink-950 p-2.5 text-[11px] text-faint">
                            {error.detail.join('\n')}
                          </pre>
                        </details>
                      )}
                    </div>
                    <button
                      onClick={() => void checkHealth()}
                      className="mt-2.5 rounded-lg bg-ink-700 px-3 py-1.5 text-[12px] font-semibold text-[#e9ecf5] hover:bg-ink-600"
                    >
                      Uji ulang koneksi
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================= COMPOSER ================= */}
        <div className="bg-gradient-to-t from-ink-900 to-transparent px-[18px] pb-4 pt-2">
          <div className="mx-auto max-w-[780px]">
            {att.dragging && (
              <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-[rgba(11,13,18,.88)] backdrop-blur-md">
                <div className="rounded-[22px] border-2 border-dashed border-accent-500 bg-[rgba(91,140,255,.06)] px-16 py-12 text-center">
                  <div className="mb-3 text-[44px]">📥</div>
                  <h3 className="text-[17px] font-semibold">Lepaskan file di sini</h3>
                  <p className="mt-1.5 text-[12.5px] text-dim">
                    PDF · DOCX · TXT · MD · CSV · JSON · kode
                  </p>
                </div>
              </div>
            )}

            {!!att.items.length && (
              <div className="mb-2 flex flex-wrap gap-2">
                {att.items.map((f) => (
                  <div
                    key={f.id}
                    className={`flex max-w-[240px] animate-fade-up items-center gap-2 rounded-[10px] border border-ink-600 bg-ink-750 px-2.5 py-1.5 text-[12px] ${
                      f.loading ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="shrink-0">{f.loading ? '⏳' : '📄'}</span>
                    <span className="flex-1 truncate" title={f.name}>
                      {f.name}
                    </span>
                    <button
                      onClick={() => att.remove(f.id)}
                      className="shrink-0 text-[15px] leading-none text-faint hover:text-[#ff6b6b]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-ink-600 bg-ink-850 px-2.5 py-2.5 pl-3 transition-all focus-within:border-accent-500 focus-within:shadow-[0_0_0_3px_rgba(91,140,255,.12)]">
              <input
                ref={att.inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void att.ingest(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={att.openPicker}
                title="Lampirkan file"
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[17px] text-dim transition-colors hover:bg-ink-700 hover:text-[#e9ecf5]"
              >
                📎
              </button>
              <textarea
                ref={taRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  grow();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Tulis pesan…"
                className="max-h-[180px] flex-1 resize-none bg-transparent py-1 text-[14.5px] leading-relaxed outline-none placeholder:text-faint"
              />
              <button
                onClick={() => (busy ? abortRef.current?.abort() : void send())}
                title={busy ? 'Hentikan' : 'Kirim'}
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-[15px] text-white transition-all ${
                  busy
                    ? 'bg-[#ff6b6b] hover:opacity-90'
                    : 'bg-accent-500 hover:scale-105 hover:bg-accent-400'
                }`}
              >
                {busy ? '■' : '↑'}
              </button>
            </div>
            <div className="mt-2 text-center text-[10.5px] leading-relaxed text-faint">
              <kbd className="rounded border border-ink-500 bg-ink-750 px-1 py-px text-[10px]">Enter</kbd>{' '}
              kirim ·{' '}
              <kbd className="rounded border border-ink-500 bg-ink-750 px-1 py-px text-[10px]">Shift</kbd>
              +
              <kbd className="rounded border border-ink-500 bg-ink-750 px-1 py-px text-[10px]">Enter</kbd>{' '}
              baris baru · AI dapat salah, verifikasi info penting
            </div>
          </div>
        </div>
      </main>

      <SettingsModal
        settings={settings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => {
          setSettings(s);
          setSettingsOpen(false);
          toast('Pengaturan disimpan');
          setTimeout(() => void checkHealth(), 100);
        }}
      />

      <div
        className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-[11px] border border-ink-500 bg-ink-700 px-4 py-2.5 text-[13px] shadow-[0_8px_30px_rgba(0,0,0,.5)] transition-all ${
          toastMsg ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {toastMsg}
      </div>
    </div>
  );
}

function SidebarHead({ count }: { count: number }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-4">
      <span className="text-[10px] font-semibold uppercase tracking-[.8px] text-faint">
        Riwayat
      </span>
      <span className="text-[10px] text-faint">{count}</span>
    </div>
  );
}
