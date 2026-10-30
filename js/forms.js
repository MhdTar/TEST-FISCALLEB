// Force file download with custom Arabic filename
async function forceDownload(fileUrl, downloadName) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Fallback if fetch fails
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = downloadName;
    a.click();
  }
}

function normalizeText(t) {
  return String(t || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}

let currentCategory = 'cnss';

function renderForms(category = currentCategory) {
  currentCategory = category;
  const container = document.getElementById('forms-container');
  container.innerHTML = '';

  // Search only inside the selected category (CNSS or MOF)
  const q = normalizeText(document.getElementById('search-input').value.trim());
  const filtered = formsData.filter(f =>
    f.category === category &&
    (!q || normalizeText(f.title).includes(q))
  );

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">' + (q ? 'No results found.' : 'No forms available in this category.') + '</p>';
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'form-card';
    div.innerHTML = `
      <div>
        <h4>${item.title}</h4>
      </div>
      <div class="form-actions">
       <a href="${item.file}" target="_blank" rel="noopener" class="btn primary btn-sm">Preview</a>
        <button class="btn primary btn-sm">Download Form</button>
      </div>
    `;
    div.querySelector('button').addEventListener('click', () => forceDownload(item.file, item.downloadName));
    container.appendChild(div);
  });
}

function filterForms(category) {
  document.querySelectorAll('.forms-filter button').forEach(btn => {
    btn.classList.remove('primary');
    btn.classList.add('secondary');
  });
  const activeBtn = document.getElementById('filter-' + category);
  if (activeBtn) {
    activeBtn.classList.remove('secondary');
    activeBtn.classList.add('primary');
  }
  renderForms(category);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').addEventListener('input', () => renderForms());
  renderForms('cnss');
});
