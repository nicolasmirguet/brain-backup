const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 80;

/** @type {Map<string, { count: number; resetAt: number }>} */
const RATE_BUCKETS = new Map();

function getClientIp(req) {
  const xfwd = req.headers.get('x-forwarded-for') || '';
  return xfwd.split(',')[0]?.trim() || 'unknown';
}

function extractBearerToken(req) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function checkRateLimit(key) {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || now >= bucket.resetAt) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  RATE_BUCKETS.set(key, bucket);
  return { ok: true };
}

async function verifyFirebaseIdToken(idToken) {
  const webApiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!webApiKey) {
    return { ok: false, status: 500, error: 'FIREBASE_WEB_API_KEY (or VITE_FIREBASE_API_KEY) not configured' };
  }

  const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`;
  const res = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: 401, error: data?.error?.message || 'Invalid Firebase auth token' };
  }
  const uid = data?.users?.[0]?.localId;
  if (!uid) {
    return { ok: false, status: 401, error: 'Invalid Firebase auth token' };
  }
  return { ok: true, uid };
}

/**
 * Require authenticated user + basic rate limiting.
 * Returns null when request is allowed, or a Response when denied.
 */
export async function requireSecureRequest(req) {
  const idToken = extractBearerToken(req);
  if (!idToken) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified.ok) {
    return new Response(JSON.stringify({ error: verified.error }), {
      status: verified.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`${verified.uid}:${ip}`);
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait and try again.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rate.retryAfterSec),
      },
    });
  }

  return null;
}
