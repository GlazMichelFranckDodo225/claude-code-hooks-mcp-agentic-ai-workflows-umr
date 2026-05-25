/* ── Constants & state ───────────────────────────────────────────── */
const STORAGE_KEY = 'futureme_letters';
const THEME_KEY   = 'futureme_theme';

const QUOTES = [
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "In 20 years you'll be more disappointed by the things you didn't do than by the ones you did.", author: "Mark Twain" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Your future self is watching you right now through your memories.", author: "Aubrey de Grey" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does — keep going.", author: "Sam Levenson" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "You have within you right now everything you need to deal with whatever the world throws at you.", author: "Brian Tracy" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

let pendingDeleteId = null;
let countdownInterval = null;

/* ── DOM refs ────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const form          = $('letterForm');
const authorName    = $('authorName');
const letterTitle   = $('letterTitle');
const letterMessage = $('letterMessage');
const revealDate    = $('revealDate');
const charCount     = $('charCount');
const lettersGrid   = $('lettersGrid');
const emptyState    = $('emptyState');
const totalCount    = $('totalCount');
const unlockedCount = $('unlockedCount');
const themeToggle   = $('themeToggle');
const modalOverlay  = $('modalOverlay');
const deleteOverlay = $('deleteOverlay');
const quoteText     = $('quoteText');

/* ── Helpers ─────────────────────────────────────────────────────── */
function loadLetters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveLetters(letters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
}

function isUnlocked(letter) {
  return Date.now() >= new Date(letter.revealDate).getTime();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function msToCountdown(ms) {
  if (ms <= 0) return 'Unlocked!';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ${h % 24}h remaining`;
  if (h > 0)  return `${h}h ${m % 60}m remaining`;
  if (m > 0)  return `${m}m ${s % 60}s remaining`;
  return `${s}s remaining`;
}

function progressPercent(letter) {
  const created = new Date(letter.createdAt).getTime();
  const reveal  = new Date(letter.revealDate).getTime();
  const now     = Date.now();
  if (now >= reveal) return 100;
  const total   = reveal - created;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - created) / total) * 100));
}

function showToast(msg, duration = 2800) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function setError(id, msg) {
  const el = $(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  ['nameError','titleError','messageError','dateError'].forEach(id => setError(id, ''));
}

/* ── Quote rotation ──────────────────────────────────────────────── */
function showRandomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteText.textContent = `${q.text} — ${q.author}`;
  quoteText.style.animation = 'none';
  void quoteText.offsetWidth;
  quoteText.style.animation = 'fadeSlideUp .5s ease both';
}

/* ── Theme ───────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeToggle').querySelector('.theme-icon').textContent = theme === 'dark' ? '☀' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ── Char counter ────────────────────────────────────────────────── */
letterMessage.addEventListener('input', () => {
  charCount.textContent = letterMessage.value.length;
});

/* ── Min date for input ──────────────────────────────────────────── */
function setMinDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  revealDate.min = tomorrow.toISOString().split('T')[0];
}

/* ── Form submit ─────────────────────────────────────────────────── */
form.addEventListener('submit', e => {
  e.preventDefault();
  clearErrors();

  let valid = true;
  const name    = authorName.value.trim();
  const title   = letterTitle.value.trim();
  const message = letterMessage.value.trim();
  const date    = revealDate.value;

  if (!name)    { setError('nameError', 'Please enter your name.'); valid = false; }
  if (!title)   { setError('titleError', 'Please enter a title.'); valid = false; }
  if (!message) { setError('messageError', 'Please write your message.'); valid = false; }
  if (!date) {
    setError('dateError', 'Please select a date.'); valid = false;
  } else if (new Date(date).getTime() <= Date.now()) {
    setError('dateError', 'Date must be in the future.'); valid = false;
  }
  if (!valid) return;

  const letter = {
    id:         crypto.randomUUID(),
    authorName: name,
    title,
    message,
    revealDate: date,
    createdAt:  new Date().toISOString(),
  };

  const letters = loadLetters();
  letters.unshift(letter);
  saveLetters(letters);

  form.reset();
  charCount.textContent = '0';
  setMinDate();

  renderDashboard();
  showToast('✉ Letter sealed! Your future self awaits.');

  document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ── Render dashboard ────────────────────────────────────────────── */
function renderDashboard() {
  const letters = loadLetters();
  lettersGrid.innerHTML = '';

  const total    = letters.length;
  const unlocked = letters.filter(isUnlocked).length;
  totalCount.textContent    = total;
  unlockedCount.textContent = unlocked;

  if (total === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  letters.forEach((letter, i) => {
    const card = buildLetterCard(letter, i);
    lettersGrid.appendChild(card);
  });
}

/* ── Build a letter card ─────────────────────────────────────────── */
function buildLetterCard(letter, index) {
  const unlocked = isUnlocked(letter);
  const pct      = progressPercent(letter);
  const msLeft   = new Date(letter.revealDate).getTime() - Date.now();
  const ctText   = msToCountdown(msLeft);

  const card = document.createElement('div');
  card.className = `letter-card ${unlocked ? 'unlocked' : 'locked'}`;
  card.style.animationDelay = `${index * 60}ms`;
  card.dataset.id = letter.id;

  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <div class="letter-header">
      <div class="letter-title">${escHtml(letter.title)}</div>
      <span class="letter-status ${unlocked ? 'status-unlocked' : 'status-locked'}">
        ${unlocked ? '🔓 Open' : '🔒 Sealed'}
      </span>
    </div>
    <div class="letter-author">From: ${escHtml(letter.authorName)}</div>
    <div class="letter-dates">
      Written: ${formatDate(letter.createdAt)}<br>
      Reveals: ${formatDate(letter.revealDate)}
    </div>
    <div class="progress-wrap">
      <div class="progress-label">
        <span>${unlocked ? 'Journey complete' : 'Progress'}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="countdown-text" data-id="${letter.id}">${ctText}</div>
    <div class="letter-actions">
      <button class="btn btn-read" data-action="read" data-id="${letter.id}" ${unlocked ? '' : 'disabled title="Sealed until reveal date"'}>
        ${unlocked ? '📖 Read' : '🔒 Sealed'}
      </button>
      <button class="btn btn-delete" data-action="delete" data-id="${letter.id}">
        🗑 Delete
      </button>
    </div>
  `;

  return card;
}

/* ── Escape HTML ─────────────────────────────────────────────────── */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Card actions (event delegation) ────────────────────────────── */
lettersGrid.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'read')   openRevealModal(id);
  if (action === 'delete') openDeleteModal(id);
});

/* ── Reveal modal ────────────────────────────────────────────────── */
function openRevealModal(id) {
  const letters = loadLetters();
  const letter  = letters.find(l => l.id === id);
  if (!letter || !isUnlocked(letter)) return;

  $('modalTitle').textContent   = letter.title;
  $('modalMeta').textContent    = `Written by ${letter.authorName} on ${formatDate(letter.createdAt)} · Revealed ${formatDate(letter.revealDate)}`;
  $('modalMessage').textContent = letter.message;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRevealModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

$('modalClose').addEventListener('click', closeRevealModal);
$('modalCloseBtn').addEventListener('click', closeRevealModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeRevealModal(); });

/* ── Delete modal ────────────────────────────────────────────────── */
function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

$('deleteCancelBtn').addEventListener('click', closeDeleteModal);
$('deleteConfirmBtn').addEventListener('click', () => {
  if (!pendingDeleteId) return;
  const letters = loadLetters().filter(l => l.id !== pendingDeleteId);
  saveLetters(letters);
  closeDeleteModal();
  renderDashboard();
  showToast('Letter deleted.');
});
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });

/* ── Live countdown ticker ───────────────────────────────────────── */
function startCountdownTicker() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const letters = loadLetters();
    document.querySelectorAll('.countdown-text[data-id]').forEach(el => {
      const letter = letters.find(l => l.id === el.dataset.id);
      if (!letter) return;
      const ms = new Date(letter.revealDate).getTime() - Date.now();
      el.textContent = msToCountdown(ms);

      const card = el.closest('.letter-card');
      if (ms <= 0 && card && card.classList.contains('locked')) {
        renderDashboard();
      }

      const fill = card && card.querySelector('.progress-bar-fill');
      if (fill) {
        fill.style.width = progressPercent(letter) + '%';
      }
    });
  }, 1000);
}

/* ── Keyboard shortcuts ──────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeRevealModal(); closeDeleteModal(); }
});

/* ── Footer year ─────────────────────────────────────────────────── */
$('footerYear').textContent = new Date().getFullYear();

/* ── Init ────────────────────────────────────────────────────────── */
(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  setMinDate();
  showRandomQuote();
  setInterval(showRandomQuote, 15000);

  renderDashboard();
  startCountdownTicker();
})();
