const express  = require('express');
const { v4: uuid } = require('uuid');
const db       = require('../db');
const { authenticate } = require('../middleware/auth');
const { apiLimiter }   = require('../middleware/rateLimit');
const { getIO }        = require('../services/socket');

const router  = express.Router();
const MIN_DEPOSIT    = 10;
const MIN_WITHDRAWAL = 50;

// All wallet routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// ─── GET /api/wallet/balance ─────────────────────────────────────────────────
router.get('/balance', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT balance FROM users WHERE id = $1',
      [req.user.id]
    );
    return res.json({ balance: parseFloat(result.rows[0]?.balance || 0) });
  } catch (err) {
    console.error('Balance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/wallet/deposit ────────────────────────────────────────────────
router.post('/deposit', async (req, res) => {
  try {
    const { amount, currency, txHash } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt < MIN_DEPOSIT)
      return res.status(400).json({ error: `Minimum deposit is $${MIN_DEPOSIT}` });
    if (!currency)
      return res.status(400).json({ error: 'Currency is required' });
    if (!txHash || txHash.trim().length < 5)
      return res.status(400).json({ error: 'Please enter a valid transaction ID' });

    const id = 'DEP_' + Date.now() + '_' + uuid().slice(0, 6);

    await db.query(
      `INSERT INTO transactions (id, user_id, type, amount, currency, tx_hash)
       VALUES ($1, $2, 'deposit', $3, $4, $5)`,
      [id, req.user.id, amt, currency.toUpperCase(), txHash.trim()]
    );

    // Notify admin via Socket.IO
    const io = getIO();
    io.to('admin-room').emit('admin:new_deposit', {
      id, username: req.user.username, amount: amt, currency
    });

    return res.status(201).json({ ok: true, depositId: id });
  } catch (err) {
    console.error('Deposit error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/wallet/withdraw ───────────────────────────────────────────────
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, currency, walletAddress } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt < MIN_WITHDRAWAL)
      return res.status(400).json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` });
    if (!currency)
      return res.status(400).json({ error: 'Currency is required' });
    if (!walletAddress || walletAddress.trim().length < 10)
      return res.status(400).json({ error: 'Enter a valid wallet address' });

    // Atomic balance check + deduction
    const result = await db.query(
      `UPDATE users
       SET balance = balance - $1
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [amt, req.user.id]
    );

    if (result.rowCount === 0)
      return res.status(400).json({ error: 'Insufficient balance' });

    const newBalance = parseFloat(result.rows[0].balance);
    const id = 'WDR_' + Date.now() + '_' + uuid().slice(0, 6);

    await db.query(
      `INSERT INTO transactions (id, user_id, type, amount, currency, wallet_address)
       VALUES ($1, $2, 'withdrawal', $3, $4, $5)`,
      [id, req.user.id, amt, currency.toUpperCase(), walletAddress.trim()]
    );

    // Push updated balance to user + notify admin
    const io = getIO();
    io.to(`user-${req.user.id}`).emit('balance:update', { balance: newBalance });
    io.to('admin-room').emit('admin:new_withdrawal', {
      id, username: req.user.username, amount: amt, currency
    });

    return res.status(201).json({ ok: true, withdrawalId: id, newBalance });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/wallet/history ─────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type, amount, currency, tx_hash, wallet_address, status, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ transactions: result.rows });
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
