/**
 * Slots — server-side RNG
 *
 * Payout table:
 *   ⭐⭐⭐  100×   7️⃣7️⃣7️⃣   50×   💎💎💎  20×
 *   🔔🔔🔔   12×   🍋🍋🍋    8×   🍒🍒🍒   5×
 *   Any two matching: 0.5× (returns half bet)
 *   All different:    0   (lose)
 */
const SYMBOLS = ['⭐', '7️⃣', '💎', '🔔', '🍋', '🍒'];
const WEIGHTS  = [  1,    2,    4,    8,   14,   20]; // lower weight = rarer

const THREE_MATCH = {
  '⭐': 100, '7️⃣': 50, '💎': 20,
  '🔔': 12,  '🍋': 8,  '🍒': 5,
};

const TOTAL_WEIGHT = WEIGHTS.reduce((s, w) => s + w, 0);

function weightedRandom() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

/**
 * @param {number} bet
 * @returns {{ reels: string[], multiplier: number, payout: number, resultLabel: string }}
 */
function spin(bet) {
  const reels = [weightedRandom(), weightedRandom(), weightedRandom()];
  const [a, b, c] = reels;

  let multiplier = 0;
  let resultLabel = 'No win';

  if (a === b && b === c) {
    multiplier  = THREE_MATCH[a] ?? 5;
    resultLabel = `Three ${a} — ${multiplier}×`;
  } else if (a === b || b === c || a === c) {
    multiplier  = 0.5;
    resultLabel = 'Two matching — 0.5×';
  }

  const payout = Math.floor(bet * multiplier); // integer payout
  // net delta: payout - bet (negative = net loss, positive = net win)
  const net    = payout - bet;

  return { reels, multiplier, payout, net, resultLabel };
}

module.exports = { spin };
