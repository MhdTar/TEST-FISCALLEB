import { json } from './_auth.js';

// POST /api/contact  { question, phone, email, website }
// Sends the visitor's question to our inbox through Resend (https://resend.com).
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  (required)  API key from resend.com
//   CONTACT_TO      (optional)  where questions are delivered   (default: info@fiscalleb.com)
//   CONTACT_FROM    (optional)  sender shown in the inbox       (default: Resend test sender)

const TO = () => process.env.CONTACT_TO || 'info@fiscalleb.com';
const FROM = () => process.env.CONTACT_FROM || 'FiscalLeb Website <onboarding@resend.dev>';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone = (v) => v.replace(/\D/g, '').length >= 6;

// Very small per-instance rate limit: 5 messages / 10 minutes per IP (best effort)
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  // Honeypot: real visitors never fill this hidden field
  if (body.website) return json({ ok: true });

  const question = String(body.question || '').trim().slice(0, 3000);
  const phone = String(body.phone || '').trim().slice(0, 40);
  const email = String(body.email || '').trim().slice(0, 120);

  if (!question) return json({ error: 'Question is required' }, 400);
  if (!(validPhone(phone) || validEmail(email))) {
    return json({ error: 'A phone number or an email is required' }, 400);
  }
  if (email && !validEmail(email)) return json({ error: 'Invalid email' }, 400);

  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip)) return json({ error: 'Too many messages, please try later' }, 429);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ error: 'Email service is not configured' }, 500);

  const text = `Question:\n${question}\n\nPhone: ${phone || '-'}\nEmail: ${email || '-'}`;
  const html = `<h3>New question from the FiscalLeb website</h3>
<p style="white-space:pre-wrap">${esc(question)}</p>
<p><b>Phone:</b> ${esc(phone || '-')}<br><b>Email:</b> ${esc(email || '-')}</p>`;

  const payload = {
    from: FROM(),
    to: [TO()],
    subject: 'Question from FiscalLeb website',
    text,
    html,
  };
  if (validEmail(email)) payload.reply_to = email; // pressing Reply answers the visitor

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res || !res.ok) return json({ error: 'Could not send the message' }, 502);
  return json({ ok: true });
}
