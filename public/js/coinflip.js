/* ============================================
   CASINO ROYALE — Coin Flip
   ============================================ */

const CoinFlip = (() => {
  let bet = 10;
  let flipping = false;
  let choice = 'heads';

  function init() {
    updateBetDisplay();
    setChoice('heads');
    document.getElementById('coinflip-bet-up')?.addEventListener('click', () => changeBet(10));
    document.getElementById('coinflip-bet-down')?.addEventListener('click', () => changeBet(-10));
    document.getElementById('coinflip-flip-btn')?.addEventListener('click', flip);
  }

  function changeBet(delta) {
    if (flipping) return;
    bet = Math.max(10, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('coinflip-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function setChoice(side) {
    if (flipping) return;
    choice = side;
    document.getElementById('btn-choice-heads').classList.remove('selected');
    document.getElementById('btn-choice-tails').classList.remove('selected');
    document.getElementById(`btn-choice-${side}`).classList.add('selected');
  }

  function flip() {
    if (flipping) return;
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'lose');
      return;
    }

    flipping = true;
    App.updateBalance(-bet);
    setMessage('Flipping...', 'info');

    const flipBtn = document.getElementById('coinflip-flip-btn');
    if (flipBtn) flipBtn.disabled = true;

    // Determine result
    const isHeads = Math.random() < 0.5;
    const resultSide = isHeads ? 'heads' : 'tails';

    // Animate coin
    const coin = document.getElementById('coin-element');
    
    // We want it to spin a lot. 
    // Default heads = 0deg. Tails = 180deg.
    // Let's add 5 full rotations (1800deg) + the target
    const currentRotStr = coin.style.transform.match(/rotateY\(([-\d]+)deg\)/);
    let currentRot = currentRotStr ? parseInt(currentRotStr[1]) : 0;
    
    // Normalize to nearest 0
    let baseSpin = currentRot + 1800; // spin 5 times
    if (resultSide === 'tails') {
      baseSpin += 180; // land on tails
    }
    
    // Ensure it lands on exact side
    // if current baseSpin modulo 360 isn't right, adjust
    if (resultSide === 'heads' && baseSpin % 360 !== 0) {
      baseSpin += (360 - (baseSpin % 360));
    } else if (resultSide === 'tails' && (baseSpin - 180) % 360 !== 0) {
      baseSpin += (360 - ((baseSpin - 180) % 360));
    }

    coin.style.transform = `rotateY(${baseSpin}deg)`;

    // Wait for animation to finish (3s)
    setTimeout(() => {
      if (choice === resultSide) {
        // Win
        const winAmount = bet * 1.95; // 1.95x payout
        App.updateBalance(winAmount);
        setMessage(`It's ${resultSide.toUpperCase()}! You won $${winAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`, 'win');
        App.showWin(winAmount, '🪙 Coin Flip');
      } else {
        // Lose
        setMessage(`It's ${resultSide.toUpperCase()}. You lost!`, 'lose');
        
        // Shake screen
        const gameBody = document.querySelector('#game-coinflip .game-view-body');
        gameBody.classList.remove('shake-screen');
        void gameBody.offsetWidth;
        gameBody.classList.add('shake-screen');
      }

      flipping = false;
      if (flipBtn) flipBtn.disabled = false;
    }, 3000);
  }

  function setMessage(text, type) {
    const el = document.getElementById('coinflip-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { setChoice };
})();
