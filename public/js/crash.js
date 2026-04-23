/* ============================================
   CASINO ROYALE — Crash Game
   ============================================ */

const Crash = (() => {
  let bet = 10;
  let playing = false;
  let crashed = false;
  let currentMultiplier = 1.00;
  let crashPoint = 1.00;
  let interval = null;

  function init() {
    updateBetDisplay();
    document.getElementById('crash-bet-up')?.addEventListener('click', () => changeBet(10));
    document.getElementById('crash-bet-down')?.addEventListener('click', () => changeBet(-10));
    document.getElementById('crash-action-btn')?.addEventListener('click', handleAction);
  }

  function changeBet(delta) {
    if (playing) return;
    bet = Math.max(10, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('crash-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function generateCrashPoint() {
    // 1% instant crash chance
    if (Math.random() < 0.01) return 1.00;
    // Standard crash distribution (inverse curve)
    let p = Math.max(1.01, 0.99 / (1 - Math.random()));
    // Cap at 1000x for safety
    return Math.min(1000.00, p);
  }

  function handleAction() {
    if (!playing) {
      startGame();
    } else if (!crashed) {
      cashOut();
    }
  }

  function startGame() {
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'lose');
      return;
    }

    // Reset UI
    const multEl = document.getElementById('crash-multiplier');
    multEl.className = 'crash-multiplier';
    multEl.textContent = '1.00x';
    document.getElementById('crash-graph-area').className = 'crash-graph-area';
    
    App.updateBalance(-bet);
    setMessage('Multiplier rising...', 'info');
    
    const actionBtn = document.getElementById('crash-action-btn');
    actionBtn.textContent = 'Cash Out';
    actionBtn.className = 'btn-game btn-primary';

    playing = true;
    crashed = false;
    currentMultiplier = 1.00;
    crashPoint = generateCrashPoint();
    
    // Animation loop
    let startTime = Date.now();
    
    interval = setInterval(() => {
      // The longer it runs, the faster it grows
      let elapsedMs = Date.now() - startTime;
      // Formula: e^(t * rate) - 1 + 1.00
      // 0.00005 rate means it reaches 2.0x in ~14 seconds
      currentMultiplier = Math.exp(elapsedMs * 0.00005);

      if (currentMultiplier >= crashPoint) {
        currentMultiplier = crashPoint;
        crash();
      }

      multEl.textContent = currentMultiplier.toFixed(2) + 'x';
    }, 50);
  }

  function cashOut() {
    if (!playing || crashed) return;
    
    clearInterval(interval);
    playing = false;

    const winAmount = bet * currentMultiplier;
    App.updateBalance(winAmount);
    
    const multEl = document.getElementById('crash-multiplier');
    multEl.classList.add('won');
    
    setMessage(`Cashed out at ${currentMultiplier.toFixed(2)}x! +$${winAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`, 'win');
    
    const actionBtn = document.getElementById('crash-action-btn');
    actionBtn.textContent = 'Place Bet';
    actionBtn.className = 'btn-game btn-danger';
    
    App.showWin(winAmount, '📈 Crash');
  }

  function crash() {
    clearInterval(interval);
    playing = false;
    crashed = true;

    const multEl = document.getElementById('crash-multiplier');
    multEl.classList.add('crashed');
    multEl.textContent = `Bust @ ${currentMultiplier.toFixed(2)}x`;
    
    const graphArea = document.getElementById('crash-graph-area');
    graphArea.classList.add('explode-red');
    
    // Screen shake
    const gameBody = document.querySelector('#game-crash .game-view-body');
    gameBody.classList.remove('shake-screen');
    void gameBody.offsetWidth; // trigger reflow
    gameBody.classList.add('shake-screen');

    setMessage('Crashed!', 'lose');
    
    const actionBtn = document.getElementById('crash-action-btn');
    actionBtn.textContent = 'Place Bet';
    actionBtn.className = 'btn-game btn-danger';
  }

  function setMessage(text, type) {
    const el = document.getElementById('crash-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {};
})();
