// ─────────────────────────────────────────────
//  server/index.js  –  Express entry point
// ─────────────────────────────────────────────

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const mealsRoute = require('./meals');
const userRoute  = require('./users');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend from the project root
app.use(express.static(path.join(__dirname)));

// ── API Routes ───────────────────────────────
app.use('/api', userRoute);
app.use('/api', mealsRoute);

// ── Health check ─────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Catch-all: serve index.html for SPA ──────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍱  Ghop-Ghop-Ghop server running at http://localhost:${PORT}\n`);
});

