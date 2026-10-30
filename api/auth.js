import { createHash, timingSafeEqual } from 'node:crypto';
import { isAdmin, makeToken, cookieHeader, json } from './_auth.js';

const h = (s) => createHash('sha256').update(String(s)).digest();

// GET /api/auth → { admin: true/false }
export async function GET(request) {
  return json({ admin: isAdmin(request) });
}

// POST /api/auth  { password } → login
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD || '';
  const ok = expected && body.password && timingSafeEqual(h(body.password), h(expected));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: 'Wrong password' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(makeToken(), 12 * 60 * 60) });
}

// DELETE /api/auth → logout
export async function DELETE() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
}