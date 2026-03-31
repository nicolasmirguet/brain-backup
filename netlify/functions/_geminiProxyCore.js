// Bundled into gemini + stream-ai entrypoints (underscore: not a top-level Netlify function on most setups).
const DEFAULT_MODEL = 'gemini-2.0-flash';

function normalizeBody(body) {
  if (!body || typeof body !== 'object') {
    return { system: '', prompt: '' };
  }
  let system = typeof body.system === 'string' ? body.system : '';
  let prompt = typeof body.prompt === 'string' ? body.prompt : '';

  if (!prompt && typeof body.message === 'string') prompt = body.message;
  if (!prompt && typeof body.input === 'string') prompt = body.input;
  if (!prompt && typeof body.text === 'string') prompt = body.text;

  if (!prompt && Array.isArray(body.messages)) {
    const last = body.messages[body.messages.length - 1];
    if (last && typeof last.content === 'string') prompt = last.content;
    else if (last && typeof last.text === 'string') prompt = last.text;
  }

  if (!prompt && Array.isArray(body.contents)) {
    const texts = [];
    for (const c of body.contents) {
      if (!c?.parts) continue;
      for (const p of c.parts) {
        if (typeof p?.text === 'string') texts.push(p.text);
      }
    }
    prompt = texts.join('\n');
  }

  return { system, prompt };
}

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function handleGeminiProxy(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { system, prompt } = normalizeBody(body);
  if (!prompt.trim()) {
    return new Response(JSON.stringify({ error: 'prompt is required (or message / contents)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  /** @type {Record<string, unknown>} */
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.35,
    },
  };

  if (system.trim()) {
    payload.systemInstruction = {
      parts: [{ text: system.trim() }],
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Gemini API error (${res.status})`;
      console.error('Gemini error:', res.status, JSON.stringify(data));
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const candidate = data?.candidates?.[0];
    const reason = candidate?.finishReason;
    if (reason === 'SAFETY' || reason === 'RECITATION') {
      return new Response(
        JSON.stringify({ error: 'Response blocked by the model. Try shortening or rephrasing your text.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const parts = candidate?.content?.parts;
    const text = Array.isArray(parts) ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('') : '';

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Empty model response. Try again.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function error:', String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
