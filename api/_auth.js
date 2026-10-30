import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'fl_admin';
const sign = (v) =>
  createHmac('sha256', process.env.SESSION_SECRET).update(v).digest('hex');

export function makeToken() {
  const exp = String(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  return `${exp}.${sign(exp)}`;
}

export function isAdmin(request) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!found) return false;
  const [exp, sig] = found.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cookieHeader = (token, maxAge) =>
  `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });