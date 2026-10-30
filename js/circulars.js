function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatSize(bytes) {
  if (!bytes) return '';
  return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB';
}

async function forceDownload(fileUrl, downloadName) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const blobUrl = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    window.open(fileUrl, '_blank');
  }
}

// Normalise text so Arabic/English searches ignore case, diacritics and letter variants
function normalizeText(t) {
  return String(t || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}

let allCirculars = [];

function renderCirculars() {
  const container = document.getElementById('taamim-container');
  const q = normalizeText(document.getElementById('search-input').value.trim());
  const items = q
    ? allCirculars.filter(i => normalizeText(i.title + ' ' + i.date).includes(q))
    : allCirculars;

  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="empty-msg">' + (q ? 'No results found.' : 'No published circulars found.') + '</p>';
    return;
  }
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'taamim-item';
    div.innerHTML = `
      <div class="taamim-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p>Published Date: ${escapeHtml(item.date)} · ${item.ext.toUpperCase()} ${formatSize(item.size)}</p>
      </div>
      <div class="taamim-actions">
       <a href="${item.url}" target="_blank" rel="noopener" class="btn primary btn-sm">Preview</a>
        <button class="btn primary btn-sm">Download File</button>
      </div>`;
    div.querySelector('button').addEventListener('click', () =>
      forceDownload(item.url, `${item.title}.${item.ext}`));
    container.appendChild(div);
  });
}

async function loadCirculars() {
  const container = document.getElementById('taamim-container');
  container.innerHTML = '<p class="empty-msg">Loading...</p>';
  try {
    const res = await fetch('/api/circulars', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    allCirculars = await res.json();
    renderCirculars();
  } catch (e) {
    container.innerHTML = '<p class="empty-msg">Could not load circulars. Please try again later.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').addEventListener('input', renderCirculars);
  loadCirculars();
});