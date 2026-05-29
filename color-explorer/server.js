const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const VIEWS_FILE = path.join(DATA_DIR, 'views.json');
const MAX_RECENT = 5;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- persistence helpers -------------------------------------------------

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VIEWS_FILE)) {
    fs.writeFileSync(VIEWS_FILE, '[]', 'utf8');
  }
}

function readViews() {
  try {
    ensureStore();
    const raw = fs.readFileSync(VIEWS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Could not read views.json, starting fresh:', err.message);
    return [];
  }
}

function writeViews(views) {
  try {
    ensureStore();
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(views, null, 2), 'utf8');
  } catch (err) {
    console.error('Could not write views.json:', err.message);
  }
}

// Most-recent-first, de-duplicated by hex, capped at MAX_RECENT.
function recentFromViews(views) {
  const seen = new Set();
  const recent = [];
  for (let i = views.length - 1; i >= 0 && recent.length < MAX_RECENT; i--) {
    const entry = views[i];
    const key = (entry.hex || '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(entry);
  }
  return recent;
}

// --- API -----------------------------------------------------------------

app.get('/api/recent', (req, res) => {
  res.json(recentFromViews(readViews()));
});

app.post('/api/view', (req, res) => {
  const { name, hex } = req.body || {};
  if (!hex || typeof hex !== 'string') {
    return res.status(400).json({ error: 'A "hex" string is required.' });
  }
  const views = readViews();
  views.push({
    name: typeof name === 'string' ? name : 'Unknown',
    hex,
    viewedAt: new Date().toISOString(),
  });
  writeViews(views);
  res.json(recentFromViews(views));
});

app.listen(PORT, () => {
  console.log(`🎨 Color Palette Explorer running at http://localhost:${PORT}`);
});
