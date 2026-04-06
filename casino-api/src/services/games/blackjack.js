/**
 * Blackjack — server-side game engine (6-deck shoe)
 *
 * Session state is stored IN MEMORY per user (Map).
 * For a production multi-instance deployment, swap the Map for Redis.
 *
 * Actions:  deal | hit | stand | double
 * Returns:  { state, result?, payout?, net? }
 */

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

// In-memory game sessions: userId → session object
const sessions = new Map();

// ─── Deck helpers ────────────────────────────────────────────────────────────
function buildShoe() {
  const shoe = [];
  for (let d = 0; d < 6; d++)
    for (const s of SUITS)
      for (const r of RANKS)
        shoe.push({ rank: r, suit: s });
  return shuffle(shoe);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardValue(card) {
  if (['J','Q','K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces  = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function draw(shoe) {
  if (shoe.length < 30) {
    // splice in a fresh shuffled shoe
    shoe.push(...buildShoe());
  }
  return shoe.pop();
}

// ─── deal ────────────────────────────────────────────────────────────────────
function deal(userId, bet) {
  let session = sessions.get(userId) || { shoe: buildShoe() };

  const shoe        = session.shoe;
  const playerHand  = [draw(shoe), draw(shoe)];
  const dealerHand  = [draw(shoe), draw(shoe)];

  const playerVal = handValue(playerHand);
  const dealerVal = handValue(dealerHand);

  const newSession = {
    shoe,
    bet,
    playerHand,
    dealerHand,
    doubled: false,
    status: 'active',
  };

  // Immediate blackjack check
  if (playerVal === 21) {
    if (dealerVal === 21) {
      newSession.status = 'push';
    } else {
      newSession.status = 'blackjack';
    }
  }

  sessions.set(userId, newSession);

  const finished = newSession.status !== 'active';
  if (finished) {
    const { payout, net } = resolvePayouts(newSession);
    return { state: publicState(newSession, true), result: newSession.status, payout, net };
  }

  return { state: publicState(newSession, false) };
}

// ─── hit ─────────────────────────────────────────────────────────────────────
function hit(userId) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'active')
    return { error: 'No active game' };

  session.playerHand.push(draw(session.shoe));
  const val = handValue(session.playerHand);

  if (val > 21) {
    session.status = 'bust';
    const { payout, net } = resolvePayouts(session);
    return { state: publicState(session, true), result: 'bust', payout, net };
  }
  if (val === 21) {
    return stand(userId); // auto-stand on 21
  }

  return { state: publicState(session, false) };
}

// ─── stand ───────────────────────────────────────────────────────────────────
function stand(userId) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'active')
    return { error: 'No active game' };

  // Dealer draws to 17+
  while (handValue(session.dealerHand) < 17) {
    session.dealerHand.push(draw(session.shoe));
  }

  const pv = handValue(session.playerHand);
  const dv = handValue(session.dealerHand);

  if (dv > 21)          session.status = 'dealer-bust';
  else if (pv > dv)     session.status = 'win';
  else if (pv < dv)     session.status = 'lose';
  else                  session.status = 'push';

  const { payout, net } = resolvePayouts(session);
  return { state: publicState(session, true), result: session.status, payout, net };
}

// ─── double down ──────────────────────────────────────────────────────────────
function doubleDown(userId) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'active')
    return { error: 'No active game' };
  if (session.playerHand.length !== 2)
    return { error: 'Can only double on first two cards' };

  session.bet     *= 2;
  session.doubled  = true;
  session.playerHand.push(draw(session.shoe));

  const val = handValue(session.playerHand);
  if (val > 21) {
    session.status = 'bust';
    const { payout, net } = resolvePayouts(session);
    return { state: publicState(session, true), result: 'bust', payout, net };
  }

  return stand(userId); // forced stand after double
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function resolvePayouts(session) {
  let payout = 0;
  const bet  = session.bet;

  switch (session.status) {
    case 'blackjack':   payout = Math.floor(bet * 2.5); break;
    case 'win':
    case 'dealer-bust': payout = bet * 2; break;
    case 'push':        payout = bet;     break;
    default:            payout = 0;       break;  // bust / lose
  }

  const net = payout - bet;
  return { payout, net };
}

function publicState(session, revealDealer) {
  return {
    playerHand:  session.playerHand,
    dealerHand:  revealDealer ? session.dealerHand : [session.dealerHand[0], { rank: '?', suit: '?' }],
    playerValue: handValue(session.playerHand),
    dealerValue: revealDealer ? handValue(session.dealerHand) : cardValue(session.dealerHand[0]),
    bet:         session.bet,
    doubled:     session.doubled,
    status:      session.status,
  };
}

function clearSession(userId) {
  sessions.delete(userId);
}

module.exports = { deal, hit, stand, doubleDown, clearSession };
