// Brain Backup — SendGrid transactional email proxy
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL)' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { to, subject, text } = body;
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
    return new Response(JSON.stringify({ error: 'Valid "to" email required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!subject || typeof subject !== 'string') {
    return new Response(JSON.stringify({ error: '"subject" required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: '"text" body required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const plain = String(text).slice(0, 500_000);

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to.trim() }] }],
        from: { email: fromEmail },
        subject: String(subject).slice(0, 998),
        content: [{ type: 'text/plain', value: plain }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText || `SendGrid ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Send failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
