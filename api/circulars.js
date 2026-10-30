import { put, list, del } from '@vercel/blob';
import { isAdmin, json } from './_auth.js';
import { pushNewCircular } from './_fcm.js';

const PREFIX = 'circulars/';
const ALLOWED = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const MAX_BYTES = 4.5 * 1024 * 1024; // Vercel function request limit

// File name format: circulars/<date>_<timestamp>_<title-as-hex>.<ext>
// This keeps title/date inside the file name, so no database is needed.
function parse(blob) {
  const name = blob.pathname.slice(PREFIX.length);
  const m = name.match(/^(\d{4}-\d{2}-\d{2})_(\d+)_([0-9a-f]+)\.([a-z0-9]+)$/i);
  if (!m) return null;
  return {
    date: m[1],
    ts: Number(m[2]),
    title: Buffer.from(m[3], 'hex').toString('utf8'),
    ext: m[4].toLowerCase(),
    url: blob.url,
    size: blob.size,
  };
}

// Public: GET /api/circulars
export async function GET() {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, cursor });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);

  const items = blobs
    .map(parse)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  return json(items);
}

// Admin: POST /api/circulars?title=..&date=YYYY-MM-DD&filename=x.pdf   (body = file)
export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Unauthorized' }, 401);

  const q = new URL(request.url).searchParams;
  const title = (q.get('title') || '').trim();
  const date = q.get('date') || '';
  const ext = (q.get('filename') || '').split('.').pop().toLowerCase();

  if (!title || title.length > 100) return json({ error: 'Title is required (max 100 characters).' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Invalid date.' }, 400);
  if (!ALLOWED.includes(ext)) return json({ error: 'File type not allowed.' }, 400);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES)
    return json({ error: 'File is too large (max 4.5 MB).' }, 413);
  if (!request.body) return json({ error: 'No file received.' }, 400);

  const hex = Buffer.from(title, 'utf8').toString('hex');
  const blob = await put(`${PREFIX}${date}_${Date.now()}_${hex}.${ext}`, request.body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: request.headers.get('content-type') || undefined,
  });
  // إشعار فوري لكل مستخدمي التطبيق (لا يمنع النشر إذا فشل)
  const push = await pushNewCircular(title);
  return json({ ok: true, url: blob.url, push });
}

// Admin: DELETE /api/circulars?url=<blob url>
export async function DELETE(request) {
  if (!isAdmin(request)) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url).searchParams.get('url') || '';
  let u;
  try { u = new URL(url); } catch { return json({ error: 'Invalid URL.' }, 400); }
  const okHost = u.hostname.endsWith('.public.blob.vercel-storage.com');
  const okPath = decodeURIComponent(u.pathname).startsWith('/' + PREFIX);
  if (!okHost || !okPath) return json({ error: 'Invalid file.' }, 400);

  await del(url);
  return json({ ok: true });
}