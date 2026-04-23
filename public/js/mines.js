/* ============================================
   CASINO ROYALE — Mines Game Logic
   ============================================ */

const Mines = (() => {
  let state = {
    playing: false,
    bet: 1,
    minesCount: 3,
    hits: 0,
    grid: [], // true = mine, false = gem
    revealed: [], // false = hidden, true = revealed
    currentMultiplier: 1.0
  };

  const TOTAL_TILES = 25;
  const HOUSE_EDGE = 0.99;

  function init() {
    setupUI();
    document.getElementById('mines-bet-down').addEventListener('click', () => adjustBet(-1));
    document.getElementById('mines-bet-up').addEventListener('click', () => adjustBet(1));
    document.getElementById('mines-count-down').addEventListener('click', () => adjustMines(-1));
    document.getElementById('mines-count-up').addEventListener('click', () => adjustMines(1));
    document.getElementById('mines-play-btn').addEventListener('click', handlePlayAction);
  }

  function setupUI() {
    const gridEl = document.getElementById('mines-grid');
    gridEl.innerHTML = '';
    for (let i = 0; i < TOTAL_TILES; i++) {
      const tile = document.createElement('div');
      tile.className = 'mine-tile';
      tile.dataset.index = i;
      tile.addEventListener('click', () => handleTileClick(i));
      
      const inner = document.createElement('div');
      inner.className = 'mine-tile-inner';
      
      const front = document.createElement('div');
      front.className = 'mine-tile-front';
      
      const back = document.createElement('div');
      back.className = 'mine-tile-back';
      
      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);
      gridEl.appendChild(tile);
    }
    updateControls();
  }

  function adjustBet(delta) {
    if (state.playing) return;
    state.bet = Math.max(1, state.bet + delta);
    document.getElementById('mines-bet-amount').textContent = '$' + state.bet;
  }

  function adjustMines(delta) {
    if (state.playing) return;
    state.minesCount = Math.max(1, Math.min(24, state.minesCount + delta));
    document.getElementById('mines-count-display').textContent = state.minesCount;
    updateNextMultiplier();
  }

  function getMultiplier(mines, hits) {
    if (hits === 0) return 1.0;
    let chance = 1.0;
    let safe = TOTAL_TILES - mines;
    let total = TOTAL_TILES;
    for (let i = 0; i < hits; i++) {
      chance *= (safe / total);
      safe--;
      total--;
    }
    return HOUSE_EDGE * (1 / chance);
  }

  function updateControls() {
    const btn = document.getElementById('mines-play-btn');
    const msg = document.getElementById('mines-message');
    document.getElementById('mines-bet-down').disabled = state.playing;
    document.getElementById('mines-bet-up').disabled = state.playing;
    document.getElementById('mines-count-down').disabled = state.playing;
    document.getElementById('mines-count-up').disabled = state.playing;
    
    if (state.playing) {
      const cashout = (state.bet * state.currentMultiplier).toFixed(2);
      btn.textContent = `CASHOUT $${cashout}`;
      btn.className = 'btn-game btn-success';
      msg.textContent = `Hits: ${state.hits} | Multiplier: ${state.currentMultiplier.toFixed(2)}x`;
      msg.className = 'game-message success';
    } else {
      btn.textContent = 'BET';
      btn.className = 'btn-game btn-danger';
    }
    updateNextMultiplier();
  }

  function updateNextMultiplier() {
    if (state.playing) {
      const nextMult = getMultiplier(state.minesCount, state.hits + 1);
      document.getElementById('mines-next-mult').textContent = `Next: ${nextMult.toFixed(2)}x`;
    } else {
      const firstMult = getMultiplier(state.minesCount, 1);
      document.getElementById('mines-next-mult').textContent = `Next: ${firstMult.toFixed(2)}x`;
    }
  }

  function generateGrid() {
    state.grid = Array(TOTAL_TILES).fill(false);
    state.revealed = Array(TOTAL_TILES).fill(false);
    let placed = 0;
    while (placed < state.minesCount) {
      const idx = Math.floor(Math.random() * TOTAL_TILES);
      if (!state.grid[idx]) {
        state.grid[idx] = true;
        placed++;
      }
    }
    
    // Reset DOM
    document.querySelectorAll('.mine-tile').forEach(t => {
      t.classList.remove('revealed', 'mine', 'gem', 'blown');
      t.querySelector('.mine-tile-back').textContent = '';
    });
  }

  function handlePlayAction() {
    if (!Auth.isLoggedIn()) { App.openModal('signin-modal'); return; }
    
    if (state.playing) {
      // Cashout
      const winAmount = state.bet * state.currentMultiplier;
      App.updateBalance(winAmount);
      App.showWin(winAmount, 'Mines');
      
      const msg = document.getElementById('mines-message');
      msg.textContent = `You cashed out $${winAmount.toFixed(2)}!`;
      msg.className = 'game-message success';
      
      endRound(false);
    } else {
      // Start bet
      if (App.getBalance() < state.bet) {
        const err = document.getElementById('mines-message');
        err.textContent = 'Insufficient balance!';
        err.className = 'game-message error';
        return;
      }
      
      App.updateBalance(-state.bet);
      state.playing = true;
      state.hits = 0;
      state.currentMultiplier = 1.0;
      generateGrid();
      updateControls();
    }
  }

  function handleTileClick(index) {
    if (!state.playing || state.revealed[index]) return;
    
    state.revealed[index] = true;
    const tile = document.querySelector(`.mine-tile[data-index="${index}"]`);
    const back = tile.querySelector('.mine-tile-back');
    
    tile.classList.add('revealed');
    
    if (state.grid[index]) {
      // Hit a mine!
      tile.classList.add('blown');
      back.textContent = '💣';
      const msg = document.getElementById('mines-message');
      msg.textContent = `Boom! You hit a mine and lost $${state.bet}.`;
      msg.className = 'game-message error';
      
      const gameBody = document.querySelector('#game-mines .game-view-body');
      gameBody.classList.remove('shake-screen');
      void gameBody.offsetWidth;
      gameBody.classList.add('shake-screen');

      endRound(true);
    } else {
      // Safe
      tile.classList.add('gem');
      back.textContent = '💎';
      state.hits++;
      state.currentMultiplier = getMultiplier(state.minesCount, state.hits);
      
      // Auto cashout if all safe gems are revealed
      if (state.hits === TOTAL_TILES - state.minesCount) {
        const winAmount = state.bet * state.currentMultiplier;
        App.updateBalance(winAmount);
        App.showWin(winAmount, 'Mines');
        const msg = document.getElementById('mines-message');
        msg.textContent = `Perfect clear! You won $${winAmount.toFixed(2)}!`;
        msg.className = 'game-message success';
        endRound(false);
      } else {
        updateControls();
      }
    }
  }

  function endRound(lost) {
    state.playing = false;
    // Reveal all remaining
    for (let i = 0; i < TOTAL_TILES; i++) {
      if (!state.revealed[i]) {
        const t = document.querySelector(`.mine-tile[data-index="${i}"]`);
        const back = t.querySelector('.mine-tile-back');
        if (state.grid[i]) {
          t.classList.add('revealed', 'mine');
          back.textContent = '💣';
          t.style.opacity = '0.5';
        } else {
          t.classList.add('revealed', 'gem');
          back.textContent = '💎';
          t.style.opacity = '0.5';
        }
      }
    }
    updateControls();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { getMultiplier };
})();
