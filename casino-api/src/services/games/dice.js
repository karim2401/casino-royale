/**
 * Dice — server-side RNG
 *
 * Payout:
 *   Under 7 (2-6)  → 2×
 *   Exactly 7      → 5×
 *   Over 7 (8-12)  → 2×
 */

/**
 * @param {number} bet
 * @param {'under' | 'seven' | 'over'} prediction
 * @returns {{ die1, die2, total, win: boolean, payout, net, resultLabel }}
 */
function roll(bet, prediction) {
  const die1  = Math.floor(Math.random() * 6) + 1;
  const die2  = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;

  let playerWins = false;
  if (prediction === 'under' && total < 7)  playerWins = true;
  if (prediction === 'seven' && total === 7) playerWins = true;
  if (prediction === 'over'  && total > 7)   playerWins = true;

  const multiplier = prediction === 'seven' ? 5 : 2;
  const payout     = playerWins ? bet * multiplier : 0;
  const net        = payout - bet;

  const labels = { under: 'Under 7', seven: 'Exactly 7', over: 'Over 7' };
  const resultLabel = `${labels[prediction]} — Rolled ${total} (${die1}+${die2}) — ${playerWins ? `Win ×${multiplier}` : 'Lose'}`;

  return { die1, die2, total, win: playerWins, payout, net, resultLabel };
}

module.exports = { roll };
