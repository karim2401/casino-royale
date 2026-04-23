/* ============================================
   CASINO ROYALE — Slot Machine
   ============================================ */

const Slots = (() => {
  const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '⭐'];
  const PAYOUTS = {
    '🍒🍒🍒': 5,
    '🍋🍋🍋': 8,
    '🔔🔔🔔': 12,
    '💎💎💎': 20,
    '7️⃣7️⃣7️⃣': 50,
    '⭐⭐⭐': 100
  };

  let bet = 100;
  let spinning = false;
  let reelResults = ['🍒', '🍒', '🍒'];

  function init() {
    renderReels();
    updateBetDisplay();
    document.getElementById('slots-spin')?.addEventListener('click', spin);
    document.getElementById('slots-bet-up')?.addEventListener('click', () => changeBet(100));
    document.getElementById('slots-bet-down')?.addEventListener('click', () => changeBet(-100));
  }

  function changeBet(delta) {
    bet = Math.max(100, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('slots-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function renderReels() {
    for (let i = 0; i < 3; i++) {
      const reel = document.getElementById(`reel-${i}`);
      if (reel) {
        reel.innerHTML = `<div class="slot-symbol">${reelResults[i]}</div>`;
      }
    }
  }

  function spin() {
    if (spinning) return;
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'lose');
      return;
    }

    spinning = true;
    App.updateBalance(-bet);
    setMessage('Spinning...', 'info');

    const spinBtn = document.getElementById('slots-spin');
    if (spinBtn) spinBtn.disabled = true;

    // Remove previous winning states
    document.querySelectorAll('.slot-reel').forEach(r => r.classList.remove('winning'));

    // Generate results
    reelResults = [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

    // Animate each reel with staggered timing
    const reelEls = [0, 1, 2].map(i => document.getElementById(`reel-${i}`));
    const spinDurations = [1200, 1600, 2000];

    reelEls.forEach((reel, i) => {
      if (!reel) return;

      // Create spinning symbols
      let html = '';
      const totalFakeSymbols = 15 + i * 5;
      for (let s = 0; s < totalFakeSymbols; s++) {
        html += `<div class="slot-symbol">${SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}</div>`;
      }
      html += `<div class="slot-symbol">${reelResults[i]}</div>`;
      reel.innerHTML = html;

      // Animate
      const symbolHeight = reel.parentElement.offsetHeight || 130;
      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0)';

      requestAnimationFrame(() => {
        reel.style.transition = `transform ${spinDurations[i]}ms cubic-bezier(0.15, 0.85, 0.35, 1)`;
        reel.style.transform = `translateY(-${totalFakeSymbols * symbolHeight}px)`;
      });
    });

    // Check results after animation
    setTimeout(() => {
      renderReels();
      const key = reelResults.join('');
      const multiplier = PAYOUTS[key];

      if (multiplier) {
        const winAmount = bet * multiplier;
        App.updateBalance(winAmount);
        setMessage(`🎉 ${reelResults[0]}${reelResults[1]}${reelResults[2]} — You win $${winAmount.toLocaleString()}!`, 'win');
        document.querySelectorAll('.slot-reel').forEach(r => r.classList.add('winning'));
        if (multiplier >= 20) {
          App.showWin(winAmount, '🎰 Slots');
        }
      } else if (reelResults[0] === reelResults[1] || reelResults[1] === reelResults[2]) {
        // Two matching — small win
        const smallWin = Math.floor(bet * 0.5);
        App.updateBalance(smallWin);
        setMessage(`${reelResults[0]}${reelResults[1]}${reelResults[2]} — Partial match! +$${smallWin}`, 'win');
      } else {
        setMessage(`${reelResults[0]}${reelResults[1]}${reelResults[2]} — No luck this time.`, 'lose');
      }

      spinning = false;
      if (spinBtn) spinBtn.disabled = false;
      updateBetDisplay();
    }, 2200);
  }

  function setMessage(text, type) {
    const el = document.getElementById('slots-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { spin };
})();
