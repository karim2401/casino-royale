/* ============================================
   CASINO ROYALE — Roulette
   ============================================ */

const Roulette = (() => {
  // European roulette: 0-36
  const NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
    11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
    22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  let bet = 100;
  let bets = []; // { type: 'number'|'red'|'black'|'odd'|'even'|'1-18'|'19-36'|'dozen1'|'dozen2'|'dozen3', value?: number }
  let spinning = false;
  let currentRotation = 0;

  function init() {
    buildBettingBoard();
    updateBetDisplay();
    document.getElementById('roulette-spin')?.addEventListener('click', spin);
    document.getElementById('roulette-clear')?.addEventListener('click', clearBets);
    document.getElementById('roulette-bet-up')?.addEventListener('click', () => changeBet(50));
    document.getElementById('roulette-bet-down')?.addEventListener('click', () => changeBet(-50));
  }

  function isRed(num) { return RED_NUMBERS.includes(num); }

  function changeBet(delta) {
    bet = Math.max(50, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('roulette-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function buildBettingBoard() {
    const board = document.getElementById('roulette-board');
    if (!board) return;

    let html = '';
    // Zero
    html += `<div class="roulette-bet-cell green" data-bet-type="number" data-bet-value="0" style="grid-column: 1; grid-row: 1 / span 3;">0</div>`;

    // Numbers 1-36
    for (let num = 1; num <= 36; num++) {
      const col = Math.ceil(num / 3) + 1;
      const row = 3 - ((num - 1) % 3);
      const color = isRed(num) ? 'red' : 'black';
      html += `<div class="roulette-bet-cell ${color}" data-bet-type="number" data-bet-value="${num}" style="grid-column: ${col}; grid-row: ${row};">${num}</div>`;
    }

    // Outside bets - bottom row
    html += `<div class="roulette-bet-cell outside" data-bet-type="dozen1" style="grid-column: 2 / span 4; grid-row: 4;">1st 12</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="dozen2" style="grid-column: 6 / span 4; grid-row: 4;">2nd 12</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="dozen3" style="grid-column: 10 / span 4; grid-row: 4;">3rd 12</div>`;

    html += `<div class="roulette-bet-cell outside" data-bet-type="1-18" style="grid-column: 2 / span 2; grid-row: 5;">1-18</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="even" style="grid-column: 4 / span 2; grid-row: 5;">Even</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="red" style="grid-column: 6 / span 2; grid-row: 5; background: #cc1a3e;">Red</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="black" style="grid-column: 8 / span 2; grid-row: 5; background: #1a1a2e;">Black</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="odd" style="grid-column: 10 / span 2; grid-row: 5;">Odd</div>`;
    html += `<div class="roulette-bet-cell outside" data-bet-type="19-36" style="grid-column: 12 / span 2; grid-row: 5;">19-36</div>`;

    board.innerHTML = html;

    // Add click handlers
    board.querySelectorAll('.roulette-bet-cell').forEach(cell => {
      cell.addEventListener('click', () => placeBet(cell));
    });
  }

  function placeBet(cell) {
    if (spinning) return;
    const type = cell.dataset.betType;
    const value = cell.dataset.betValue ? parseInt(cell.dataset.betValue) : null;

    // Check if already selected — toggle
    const existing = bets.findIndex(b => b.type === type && b.value === value);
    if (existing >= 0) {
      bets.splice(existing, 1);
      cell.classList.remove('selected');
    } else {
      bets.push({ type, value });
      cell.classList.add('selected');
    }

    updateBetsSummary();
  }

  function clearBets() {
    bets = [];
    document.querySelectorAll('.roulette-bet-cell.selected').forEach(c => c.classList.remove('selected'));
    updateBetsSummary();
    setMessage('Place your bets!', 'neutral');
  }

  function updateBetsSummary() {
    const el = document.getElementById('roulette-bets-summary');
    if (el) {
      const totalRisk = bets.length * bet;
      el.textContent = bets.length > 0
        ? `${bets.length} bet(s) — Total: $${totalRisk.toLocaleString()}`
        : 'No bets placed';
    }
  }

  function spin() {
    if (spinning) return;
    if (bets.length === 0) {
      setMessage('Place at least one bet!', 'lose');
      return;
    }

    const totalCost = bets.length * bet;
    if (App.getBalance() < totalCost) {
      setMessage('Not enough balance for all bets!', 'lose');
      return;
    }

    spinning = true;
    App.updateBalance(-totalCost);

    const spinBtn = document.getElementById('roulette-spin');
    if (spinBtn) spinBtn.disabled = true;

    setMessage('Spinning...', 'info');

    // Pick random winning number
    const winningIndex = Math.floor(Math.random() * NUMBERS.length);
    const winningNumber = NUMBERS[winningIndex];

    // Calculate rotation
    const degreesPerSlot = 360 / 37;
    const targetDeg = winningIndex * degreesPerSlot;
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const finalRotation = currentRotation + extraSpins + (360 - targetDeg);

    // Animate wheel
    const wheel = document.getElementById('roulette-wheel');
    if (wheel) {
      wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${finalRotation}deg)`;
    }
    currentRotation = finalRotation;

    // Show result after spin
    setTimeout(() => {
      const resultEl = document.getElementById('roulette-result');
      const color = winningNumber === 0 ? 'green' : (isRed(winningNumber) ? 'red' : 'black');
      const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);

      if (resultEl) {
        resultEl.innerHTML = `<span style="color: ${color === 'red' ? '#ff2d55' : color === 'green' ? '#00c853' : '#fff'}">${winningNumber}</span> <span style="font-size: 0.5em; color: var(--clr-text-muted)">${colorLabel}</span>`;
      }

      // Evaluate bets
      let totalWin = 0;
      bets.forEach(b => {
        const win = evaluateBet(b, winningNumber);
        totalWin += win;
      });

      if (totalWin > 0) {
        App.updateBalance(totalWin);
        setMessage(`🎉 ${winningNumber} ${colorLabel}! You win $${totalWin.toLocaleString()}!`, 'win');
        if (totalWin >= 1000) App.showWin(totalWin, '🎡 Roulette');
      } else {
        setMessage(`${winningNumber} ${colorLabel}. No winning bets.`, 'lose');
      }

      spinning = false;
      if (spinBtn) spinBtn.disabled = false;
      clearBets();
    }, 4200);
  }

  function evaluateBet(b, winNum) {
    switch (b.type) {
      case 'number':
        return b.value === winNum ? bet * 36 : 0;
      case 'red':
        return isRed(winNum) ? bet * 2 : 0;
      case 'black':
        return (!isRed(winNum) && winNum !== 0) ? bet * 2 : 0;
      case 'odd':
        return (winNum !== 0 && winNum % 2 === 1) ? bet * 2 : 0;
      case 'even':
        return (winNum !== 0 && winNum % 2 === 0) ? bet * 2 : 0;
      case '1-18':
        return (winNum >= 1 && winNum <= 18) ? bet * 2 : 0;
      case '19-36':
        return (winNum >= 19 && winNum <= 36) ? bet * 2 : 0;
      case 'dozen1':
        return (winNum >= 1 && winNum <= 12) ? bet * 3 : 0;
      case 'dozen2':
        return (winNum >= 13 && winNum <= 24) ? bet * 3 : 0;
      case 'dozen3':
        return (winNum >= 25 && winNum <= 36) ? bet * 3 : 0;
      default: return 0;
    }
  }

  function setMessage(text, type) {
    const el = document.getElementById('roulette-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { spin, clearBets };
})();
