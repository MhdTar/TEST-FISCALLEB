// Apply the saved dark/light choice as early as possible
try { if (localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}

// Loads shared header/footer partials into every page and highlights the active nav link.
// Note: fetch() needs a web server (not file://). See README.md.
async function loadPartial(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error('Could not load ' + url, err);
  }
}

async function loadComponents() {
  await Promise.all([
    loadPartial('site-header', 'partials/header.html'),
    loadPartial('site-footer', 'partials/footer.html')
  ]);
  const current = document.body.dataset.page;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === current);
  });
  // Dark / light mode toggle (choice is remembered)
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  }
  // If the URL has a hash (e.g. index.html#contact), scroll after header/footer exist
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView();
  }
}

document.addEventListener('DOMContentLoaded', loadComponents);
