import type { Conversation, ModelInfo, Settings } from './types';
import { apiBase, headers } from './config';

export class ChatError extends Error {
  detail?: string[];
  constructor(message: string, detail?: string[]) {
    super(message);
    this.name = 'ChatError';
    this.detail = detail;
  }
}

export async function fetchModels(s: Settings, signal?: AbortSignal): Promise<ModelInfo[]> {
  const res = await fetch(`${apiBase(s)}/models`, {
    headers: headers(s),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ChatError(`HTTP ${res.status}`, [text.slice(0, 200)]);
  }
  const json = (await res.json()) as { data?: ModelInfo[] };
  const list = json.data ?? [];
  if (!list.length) throw new ChatError('Server tidak melaporkan model apa pun');
  return list;
}

export interface StreamResult {
  content: string;
  reasoning: string;
}

interface StreamOpts {
  settings: Settings;
  conv: Conversation;
  model: string;
  signal: AbortSignal;
  onDelta: (chunk: string, full: string) => void;
  onReasoning?: (full: string) => void;
}

export async function streamChat({
  settings,
  conv,
  model,
  signal,
  onDelta,
  onReasoning,
}: StreamOpts): Promise<StreamResult> {
  const messages = [
    { role: 'system', content: settings.systemPrompt },
    ...conv.msgs.map((m) => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: settings.temperature,
  };

  // Qwen3: tanpa ini model menghabiskan seluruh token untuk berpikir dan
  // `content` tetap kosong. `reasoning_effort: "none"` mematikan mode thinking.
  if (!settings.thinking) body.reasoning_effort = 'none';

  const res = await fetch(`${apiBase(settings)}/chat/completions`, {
    method: 'POST',
    headers: headers(settings),
    signal,
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `HTTP ${res.status}`;
    let detail: string[] = [];
    try {
      const j = JSON.parse(text) as { error?: { message?: string; detail?: string[] } };
      if (j.error?.message) msg = j.error.message;
      if (j.error?.detail) detail = j.error.detail;
    } catch {
      if (text) detail = [text.slice(0, 240)];
    }
    throw new ChatError(msg, detail);
  }
  if (!res.body) throw new ChatError('Server tidak mengirim data');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let think = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: {
            delta?: {
              content?: string;
              // Ollama menamai field penalaran Qwen3 `reasoning`,
              // bukan `reasoning_content` seperti banyak dokumentasi lain.
              reasoning?: string;
              reasoning_content?: string;
            };
          }[];
        };
        const d = json.choices?.[0]?.delta;
        if (!d) continue;

        const r = d.reasoning ?? d.reasoning_content;
        if (r) {
          think += r;
          onReasoning?.(think);
        }
        if (d.content) {
          full += d.content;
          onDelta(d.content, full);
        }
      } catch {
        /* potongan JSON belum utuh — lanjut */
      }
    }
  }

  if (!full.trim() && !think.trim()) {
    throw new ChatError('Model mengembalikan jawaban kosong');
  }
  return { content: full, reasoning: think };
}
