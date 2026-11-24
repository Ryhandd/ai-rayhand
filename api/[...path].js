// Proxy streaming → Ollama Colab via ngrok.
// Browser memanggil /api/<path> di domain sendiri (nol CORS, kunci aman).
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://subscribe-cancel-reckless.ngrok-free.dev';
const API_KEY = 'ollama-local';

export default async function handler(req) {
  const path = new URL(req.url).pathname.replace(/^\/api/, '');
  const url = UPSTREAM + '/v1' + path;

  const init = {
    method: req.method,
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  };
  if (req.method === 'POST') init.body = await req.text();

  try {
    const res = await fetch(url, init);
    const h = new Headers();
    const ct = res.headers.get('content-type');
    if (ct) h.set('content-type', ct);
    h.set('cache-control', 'no-cache');
    // Streaming SSE diteruskan apa adanya
    return new Response(res.body, { status: res.status, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream unreachable: ' + e.message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
