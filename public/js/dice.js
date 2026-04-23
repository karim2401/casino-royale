/* ============================================
   CASINO ROYALE — Crypto Dice Game
   ============================================ */

const Dice = (() => {
  let bet = 1;
  let winChance = 49.5;
  let rolling = false;

  const HOUSE_EDGE = 0.99;

  function init() {
    updateBetDisplay();
    updateDiceStats();
    
    document.getElementById('dice-roll')?.addEventListener('click', roll);
    document.getElementById('dice-bet-up')?.addEventListener('click', () => changeBet(1));
    document.getElementById('dice-bet-down')?.addEventListener('click', () => changeBet(-1));
    
    const slider = document.getElementById('dice-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        winChance = parseFloat(e.target.value);
        updateDiceStats();
      });
    }

    setMessage('Set your win chance and roll!', 'neutral');
  }

  function changeBet(delta) {
    if (rolling) return;
    bet = Math.max(1, bet + delta);
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('dice-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function getPayoutMultiplier() {
    return HOUSE_EDGE * (100 / winChance);
  }

  function updateDiceStats() {
    const multDisplay = document.getElementById('dice-multiplier');
    const chanceDisplay = document.getElementById('dice-chance');
    const targetDisplay = document.getElementById('dice-target');
    
    if (multDisplay) multDisplay.textContent = getPayoutMultiplier().toFixed(2) + '×';
    if (chanceDisplay) chanceDisplay.textContent = winChance.toFixed(2) + '%';
    if (targetDisplay) targetDisplay.textContent = 'Under ' + winChance.toFixed(2);
  }

  function roll() {
    if (rolling) return;
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'error');
      return;
    }

    rolling = true;
    App.updateBalance(-bet);

    const rollBtn = document.getElementById('dice-roll');
    if (rollBtn) rollBtn.disabled = true;

    // Roll logic (0.00 to 100.00)
    const result = Math.random() * 100;
    
    // Animate
    const resultEl = document.getElementById('dice-result');
    if (resultEl) {
      resultEl.classList.add('rolling');
      setMessage('Rolling...', 'info');
      
      let ticks = 0;
      const interval = setInterval(() => {
        resultEl.textContent = (Math.random() * 100).toFixed(2);
        ticks++;
        if (ticks > 20) {
          clearInterval(interval);
          finishRoll(result, rollBtn, resultEl);
        }
      }, 40);
    } else {
      finishRoll(result, rollBtn, null);
    }
  }

  function finishRoll(result, rollBtn, resultEl) {
    if (resultEl) {
      resultEl.classList.remove('rolling');
      resultEl.textContent = result.toFixed(2);
    }

    const won = result < winChance;
    
    if (won) {
      if (resultEl) {
        resultEl.style.color = 'var(--clr-green)';
        setTimeout(() => resultEl.style.color = '', 2000);
      }
      const winAmount = bet * getPayoutMultiplier();
      App.updateBalance(winAmount);
      setMessage(`Hit! Rolled ${result.toFixed(2)}. +$${winAmount.toFixed(2)}`, 'success');
      App.showWin(winAmount, 'Dice');
    } else {
      if (resultEl) {
        resultEl.style.color = 'var(--clr-red)';
        setTimeout(() => resultEl.style.color = '', 2000);
      }
      setMessage(`Miss! Rolled ${result.toFixed(2)}. You lost $${bet.toFixed(2)}`, 'error');
    }

    rolling = false;
    if (rollBtn) rollBtn.disabled = false;
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
