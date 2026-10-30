import { createSign } from 'node:crypto';

// يرسل إشعار Push لكل الأجهزة المشتركة في topic اسمه "circulars"
// المتغير المطلوب في Vercel: FIREBASE_SERVICE_ACCOUNT (محتوى ملف JSON كاملاً)
const b64u = (v) => Buffer.from(v).toString('base64url');

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error('Google auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

export async function pushNewCircular(title) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return { sent: false, reason: 'FIREBASE_SERVICE_ACCOUNT not set' };

  try {
    const sa = JSON.parse(raw);
    const token = await getAccessToken(sa);
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          topic: 'circulars',
          notification: { title: 'New Circular / Decision', body: title },
          data: { open: 'https://fiscalleb.com/circulars.html' },
          android: {
            priority: 'HIGH',
            notification: { channel_id: 'circulars' },
          },
        },
      }),
    });
    if (!r.ok) return { sent: false, reason: await r.text() };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String(e.message || e) };
  }
}
