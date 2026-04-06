const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const { authLimiter }  = require('../middleware/rateLimit');

const router = express.Router();

// ─── Helper: sign JWT ───────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    {
      id:       user.id,
      username: user.username,
      email:    user.email,
      is_admin: user.is_admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    let { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    username = username.trim().toLowerCase();
    email    = email.trim().toLowerCase();

    // Validation
    if (username.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (username.length > 20) return res.status(400).json({ error: 'Username must be 20 characters or less' });
    if (!/^[a-z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username: letters, numbers, underscores only' });
    if (username === 'admin') return res.status(400).json({ error: 'Username not available' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, balance, is_admin, created_at`,
      [username, email, passwordHash]
    );

    const user  = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    if (err.code === '23505') {
      // Unique violation
      const msg = err.detail?.includes('username') ? 'Username already taken' : 'Email already registered';
      return res.status(409).json({ error: msg });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    let { identifier, password } = req.body; // identifier = username OR email

    if (!identifier || !password)
      return res.status(400).json({ error: 'All fields are required' });

    identifier = identifier.trim().toLowerCase();

    // Find by username or email
    const result = await db.query(
      `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
      [identifier]
    );

    const user = result.rows[0];

    if (!user)               return res.status(401).json({ error: 'Account not found' });
    if (user.is_banned)      return res.status(403).json({ error: 'Account has been suspended' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)              return res.status(401).json({ error: 'Incorrect password' });

    const token = signToken(user);
    return res.json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, email, balance, is_admin, is_banned, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── Helper ─────────────────────────────────────────────────────────────────
function safeUser(u) {
  return {
    id:         u.id,
    username:   u.username,
    email:      u.email,
    balance:    parseFloat(u.balance),
    is_admin:   u.is_admin,
    is_banned:  u.is_banned,
    created_at: u.created_at,
  };
}

module.exports = router;
