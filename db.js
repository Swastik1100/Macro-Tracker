// ─────────────────────────────────────────────
//  db.js  –  SQLite setup & all query helpers
//  Uses better-sqlite3 (synchronous, zero config)
//  The .db file lives at ./data/macros.db
// ─────────────────────────────────────────────

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Make sure the data/ folder exists
const dataDir = path.join(__dirname, 'data'); // Remove the '..'
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'macros.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── Schema ──────────────────────────────────
db.exec(`
  -- Every meal entry the user logs
  CREATE TABLE IF NOT EXISTS meal_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,          -- "YYYY-MM-DD"  (local date)
    logged_at  TEXT    NOT NULL,          -- full ISO timestamp
    name       TEXT    NOT NULL,
    emoji      TEXT    NOT NULL DEFAULT '🍽️',
    category   TEXT    NOT NULL DEFAULT 'Other',
    kcal       REAL    NOT NULL DEFAULT 0,
    protein    REAL    NOT NULL DEFAULT 0,
    carbs      REAL    NOT NULL DEFAULT 0,
    fats       REAL    NOT NULL DEFAULT 0
  );

  -- Index so fetching "today" is fast
  CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date);
`);
// Add to db.js after the meal_logs table definition
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'user',  -- 'user' or 'admin'
    created_at TEXT    NOT NULL,
    is_active  INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER NOT NULL,
    action     TEXT    NOT NULL,
    target_user_id INTEGER,
    details    TEXT,
    timestamp  TEXT    NOT NULL,
    FOREIGN KEY(admin_id) REFERENCES users(id)
  );

  -- Update meal_logs to include user_id
  ALTER TABLE meal_logs ADD COLUMN user_id INTEGER DEFAULT 1;
`);

// ── Queries ─────────────────────────────────

/** Return all logged meals for a given date string "YYYY-MM-DD" */
function getMealsByDate(date) {
  return db.prepare(`
    SELECT * FROM meal_logs WHERE date = ? ORDER BY id ASC
  `).all(date);
}

/** Insert one meal log row, return the inserted row */
function insertMeal({ date, logged_at, name, emoji, category, kcal, protein, carbs, fats }) {
  const stmt = db.prepare(`
    INSERT INTO meal_logs (date, logged_at, name, emoji, category, kcal, protein, carbs, fats)
    VALUES (@date, @logged_at, @name, @emoji, @category, @kcal, @protein, @carbs, @fats)
  `);
  const info = stmt.run({ date, logged_at, name, emoji, category, kcal, protein, carbs, fats });
  return db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(info.lastInsertRowid);
}

/** Delete one meal log by id, return number of deleted rows */
function deleteMeal(id) {
  const info = db.prepare('DELETE FROM meal_logs WHERE id = ?').run(id);
  return info.changes;
}

/**
 * Return daily summary totals for a given date.
 * Returns { kcal, protein, carbs, fats } – all numbers.
 */
function getDailySummary(date) {
  return db.prepare(`
    SELECT
      COALESCE(SUM(kcal),    0) AS kcal,
      COALESCE(SUM(protein), 0) AS protein,
      COALESCE(SUM(carbs),   0) AS carbs,
      COALESCE(SUM(fats),    0) AS fats
    FROM meal_logs
    WHERE date = ?
  `).get(date);
}

/**
 * Return the last N distinct dates that have at least one log,
 * newest first.
 */
function getRecentDates(limit = 7) {
  return db.prepare(`
    SELECT DISTINCT date FROM meal_logs
    ORDER BY date DESC LIMIT ?
  `).all(limit).map(r => r.date);
}

module.exports = { getMealsByDate, insertMeal, deleteMeal, getDailySummary, getRecentDates };
