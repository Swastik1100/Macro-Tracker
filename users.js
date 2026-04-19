// ─────────────────────────────────────────────
//  users.js  –  Auth & user-management routes
//
//  POST /api/register              → create account
//  POST /api/login                 → get JWT token
//  GET  /api/users      [admin]    → list all users
//  PUT  /api/users/:id/deactivate  → deactivate a user
// ─────────────────────────────────────────────

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET env variable is not set. Set it in production to a long random string.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'ghop-ghop-ghop-secret-change-in-prod';

// ── Rate limiters ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth middleware ──────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── POST /api/register ───────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const userEmail = email || `${username}@macrotracker.local`;
    const user = db.createUser({ username, email: userEmail, password: hashed });
    res.status(201).json({ user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/login ──────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/users  [admin only] ─────────────
router.get('/users', adminLimiter, requireAuth, requireAdmin, (_req, res) => {
  try {
    const users = db.getAllUsers();
    res.json({ users });
  } catch {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// ── PUT /api/users/:id/deactivate  [admin] ───
router.put('/users/:id/deactivate', adminLimiter, requireAuth, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  // Prevent admin from deactivating themselves
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  try {
    const changes = db.deactivateUser(id);
    if (changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Could not deactivate user' });
  }
});

module.exports = router;
