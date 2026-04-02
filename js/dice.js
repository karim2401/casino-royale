/* ============================================
   CASINO ROYALE — Dice Game
   ============================================ */

const Dice = (() => {
  let bet = 100;
  let prediction = null; // 'over' | 'under' | 'seven'
  let rolling = false;

  function init() {
    updateBetDisplay();
    document.getElementById('dice-roll')?.addEventListener('click', roll);
    document.getElementById('dice-bet-up')?.addEventListener('click', () => changeBet(50));
    document.getElementById('dice-bet-down')?.addEventListener('click', () => changeBet(-50));

    document.querySelectorAll('.dice-pred-btn').forEach(btn => {
      btn.addEventListener('click', () => selectPrediction(btn));
    });

    setMessage('Select a prediction, then roll!', 'neutral');
  }

  function changeBet(delta) {
    bet = Math.max(50, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('dice-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function selectPrediction(btn) {
    if (rolling) return;
    document.querySelectorAll('.dice-pred-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    prediction = btn.dataset.prediction;
    setMessage(`Betting on ${getPredictionLabel(prediction)}. Roll!`, 'info');
  }

  function getPredictionLabel(pred) {
    switch (pred) {
      case 'under': return 'Under 7 (2×)';
      case 'over': return 'Over 7 (2×)';
      case 'seven': return 'Exactly 7 (5×)';
      default: return '';
    }
  }

  function roll() {
    if (rolling) return;
    if (!prediction) {
      setMessage('Select a prediction first!', 'lose');
      return;
    }
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'lose');
      return;
    }

    rolling = true;
    App.updateBalance(-bet);

    const rollBtn = document.getElementById('dice-roll');
    if (rollBtn) rollBtn.disabled = true;

    // Roll dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    // Animate dice
    const dieEl1 = document.getElementById('die-1');
    const dieEl2 = document.getElementById('die-2');
    const totalEl = document.getElementById('dice-total');

    if (dieEl1) dieEl1.classList.add('rolling');
    if (dieEl2) dieEl2.classList.add('rolling');
    if (totalEl) totalEl.textContent = '...';
    setMessage('Rolling...', 'info');

    // Quick visual roll
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      if (dieEl1) dieEl1.textContent = Math.floor(Math.random() * 6) + 1;
      if (dieEl2) dieEl2.textContent = Math.floor(Math.random() * 6) + 1;
      rollCount++;
      if (rollCount > 15) {
        clearInterval(rollInterval);
        showResult(die1, die2, total);
      }
    }, 80);
  }

  function showResult(die1, die2, total) {
    const dieEl1 = document.getElementById('die-1');
    const dieEl2 = document.getElementById('die-2');
    const totalEl = document.getElementById('dice-total');
    const rollBtn = document.getElementById('dice-roll');

    if (dieEl1) { dieEl1.textContent = die1; dieEl1.classList.remove('rolling'); }
    if (dieEl2) { dieEl2.textContent = die2; dieEl2.classList.remove('rolling'); }
    if (totalEl) totalEl.textContent = `Total: ${total}`;

    // Evaluate
    let won = false;
    let multiplier = 0;

    if (prediction === 'under' && total < 7) { won = true; multiplier = 2; }
    else if (prediction === 'over' && total > 7) { won = true; multiplier = 2; }
    else if (prediction === 'seven' && total === 7) { won = true; multiplier = 5; }

    if (won) {
      const winAmount = bet * multiplier;
      App.updateBalance(winAmount);
      setMessage(`🎲 ${total}! ${getPredictionLabel(prediction)} wins! +$${winAmount.toLocaleString()}`, 'win');
      if (winAmount >= 500) App.showWin(winAmount, '🎲 Dice');
    } else {
      setMessage(`🎲 ${total}. ${getPredictionLabel(prediction)} doesn't hit. -$${bet.toLocaleString()}`, 'lose');
    }

    rolling = false;
    if (rollBtn) rollBtn.disabled = false;
    updateBetDisplay();
  }

  function setMessage(text, type) {
    const el = document.getElementById('dice-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { roll };
})();
