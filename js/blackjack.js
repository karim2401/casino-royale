/* ============================================
   CASINO ROYALE — Blackjack
   ============================================ */

const Blackjack = (() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RED_SUITS = ['♥', '♦'];

  let deck = [];
  let playerHand = [];
  let dealerHand = [];
  let bet = 200;
  let gameActive = false;
  let playerStood = false;

  function init() {
    updateBetDisplay();
    document.getElementById('bj-deal')?.addEventListener('click', deal);
    document.getElementById('bj-hit')?.addEventListener('click', hit);
    document.getElementById('bj-stand')?.addEventListener('click', stand);
    document.getElementById('bj-double')?.addEventListener('click', doubleDown);
    document.getElementById('bj-bet-up')?.addEventListener('click', () => changeBet(100));
    document.getElementById('bj-bet-down')?.addEventListener('click', () => changeBet(-100));
    toggleActions(false);
  }

  function createDeck() {
    deck = [];
    for (let i = 0; i < 6; i++) { // 6-deck shoe
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          deck.push({ rank, suit });
        }
      }
    }
    shuffle();
  }

  function shuffle() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawCard() {
    if (deck.length < 20) createDeck();
    return deck.pop();
  }

  function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    if (card.rank === 'A') return 11;
    return parseInt(card.rank);
  }

  function handValue(hand) {
    let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
    let aces = hand.filter(c => c.rank === 'A').length;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function changeBet(delta) {
    if (gameActive) return;
    bet = Math.max(100, Math.min(bet + delta, App.getBalance()));
    updateBetDisplay();
  }

  function updateBetDisplay() {
    const el = document.getElementById('bj-bet-amount');
    if (el) el.textContent = '$' + bet.toLocaleString();
  }

  function deal() {
    if (gameActive) return;
    if (App.getBalance() < bet) {
      setMessage('Not enough balance!', 'lose');
      return;
    }

    createDeck();
    App.updateBalance(-bet);
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    gameActive = true;
    playerStood = false;

    renderHands(false);
    toggleActions(true);

    // Check for natural blackjack
    if (handValue(playerHand) === 21) {
      if (handValue(dealerHand) === 21) {
        endGame('push');
      } else {
        endGame('blackjack');
      }
    } else {
      setMessage('Hit or Stand?', 'info');
    }
    updateBetDisplay();
  }

  function hit() {
    if (!gameActive || playerStood) return;
    playerHand.push(drawCard());
    renderHands(false);

    const value = handValue(playerHand);
    if (value > 21) {
      endGame('bust');
    } else if (value === 21) {
      stand();
    }
  }

  function stand() {
    if (!gameActive || playerStood) return;
    playerStood = true;
    toggleActions(false);
    dealerPlay();
  }

  function doubleDown() {
    if (!gameActive || playerStood || playerHand.length > 2) return;
    if (App.getBalance() < bet) {
      setMessage('Not enough to double down!', 'lose');
      return;
    }
    App.updateBalance(-bet);
    bet *= 2;
    updateBetDisplay();
    playerHand.push(drawCard());
    renderHands(false);

    if (handValue(playerHand) > 21) {
      endGame('bust');
    } else {
      playerStood = true;
      toggleActions(false);
      dealerPlay();
    }
  }

  function dealerPlay() {
    renderHands(true); // Reveal dealer's hole card

    function dealerDraw() {
      if (handValue(dealerHand) < 17) {
        setTimeout(() => {
          dealerHand.push(drawCard());
          renderHands(true);
          dealerDraw();
        }, 600);
      } else {
        setTimeout(() => {
          evaluateResult();
        }, 400);
      }
    }
    dealerDraw();
  }

  function evaluateResult() {
    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);

    if (dealerVal > 21) {
      endGame('dealer-bust');
    } else if (playerVal > dealerVal) {
      endGame('win');
    } else if (playerVal < dealerVal) {
      endGame('lose');
    } else {
      endGame('push');
    }
  }

  function endGame(result) {
    gameActive = false;
    toggleActions(false);
    renderHands(true);

    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);

    switch (result) {
      case 'blackjack': {
        const win = Math.floor(bet * 2.5);
        App.updateBalance(win);
        setMessage(`🃏 BLACKJACK! You win $${win.toLocaleString()}!`, 'win');
        App.showWin(win, '🃏 Blackjack');
        break;
      }
      case 'bust':
        setMessage(`💥 Bust! You went over 21 (${playerVal}). Lost $${bet.toLocaleString()}.`, 'lose');
        break;
      case 'dealer-bust': {
        const win = bet * 2;
        App.updateBalance(win);
        setMessage(`🎉 Dealer busts (${dealerVal})! You win $${win.toLocaleString()}!`, 'win');
        if (win >= 1000) App.showWin(win, '🃏 Blackjack');
        break;
      }
      case 'win': {
        const win = bet * 2;
        App.updateBalance(win);
        setMessage(`🏆 You win! ${playerVal} vs ${dealerVal}. +$${win.toLocaleString()}!`, 'win');
        if (win >= 1000) App.showWin(win, '🃏 Blackjack');
        break;
      }
      case 'lose':
        setMessage(`😞 Dealer wins. ${dealerVal} vs ${playerVal}. Lost $${bet.toLocaleString()}.`, 'lose');
        break;
      case 'push':
        App.updateBalance(bet);
        setMessage(`🤝 Push! Both ${playerVal}. Bet returned.`, 'neutral');
        break;
    }

    // Reset bet to original if doubled
    if (bet > 200) bet = Math.floor(bet / 2);
    updateBetDisplay();

    // Show deal button
    document.getElementById('bj-deal')?.style.setProperty('display', '');
  }

  function renderHands(showDealerHole) {
    // Dealer
    const dealerCards = document.getElementById('dealer-cards');
    const dealerScore = document.getElementById('dealer-score');
    if (dealerCards) {
      dealerCards.innerHTML = dealerHand.map((card, i) => {
        if (i === 1 && !showDealerHole) {
          return `<div class="bj-card face-down"></div>`;
        }
        const isRed = RED_SUITS.includes(card.suit);
        return `<div class="bj-card ${isRed ? 'red' : ''}" style="animation-delay: ${i * 0.15}s">
          <span class="bj-card-rank">${card.rank}</span>
          <span class="bj-card-suit">${card.suit}</span>
        </div>`;
      }).join('');
    }
    if (dealerScore) {
      if (showDealerHole) {
        dealerScore.textContent = handValue(dealerHand);
      } else {
        dealerScore.textContent = cardValue(dealerHand[0]);
      }
    }

    // Player
    const playerCards = document.getElementById('player-cards');
    const playerScore = document.getElementById('player-score');
    if (playerCards) {
      playerCards.innerHTML = playerHand.map((card, i) => {
        const isRed = RED_SUITS.includes(card.suit);
        return `<div class="bj-card ${isRed ? 'red' : ''}" style="animation-delay: ${i * 0.15}s">
          <span class="bj-card-rank">${card.rank}</span>
          <span class="bj-card-suit">${card.suit}</span>
        </div>`;
      }).join('');
    }
    if (playerScore) playerScore.textContent = handValue(playerHand);
  }

  function toggleActions(show) {
    const actions = ['bj-hit', 'bj-stand', 'bj-double'];
    actions.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? '' : 'none';
    });
    const dealBtn = document.getElementById('bj-deal');
    if (dealBtn) dealBtn.style.display = show ? 'none' : '';
  }

  function setMessage(text, type) {
    const el = document.getElementById('bj-message');
    if (el) {
      el.textContent = text;
      el.className = 'game-message ' + type;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { deal, hit, stand, doubleDown };
})();
