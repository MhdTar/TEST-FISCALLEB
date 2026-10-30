const $ = (id) => document.getElementById(id);
const MAX_BYTES = 4.5 * 1024 * 1024;

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function setMsg(el, text, type) {
  el.textContent = text || '';
  el.className = 'msg' + (type ? ' ' + type : '');
}

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

function showAdmin(isAdmin) {
  $('login-box').style.display = isAdmin ? 'none' : 'block';
  $('admin-panel').style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) loadList();
}

async function checkSession() {
  const { data } = await api('/api/auth');
  showAdmin(!!(data && data.admin));
}

async function login() {
  setMsg($('login-msg'), 'Checking...');
  const { ok, data } = await api('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: $('admin-password').value }),
  });
  if (ok) {
    $('admin-password').value = '';
    setMsg($('login-msg'), '');
    showAdmin(true);
  } else {
    setMsg($('login-msg'), (data && data.error) || 'Login failed.', 'error');
  }
}

async function logout() {
  await api('/api/auth', { method: 'DELETE' });
  showAdmin(false);
}

async function loadList() {
  const container = $('taamim-container');
  container.innerHTML = '<p class="empty-msg">Loading...</p>';
  const { ok, data } = await api('/api/circulars', { cache: 'no-store' });
  if (!ok) {
    container.innerHTML = '<p class="empty-msg">Could not load circulars.</p>';
    return;
  }
  if (!data.length) {
    container.innerHTML = '<p class="empty-msg">No published circulars yet.</p>';
    return;
  }
  container.innerHTML = '';
  data.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'taamim-item';
    div.innerHTML = `
      <div class="taamim-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p>Published Date: ${escapeHtml(item.date)} · ${item.ext.toUpperCase()}</p>
      </div>
      <div class="taamim-actions">
        <a href="${item.url}" target="_blank" rel="noopener" class="btn primary btn-sm">View</a>
        <button class="btn secondary btn-danger btn-sm">Delete</button>
      </div>`;
    div.querySelector('.btn-danger').addEventListener('click', () => remove(item));
    container.appendChild(div);
  });
}

async function upload() {
  const title = $('t-title').value.trim();
  const date = $('t-date').value;
  const file = $('t-file').files[0];
  const msg = $('upload-msg');

  if (!title || !date || !file) return setMsg(msg, 'Please enter a title, a date and choose a file.', 'error');
  if (file.size > MAX_BYTES) return setMsg(msg, 'File is too large (max 4.5 MB).', 'error');

  $('upload-btn').disabled = true;
  setMsg(msg, 'Uploading...');

  const qs = new URLSearchParams({ title, date, filename: file.name });
  const { ok, status, data } = await api('/api/circulars?' + qs, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  $('upload-btn').disabled = false;
  if (ok) {
    setMsg(msg, 'Published successfully.', 'ok');
    $('t-title').value = '';
    $('t-date').value = '';
    $('t-file').value = '';
    loadList();
  } else if (status === 401) {
    showAdmin(false);
  } else {
    setMsg(msg, (data && data.error) || 'Upload failed.', 'error');
  }
}

async function remove(item) {
  if (!confirm(`Delete "${item.title}"? It will be removed from the public page.`)) return;
  const { ok, status, data } = await api('/api/circulars?url=' + encodeURIComponent(item.url), { method: 'DELETE' });
  if (ok) loadList();
  else if (status === 401) showAdmin(false);
  else alert((data && data.error) || 'Delete failed.');
}

document.addEventListener('DOMContentLoaded', () => {
  $('login-btn').addEventListener('click', login);
  $('admin-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  $('logout-btn').addEventListener('click', logout);
  $('upload-btn').addEventListener('click', upload);
  checkSession();
});