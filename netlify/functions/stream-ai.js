// Compatibility: older Google AI Studio / Netlify templates call GET /api/stream-ai (probe)
// and POST with the same JSON shape as /api/gemini. Proxies to Gemini with GEMINI_API_KEY.
import { handleGeminiProxy } from './_geminiProxyCore.js';

export default async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Brain Backup AI proxy. Use POST with { system, prompt } or { prompt }.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  return handleGeminiProxy(req);
};

export const config = { path: '/api/stream-ai' };
