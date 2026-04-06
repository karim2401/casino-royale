const express    = require('express');
const db         = require('../db');
const { authenticate } = require('../middleware/auth');
const { gameLimiter }  = require('../middleware/rateLimit');
const { getIO }        = require('../services/socket');
const slots      = require('../services/games/slots');
const dice       = require('../services/games/dice');
const roulette   = require('../services/games/roulette');
const blackjack  = require('../services/games/blackjack');

const router = express.Router();

router.use(authenticate);
router.use(gameLimiter);

// ─── Shared helpers ───────────────────────────────────────────────────────────
/**
 * Deduct bet, resolve payout, persist game_round, push socket event.
 * Returns { newBalance } or throws if insufficient funds.
 */
async function resolveGame(userId, username, game, bet, net, resultData) {
  // Atomic: deduct bet, add payout (net can be negative or positive)
  const result = await db.query(
    `UPDATE users
     SET balance = balance + $1
     WHERE id = $2 AND balance >= $3
     RETURNING balance`,
    [net, userId, bet]   // net = payout - bet; we also need balance >= bet to play
  );

  if (result.rowCount === 0) throw new Error('Insufficient balance');

  const newBalance = parseFloat(result.rows[0].balance);

  // Persist round
  await db.query(
    `INSERT INTO game_rounds (user_id, game, bet_amount, win_amount, result_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, game, bet, net, JSON.stringify(resultData)]
  );

  // Push real-time balance update to this user
  const io = getIO();
  io.to(`user-${userId}`).emit('balance:update', { balance: newBalance });

  // If win was significant, maybe update leaderboard for everyone
  if (net > 0) {
    const leaderboard = await db.query(
      `SELECT u.username, gr.game, gr.win_amount, gr.bet_amount, gr.created_at
       FROM game_rounds gr
       JOIN users u ON u.id = gr.user_id
       WHERE gr.win_amount > 0 AND u.is_banned = FALSE
       ORDER BY gr.win_amount DESC LIMIT 10`
    );
    io.emit('leaderboard:update', leaderboard.rows);
  }

  return { newBalance };
}

// ─── POST /api/games/slots/spin ───────────────────────────────────────────────
router.post('/slots/spin', async (req, res) => {
  try {
    const bet = parseFloat(req.body.bet);
    if (!bet || bet < 1) return res.status(400).json({ error: 'Minimum bet is $1' });

    const outcome = slots.spin(bet);
    const { newBalance } = await resolveGame(
      req.user.id, req.user.username, 'slots', bet, outcome.net, outcome
    );

    return res.json({ ...outcome, newBalance });
  } catch (err) {
    if (err.message === 'Insufficient balance')
      return res.status(400).json({ error: 'Insufficient balance' });
    console.error('Slots error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/games/dice/roll ────────────────────────────────────────────────
router.post('/dice/roll', async (req, res) => {
  try {
    const bet        = parseFloat(req.body.bet);
    const prediction = req.body.prediction; // 'under' | 'seven' | 'over'
    if (!bet || bet < 1) return res.status(400).json({ error: 'Minimum bet is $1' });
    if (!['under','seven','over'].includes(prediction))
      return res.status(400).json({ error: 'Invalid prediction' });

    const outcome = dice.roll(bet, prediction);
    const { newBalance } = await resolveGame(
      req.user.id, req.user.username, 'dice', bet, outcome.net, outcome
    );

    return res.json({ ...outcome, newBalance });
  } catch (err) {
    if (err.message === 'Insufficient balance')
      return res.status(400).json({ error: 'Insufficient balance' });
    console.error('Dice error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/games/roulette/spin ────────────────────────────────────────────
router.post('/roulette/spin', async (req, res) => {
  try {
    const bet      = parseFloat(req.body.bet);
    const betType  = req.body.betType;
    const betValue = req.body.betValue ?? null;
    if (!bet || bet < 1) return res.status(400).json({ error: 'Minimum bet is $1' });
    if (!betType) return res.status(400).json({ error: 'betType is required' });

    const outcome = roulette.spin(bet, betType, betValue);
    const { newBalance } = await resolveGame(
      req.user.id, req.user.username, 'roulette', bet, outcome.net, outcome
    );

    return res.json({ ...outcome, newBalance });
  } catch (err) {
    if (err.message === 'Insufficient balance')
      return res.status(400).json({ error: 'Insufficient balance' });
    console.error('Roulette error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/games/blackjack/deal ──────────────────────────────────────────
router.post('/blackjack/deal', async (req, res) => {
  try {
    const bet = parseFloat(req.body.bet);
    if (!bet || bet < 5) return res.status(400).json({ error: 'Minimum blackjack bet is $5' });

    // Check balance first (before deducting — deduction happens on game end)
    const balResult = await db.query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
    if (parseFloat(balResult.rows[0]?.balance) < bet)
      return res.status(400).json({ error: 'Insufficient balance' });

    // Reserve bet (deduct immediately)
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [bet, req.user.id]);

    const outcome = blackjack.deal(req.user.id, bet);

    // If game ended immediately (blackjack / push), finalise now
    if (outcome.result) {
      const payoutResult = await db.query(
        `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
        [outcome.payout, req.user.id]
      );
      const newBalance = parseFloat(payoutResult.rows[0].balance);
      await db.query(
        `INSERT INTO game_rounds (user_id, game, bet_amount, win_amount, result_data)
         VALUES ($1, 'blackjack', $2, $3, $4)`,
        [req.user.id, bet, outcome.net, JSON.stringify(outcome.state)]
      );
      blackjack.clearSession(req.user.id);
      getIO().to(`user-${req.user.id}`).emit('balance:update', { balance: newBalance });
      return res.json({ ...outcome, newBalance });
    }

    return res.json(outcome);
  } catch (err) {
    console.error('BJ deal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/games/blackjack/action ────────────────────────────────────────
router.post('/blackjack/action', async (req, res) => {
  try {
    const { action } = req.body; // 'hit' | 'stand' | 'double'
    let outcome;

    if (action === 'hit')    outcome = blackjack.hit(req.user.id);
    else if (action === 'stand') outcome = blackjack.stand(req.user.id);
    else if (action === 'double') {
      // Reserve extra bet before double
      // (we allow the engine to double the bet in session, then we sync DB at end)
      outcome = blackjack.doubleDown(req.user.id);
    } else {
      return res.status(400).json({ error: 'action must be hit | stand | double' });
    }

    if (outcome.error) return res.status(400).json({ error: outcome.error });

    // If the game finished, sync DB
    if (outcome.result) {
      const betForRound = outcome.state.bet; // may be doubled
      const extraDeduction = action === 'double' ? betForRound / 2 : 0;

      if (extraDeduction > 0) {
        // Deduct the extra half bet for double
        const balCheck = await db.query(
          'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
          [extraDeduction, req.user.id]
        );
        if (balCheck.rowCount === 0) {
          blackjack.clearSession(req.user.id);
          return res.status(400).json({ error: 'Insufficient balance to double' });
        }
      }

      const payoutResult = await db.query(
        `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
        [outcome.payout, req.user.id]
      );
      const newBalance = parseFloat(payoutResult.rows[0].balance);

      await db.query(
        `INSERT INTO game_rounds (user_id, game, bet_amount, win_amount, result_data)
         VALUES ($1, 'blackjack', $2, $3, $4)`,
        [req.user.id, betForRound, outcome.net, JSON.stringify(outcome.state)]
      );

      blackjack.clearSession(req.user.id);
      getIO().to(`user-${req.user.id}`).emit('balance:update', { balance: newBalance });

      if (outcome.net > 0) {
        const lb = await db.query(
          `SELECT u.username, gr.game, gr.win_amount FROM game_rounds gr
           JOIN users u ON u.id = gr.user_id WHERE gr.win_amount > 0 AND u.is_banned=FALSE
           ORDER BY gr.win_amount DESC LIMIT 10`
        );
        getIO().emit('leaderboard:update', lb.rows);
      }

      return res.json({ ...outcome, newBalance });
    }

    return res.json(outcome);
  } catch (err) {
    console.error('BJ action error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/games/leaderboard ───────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.username, gr.game, gr.win_amount, gr.bet_amount, gr.created_at
       FROM game_rounds gr
       JOIN users u ON u.id = gr.user_id
       WHERE gr.win_amount > 0 AND u.is_banned = FALSE
       ORDER BY gr.win_amount DESC LIMIT 10`
    );
    return res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
