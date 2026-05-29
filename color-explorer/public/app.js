/* ----------------------------------------------------------------------
   Color Palette Explorer — frontend logic
   ---------------------------------------------------------------------- */

const colors = window.COLORS || [];

const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const emptyState = document.getElementById('emptyState');
const toastEl = document.getElementById('toast');
const themeToggle = document.getElementById('themeToggle');
const recentSection = document.getElementById('recentSection');
const recentSwatches = document.getElementById('recentSwatches');

/* --- color math --------------------------------------------------------- */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Choose readable text color based on perceived luminance.
function contrastText({ r, g, b }) {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a2e' : '#ffffff';
}

/* --- rendering ---------------------------------------------------------- */

function createCard(color) {
  const rgb = hexToRgb(color.hex);
  const hsl = rgbToHsl(rgb);
  const textColor = contrastText(rgb);

  const card = document.createElement('article');
  card.className = 'card';
  card.style.backgroundColor = color.hex;
  card.style.color = textColor;
  card.dataset.name = color.name.toLowerCase();
  card.dataset.hex = color.hex.toLowerCase();

  card.innerHTML = `
    <h3 class="card__name">${color.name}</h3>
    <div class="card__meta">
      <span class="card__hex">${color.hex.toUpperCase()}</span>
      <span>rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</span>
      <span>hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</span>
    </div>
  `;

  card.addEventListener('click', () => handleColorClick(color));
  return card;
}

function renderGrid() {
  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  colors.forEach((color) => fragment.appendChild(createCard(color)));
  grid.appendChild(fragment);
}

/* --- interactions ------------------------------------------------------- */

let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
}

function paintBackground(hex) {
  document.body.style.backgroundColor = hex;
}

async function copyHex(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    return true;
  } catch (err) {
    // Fallback for non-secure contexts
    try {
      const ta = document.createElement('textarea');
      ta.value = hex;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (_) {
      return false;
    }
  }
}

async function handleColorClick(color) {
  const hex = color.hex.toUpperCase();
  paintBackground(color.hex);
  await copyHex(hex);
  showToast('Copied HEX to clipboard!');

  try {
    const res = await fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: color.name, hex }),
    });
    if (res.ok) {
      const recent = await res.json();
      renderRecent(recent);
    }
  } catch (err) {
    console.error('Could not record view:', err);
  }
}

/* --- search ------------------------------------------------------------- */

function applySearch(query) {
  const q = query.trim().toLowerCase();
  let visible = 0;
  grid.querySelectorAll('.card').forEach((card) => {
    const match = !q ||
      card.dataset.name.includes(q) ||
      card.dataset.hex.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  emptyState.hidden = visible !== 0;
}

searchInput.addEventListener('input', (e) => applySearch(e.target.value));

/* --- recently viewed ---------------------------------------------------- */

function renderRecent(recent) {
  if (!recent || recent.length === 0) {
    recentSection.hidden = true;
    return;
  }
  recentSection.hidden = false;
  recentSwatches.innerHTML = '';
  recent.forEach((entry) => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = entry.hex;
    swatch.title = `${entry.name} — ${entry.hex.toUpperCase()}`;
    swatch.setAttribute('aria-label', `${entry.name} ${entry.hex}`);
    swatch.addEventListener('click', () =>
      handleColorClick({ name: entry.name, hex: entry.hex })
    );
    recentSwatches.appendChild(swatch);
  });
}

async function loadRecent() {
  try {
    const res = await fetch('/api/recent');
    if (res.ok) renderRecent(await res.json());
  } catch (err) {
    console.error('Could not load recent views:', err);
  }
}

/* --- dark mode ---------------------------------------------------------- */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.querySelector('.theme-toggle__icon').textContent =
    theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  const saved = localStorage.getItem('cpe-theme');
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

themeToggle.addEventListener('click', () => {
  const next =
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('cpe-theme', next);
});

/* --- init --------------------------------------------------------------- */

initTheme();
renderGrid();
loadRecent();
