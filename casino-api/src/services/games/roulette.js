/**
 * Roulette — server-side RNG (European: 0-36)
 *
 * Bet types supported:
 *   number    — exact number (0–36)     → 36×
 *   red/black — colour                  → 2×
 *   odd/even  — parity                  → 2×
 *   low/high  — 1-18 / 19-36           → 2×
 *   dozen     — 1-12 / 13-24 / 25-36   → 3×
 *   column    — col1 / col2 / col3      → 3×
 */

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

/**
 * @param {number}  bet
 * @param {string}  betType   e.g. 'red', 'even', 'number', 'dozen1', 'col2'
 * @param {number|null} betValue  required when betType === 'number'
 */
function spin(bet, betType, betValue = null) {
  const pocket = Math.floor(Math.random() * 37); // 0-36

  const isRed   = RED_NUMBERS.has(pocket);
  const isBlack = pocket !== 0 && !isRed;
  const isOdd   = pocket !== 0 && pocket % 2 !== 0;
  const isEven  = pocket !== 0 && pocket % 2 === 0;
  const isLow   = pocket >= 1  && pocket <= 18;
  const isHigh  = pocket >= 19 && pocket <= 36;
  const dozen   = pocket === 0 ? 0 : Math.ceil(pocket / 12);  // 1|2|3
  const column  = pocket === 0 ? 0 : ((pocket - 1) % 3) + 1; // 1|2|3

  let multiplier = 0;

  switch (betType) {
    case 'number':
      if (parseInt(betValue) === pocket) multiplier = 36;
      break;
    case 'red':    if (isRed)              multiplier = 2; break;
    case 'black':  if (isBlack)            multiplier = 2; break;
    case 'odd':    if (isOdd)              multiplier = 2; break;
    case 'even':   if (isEven)             multiplier = 2; break;
    case 'low':    if (isLow)              multiplier = 2; break;
    case 'high':   if (isHigh)             multiplier = 2; break;
    case 'dozen1': if (dozen === 1)        multiplier = 3; break;
    case 'dozen2': if (dozen === 2)        multiplier = 3; break;
    case 'dozen3': if (dozen === 3)        multiplier = 3; break;
    case 'col1':   if (column === 1)       multiplier = 3; break;
    case 'col2':   if (column === 2)       multiplier = 3; break;
    case 'col3':   if (column === 3)       multiplier = 3; break;
    default:       multiplier = 0;
  }

  const payout = multiplier > 0 ? bet * multiplier : 0;
  const net    = payout - bet;
  const color  = pocket === 0 ? 'green' : isRed ? 'red' : 'black';

  return { pocket, color, isRed, isBlack, multiplier, payout, net, win: multiplier > 0 };
}

module.exports = { spin };
