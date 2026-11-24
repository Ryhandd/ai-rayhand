import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Proxy ke backend AI (Ollama di instabox lewat ngrok).
 *
 * Browser memanggil /api/* di domain sendiri, lalu route ini meneruskan ke
 * upstream. Hasilnya: tidak ada masalah CORS, URL ngrok tidak tampil di
 * halaman, dan kalau satu upstream mati otomatis dicoba upstream berikutnya.
 *
 * Penting: respons di-pipe apa adanya (bukan di-buffer). Membaca seluruh SSE
 * dengan `await upstream.text()` menahan token sampai jawaban selesai, dan
 * pada model CPU yang hanya ~13 tok/s itu melewati batas waktu proxy.
 *
 * Env opsional (diatur di Vercel → Settings → Environment Variables):
 *   AI_UPSTREAM       = https://xxx.ngrok-free.dev     (boleh beberapa, pisah koma)
 *   AI_KEY            = ollama-local
 *   AI_DEFAULT_MODEL  = qwen3:8b-q4_K_M               (dipakai bila klien tidak
 *                                                       mengirim field `model`)
 */

const DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'qwen3:8b-q4_K_M';

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

/** Batas tunggu sampai byte pertama, bukan sampai jawaban selesai. */
const FIRST_BYTE_MS = 120_000;
const MAX_BODY_BYTES = 1_000_000; // 1 MB cukup untuk prompt + dokumen

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...CORS,
    },
  });
}

/** Situs lain boleh memanggil proxy ini dari browser. */
const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type, ngrok-skip-browser-warning',
  'access-control-max-age': '86400',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
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
    // Kalau klien tidak menyebut model, isi dengan model default.
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (!parsed.model) {
        parsed.model = DEFAULT_MODEL;
        body = JSON.stringify(parsed);
      }
    } catch {
      /* bukan JSON — biarkan upstream yang menolak */
    }
  }

  const errors: string[] = [];

  for (const base of UPSTREAMS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FIRST_BYTE_MS);

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

      // Gagal → baca error (kecil, tidak streaming) lalu coba upstream lain.
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        clearTimeout(timer);
        const ngrokCode = text.match(/ERR_NGROK_\d+/)?.[0];
        if (ngrokCode || text.includes('is offline')) {
          errors.push(`${base} → tunnel offline (${ngrokCode ?? 'endpoint mati'})`);
          continue;
        }
        errors.push(`${base} → HTTP ${upstream.status}: ${text.slice(0, 160)}`);
        continue;
      }

      // Sukses → teruskan body apa adanya. Timer dimatikan begitu upstream
      // merespons supaya jawaban panjang tidak dipotong di tengah jalan.
      if (!upstream.body) {
        const text = await upstream.text().catch(() => '');
        clearTimeout(timer);
        if (text) {
          const ngrokCode = text.match(/ERR_NGROK_\d+/)?.[0];
          if (ngrokCode || text.includes('is offline')) {
            errors.push(`${base} → tunnel offline (${ngrokCode ?? 'endpoint mati'})`);
            continue;
          }
        }
        return new Response(text, {
          status: 200,
          headers: {
            'content-type': upstream.headers.get('content-type') || 'application/json',
            'cache-control': 'no-store',
            ...CORS,
          },
        });
      }

      clearTimeout(timer);

      const ctype = upstream.headers.get('content-type') || 'application/json';
      const isStream = ctype.includes('event-stream') || sub === 'chat/completions';

      return new Response(upstream.body, {
        status: 200,
        headers: {
          'content-type': isStream ? 'text/event-stream; charset=utf-8' : ctype,
          'cache-control': 'no-store, no-transform',
          connection: 'keep-alive',
          // Matikan buffering di reverse proxy (nginx, dsb.)
          'x-accel-buffering': 'no',
          ...CORS,
        },
      });
    } catch (e) {
      clearTimeout(timer);
      const msg = (e as Error).name === 'AbortError' ? `timeout ${FIRST_BYTE_MS / 1000}s` : (e as Error).message;
      errors.push(`${base} → ${msg}`);
    }
  }

  return json(
    {
      error: {
        message:
          'Backend AI tidak dapat dihubungi. Pastikan sandbox instabox hidup dan tunnel ngrok masih jalan.',
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
