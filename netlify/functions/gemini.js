import { handleGeminiProxy } from './_geminiProxyCore.js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  return handleGeminiProxy(req);
};

export const config = { path: '/api/gemini' };
