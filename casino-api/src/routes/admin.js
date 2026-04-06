const express  = require('express');
const db       = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { apiLimiter }   = require('../middleware/rateLimit');
const { getIO }        = require('../services/socket');

const router = express.Router();
router.use(authenticate, requireAdmin, apiLimiter);

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, txns, bal] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users WHERE is_admin = FALSE`),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE type='deposit' AND status='pending')  AS pending_deposits,
          COUNT(*) FILTER (WHERE type='withdrawal' AND status='pending') AS pending_withdrawals,
          COALESCE(SUM(amount) FILTER (WHERE type='deposit' AND status='approved'), 0) AS total_deposited,
          COALESCE(SUM(amount) FILTER (WHERE type='withdrawal' AND status='approved'), 0) AS total_withdrawn,
          COUNT(*) AS total_transactions
        FROM transactions
      `),
      db.query(`SELECT COALESCE(SUM(balance), 0) AS total_balance FROM users WHERE is_admin=FALSE`),
    ]);

    const t = txns.rows[0];
    return res.json({
      totalUsers:          parseInt(users.rows[0].count),
      totalBalance:        parseFloat(bal.rows[0].total_balance),
      pendingDeposits:     parseInt(t.pending_deposits),
      pendingWithdrawals:  parseInt(t.pending_withdrawals),
      totalDeposited:      parseFloat(t.total_deposited),
      totalWithdrawn:      parseFloat(t.total_withdrawn),
      totalTransactions:   parseInt(t.total_transactions),
      houseProfit:         parseFloat(t.total_deposited) - parseFloat(t.total_withdrawn) - parseFloat(bal.rows[0].total_balance),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    const result = await db.query(
      `SELECT
         u.id, u.username, u.email, u.balance, u.is_banned, u.created_at,
         COUNT(t.id) FILTER (WHERE t.type='deposit')    AS deposits_count,
         COUNT(t.id) FILTER (WHERE t.type='withdrawal') AS withdrawals_count,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type='deposit' AND t.status='approved'), 0)    AS total_deposited,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type='withdrawal' AND t.status='approved'), 0) AS total_withdrawn
       FROM users u
       LEFT JOIN transactions t ON t.user_id = u.id
       WHERE u.is_admin = FALSE
         AND (u.username ILIKE $1 OR u.email ILIKE $1)
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [`%${q}%`]
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/admin/users/:id/balance ──────────────────────────────────────
router.patch('/users/:id/balance', async (req, res) => {
  try {
    const newBalance = parseFloat(req.body.balance);
    if (isNaN(newBalance) || newBalance < 0)
      return res.status(400).json({ error: 'Invalid balance value' });

    const result = await db.query(
      `UPDATE users SET balance = $1 WHERE id = $2 AND is_admin = FALSE RETURNING id, username, balance`,
      [newBalance, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    // Push to user in real-time
    getIO().to(`user-${req.params.id}`).emit('balance:update', { balance: newBalance });

    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Set balance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/admin/users/:id/ban ─────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET is_banned = NOT is_banned
       WHERE id = $1 AND is_admin = FALSE
       RETURNING id, username, is_banned`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Ban toggle error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/admin/transactions ─────────────────────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { q, type, status } = req.query;
    let where = ['TRUE'];
    const params = [];
    let idx = 1;

    if (q)      { where.push(`u.username ILIKE $${idx++}`); params.push(`%${q}%`); }
    if (type)   { where.push(`t.type = $${idx++}`);          params.push(type); }
    if (status) { where.push(`t.status = $${idx++}`);        params.push(status); }

    const result = await db.query(
      `SELECT t.*, u.username
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at DESC`,
      params
    );
    return res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Admin txns error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/admin/transactions/:id/approve ───────────────────────────────
router.patch('/transactions/:id/approve', async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    const txResult = await client.query(
      `SELECT * FROM transactions WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [req.params.id]
    );
    if (txResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already processed' });
    }

    const tx = txResult.rows[0];

    await client.query(
      `UPDATE transactions SET status='approved', processed_at=NOW() WHERE id=$1`,
      [tx.id]
    );

    // For deposits: credit the user's balance
    if (tx.type === 'deposit') {
      const balResult = await client.query(
        `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
        [tx.amount, tx.user_id]
      );
      const newBalance = parseFloat(balResult.rows[0].balance);
      getIO().to(`user-${tx.user_id}`).emit('balance:update', { balance: newBalance });
    }
    // For withdrawals: balance was already deducted on submission

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve tx error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/admin/transactions/:id/reject ────────────────────────────────
router.patch('/transactions/:id/reject', async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    const txResult = await client.query(
      `SELECT * FROM transactions WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [req.params.id]
    );
    if (txResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already processed' });
    }

    const tx = txResult.rows[0];

    await client.query(
      `UPDATE transactions SET status='rejected', processed_at=NOW() WHERE id=$1`,
      [tx.id]
    );

    // For rejecting a withdrawal: refund the balance
    if (tx.type === 'withdrawal') {
      const balResult = await client.query(
        `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
        [tx.amount, tx.user_id]
      );
      const newBalance = parseFloat(balResult.rows[0].balance);
      getIO().to(`user-${tx.user_id}`).emit('balance:update', { balance: newBalance });
    }

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reject tx error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ─── GET /api/admin/users/:id/profile ────────────────────────────────────────
router.get('/users/:id/profile', async (req, res) => {
  try {
    const [user, txns] = await Promise.all([
      db.query(
        `SELECT id, username, email, balance, is_banned, created_at FROM users WHERE id=$1`,
        [req.params.id]
      ),
      db.query(
        `SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC`,
        [req.params.id]
      ),
    ]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: user.rows[0], transactions: txns.rows });
  } catch (err) {
    console.error('Admin profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
