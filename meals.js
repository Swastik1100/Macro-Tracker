// ─────────────────────────────────────────────
//  routes/meals.js  –  REST API for meal logs
//
//  GET    /api/meals?date=YYYY-MM-DD   → meals for that day
//  GET    /api/summary?date=YYYY-MM-DD → macro totals for that day
//  GET    /api/history                 → last 7 days that have data
//  POST   /api/meals                   → log a new meal
//  DELETE /api/meals/:id               → remove a meal entry
// ─────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const db = require('./db');

// Helper: return today's local date as "YYYY-MM-DD"
function todayStr() {
  const d = new Date();
  return d.toLocaleDateString('en-CA'); // "YYYY-MM-DD" in en-CA locale
}

// ── GET /api/meals ──────────────────────────
router.get('/meals', (req, res) => {
  const date = req.query.date || todayStr();
  // Basic validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const meals = db.getMealsByDate(date);
  res.json({ date, meals });
});

// ── GET /api/summary ────────────────────────
router.get('/summary', (req, res) => {
  const date = req.query.date || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const summary = db.getDailySummary(date);
  res.json({ date, ...summary });
});

// ── GET /api/history ────────────────────────
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 7, 30);
  const dates = db.getRecentDates(limit);

  // For each date, attach the summary so the frontend can render sparklines
  const history = dates.map(date => ({
    date,
    ...db.getDailySummary(date),
    meals: db.getMealsByDate(date),
  }));

  res.json({ history });
});

// ── POST /api/meals ─────────────────────────
router.post('/meals', (req, res) => {
  const { date, name, emoji, category, kcal, protein, carbs, fats } = req.body;

  // Validate required fields
  if (!name || kcal === undefined) {
    return res.status(400).json({ error: 'name and kcal are required.' });
  }

  const logDate   = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : todayStr();
  const logged_at = new Date().toISOString();

  const meal = db.insertMeal({
    date: logDate,
    logged_at,
    name:     String(name).trim(),
    emoji:    String(emoji  || '🍽️').trim(),
    category: String(category || 'Other').trim(),
    kcal:     Number(kcal)    || 0,
    protein:  Number(protein) || 0,
    carbs:    Number(carbs)   || 0,
    fats:     Number(fats)    || 0,
  });

  res.status(201).json({ meal });
});

// ── GET /api/food-search ────────────────────
// Proxy to Open Food Facts (no API key required).
// Returns up to 15 products with per-100 g macro data.
router.get('/food-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ items: [] });

  try {
    const apiUrl =
      'https://world.openfoodfacts.org/cgi/search.pl?' +
      `search_terms=${encodeURIComponent(q)}` +
      '&search_simple=1&action=process&json=1&page_size=20' +
      '&fields=product_name,nutriments,serving_size,serving_quantity';

    const apiRes  = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    const apiData = await apiRes.json();

    const items = (apiData.products || [])
      .filter(p => {
        const n = p.nutriments || {};
        return p.product_name && typeof n['energy-kcal_100g'] === 'number';
      })
      .slice(0, 15)
      .map(p => {
        const n = p.nutriments;
        return {
          name:           p.product_name.trim(),
          kcalPer100g:    Math.round(n['energy-kcal_100g']   || 0),
          proteinPer100g: +((n['proteins_100g']      || 0).toFixed(1)),
          carbsPer100g:   +((n['carbohydrates_100g'] || 0).toFixed(1)),
          fatsPer100g:    +((n['fat_100g']            || 0).toFixed(1)),
          servingSize:    p.serving_size                      || null,
          servingQty:     p.serving_quantity ? Math.round(p.serving_quantity) : null,
        };
      });

    res.json({ items });
  } catch (e) {
    console.error('[food-search]', e.message);
    res.status(502).json({ error: 'Food database temporarily unavailable.' });
  }
});

// ── DELETE /api/meals/:id ───────────────────
router.delete('/meals/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });

  const deleted = db.deleteMeal(id);
  if (deleted === 0) return res.status(404).json({ error: 'Meal not found.' });

  res.json({ success: true, id });
});

module.exports = router;
