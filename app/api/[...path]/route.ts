import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Proxy ke backend AI (Ollama di Colab lewat ngrok).
 *
 * Browser memanggil /api/* di domain sendiri, lalu route ini meneruskan ke
 * upstream. Hasilnya: tidak ada masalah CORS, URL ngrok tidak tampil di
 * halaman, dan kalau satu upstream mati otomatis dicoba upstream berikutnya.
 *
 * Env opsional (diatur di Vercel → Settings → Environment Variables):
 *   AI_UPSTREAM = https://xxx.ngrok-free.dev        (boleh beberapa, pisah koma)
 *   AI_KEY      = ollama-local
 */

const UPSTREAMS = (
  process.env.AI_UPSTREAM ||
  'https://subscribe-cancel-reckless.ngrok-free.dev'
)
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const API_KEY = process.env.AI_KEY || 'ollama-local';

/** Hanya endpoint yang benar-benar dipakai UI — sisanya ditolak. */
const ALLOWED = ['models', 'chat/completions', 'completions', 'embeddings'];

const TIMEOUT_MS = 120_000;
const MAX_BODY_BYTES = 1_000_000; // 1 MB cukup untuk prompt + dokumen

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

async function handle(req: NextRequest, path: string[]) {
  const sub = path.join('/');

  if (!ALLOWED.includes(sub)) {
    return json({ error: { message: `path tidak diizinkan: ${sub}` } }, 404);
  }

  let body: string | undefined;
  if (req.method === 'POST') {
    body = await req.text();
    if (body.length > MAX_BODY_BYTES) {
      return json(
        {
          error: {
            message:
              'Pesan terlalu besar (maks ±1 MB). Kurangi ukuran dokumen yang dilampirkan.',
          },
        },
        413,
      );
    }
  }

  const errors: string[] = [];

  for (const base of UPSTREAMS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const upstream = await fetch(`${base}/v1/${sub}`, {
        method: req.method,
        headers: {
          authorization: `Bearer ${API_KEY}`,
          'content-type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'user-agent': 'AI-Rayhand/1.0',
        },
        body,
        signal: controller.signal,
        redirect: 'follow',
      });

      const text = await upstream.text();
      clearTimeout(timer);

      // Tunnel mati / endpoint tidak aktif → coba upstream berikutnya
      const ngrokCode = text.match(/ERR_NGROK_\d+/)?.[0];
      if (ngrokCode || text.includes('is offline')) {
        errors.push(`${base} → tunnel offline (${ngrokCode ?? 'endpoint mati'})`);
        continue;
      }
      if (!upstream.ok) {
        errors.push(`${base} → HTTP ${upstream.status}: ${text.slice(0, 160)}`);
        continue;
      }

      return new Response(text, {
        status: 200,
        headers: {
          'content-type': upstream.headers.get('content-type') || 'application/json',
          'cache-control': 'no-store',
        },
      });
    } catch (e) {
      clearTimeout(timer);
      const msg = (e as Error).name === 'AbortError' ? 'timeout 120s' : (e as Error).message;
      errors.push(`${base} → ${msg}`);
    }
  }

  return json(
    {
      error: {
        message:
          'Backend AI tidak dapat dihubungi. Pastikan cell "JALANKAN" di Colab masih berjalan dan URL ngrok masih sama.',
        detail: errors,
      },
    },
    502,
  );
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params.path ?? []);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params.path ?? []);
}
