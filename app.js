/* ============================================
   CASINO ROYALE — App Controller (Auth-Aware)
   ============================================ */

const App = (() => {
  let balance = 0;
  let leaderboard = [];
  let selectedDepositCurrency = null;
  let selectedWithdrawCurrency = null;

  function getBalance() { return balance; }

  function syncBalance() {
    if (Auth.isLoggedIn() && !Auth.isAdmin()) {
      balance = Auth.getUserBalance();
    } else {
      balance = 0;
    }
    updateWalletUI();
  }

  function updateBalance(amount) {
    if (!Auth.isLoggedIn() || Auth.isAdmin()) return;
    Auth.updateUserBalance(amount);
    balance = Auth.getUserBalance();
    updateWalletUI();
  }

  function setBalance(val) {
    if (!Auth.isLoggedIn() || Auth.isAdmin()) return;
    Auth.setUserBalance(val);
    balance = Auth.getUserBalance();
    updateWalletUI();
  }

  function updateWalletUI() {
    document.querySelectorAll('.wallet-amount').forEach(el => {
      animateCount(el, parseFloat(el.textContent.replace(/[$,]/g, '')) || 0, balance);
    });
  }

  function animateCount(el, from, to) {
    const dur = 400, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = '$' + Math.floor(from + (to - from) * e).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Auth UI ---
  function updateAuthUI() {
    const navGuest = document.getElementById('nav-guest');
    const navUser = document.getElementById('nav-user');
    const user = Auth.getCurrentUser();

    if (Auth.isAdmin()) {
      window.location.href = 'admin.html';
      return;
    }

    if (user) {
      navGuest.style.display = 'none';
      navUser.style.display = 'flex';
      document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();
      document.getElementById('user-name').textContent = user.username;
      document.getElementById('dropdown-username').textContent = user.username;
      document.getElementById('dropdown-email').textContent = user.email;
      syncBalance();
    } else {
      navGuest.style.display = 'flex';
      navUser.style.display = 'none';
      balance = 0;
      updateWalletUI();
    }
  }

  function handleSignUp() {
    const u = document.getElementById('signup-username').value;
    const e = document.getElementById('signup-email').value;
    const p = document.getElementById('signup-password').value;
    const c = document.getElementById('signup-password-confirm').value;
    const err = document.getElementById('signup-error');
    if (p !== c) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
    const r = Auth.signUp(u, e, p);
    if (!r.ok) { err.textContent = r.error; err.style.display = 'block'; return; }
    err.style.display = 'none';
    closeModal('signup-modal');
    updateAuthUI();
    fireConfetti(30);
  }

  function handleSignIn() {
    const u = document.getElementById('signin-username').value;
    const p = document.getElementById('signin-password').value;
    const err = document.getElementById('signin-error');
    const r = Auth.signIn(u, p);
    if (!r.ok) { err.textContent = r.error; err.style.display = 'block'; return; }
    if (r.isAdmin) { window.location.href = 'admin.html'; return; }
    err.style.display = 'none';
    closeModal('signin-modal');
    updateAuthUI();
  }

  function handleSignOut() {
    Auth.signOut();
    document.getElementById('user-menu').classList.remove('open');
    updateAuthUI();
    closeAllGames();
  }

  function handlePlayNow(e) {
    e.preventDefault();
    if (!Auth.isLoggedIn()) { openModal('signup-modal'); }
    else { document.getElementById('games').scrollIntoView({ behavior: 'smooth' }); }
  }

  // --- Modals ---
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
    if (id === 'deposit-modal') initDepositModal();
    if (id === 'withdraw-modal') initWithdrawModal();
    if (id === 'history-modal') renderUserTransactions();
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  }

  function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 200);
  }

  // --- Deposit ---
  function initDepositModal() {
    selectedDepositCurrency = null;
    const grid = document.getElementById('crypto-grid');
    const addr = document.getElementById('deposit-address-section');
    const det = document.getElementById('deposit-details-section');
    const suc = document.getElementById('deposit-success');
    const errEl = document.getElementById('deposit-error');
    if (addr) addr.style.display = 'none';
    if (det) det.style.display = 'none';
    if (suc) suc.classList.remove('active');
    if (errEl) errEl.style.display = 'none';
    const a = document.getElementById('deposit-amount');
    const t = document.getElementById('deposit-txhash');
    if (a) a.value = '';
    if (t) t.value = '';
    // Show deposit steps
    document.querySelectorAll('#deposit-modal .deposit-step').forEach(s => s.style.display = '');

    grid.innerHTML = Object.entries(Auth.WALLET_ADDRESSES).map(([key, coin]) => `
      <button class="crypto-card" data-currency="${key}" onclick="App.selectDepositCurrency('${key}')">
        <span class="crypto-card-icon" style="color:${coin.color}">${coin.icon}</span>
        <span class="crypto-card-name">${coin.name}</span>
        <span class="crypto-card-symbol">${coin.symbol}</span>
      </button>
    `).join('');
  }

  function selectDepositCurrency(key) {
    selectedDepositCurrency = key;
    const coin = Auth.WALLET_ADDRESSES[key];
    document.querySelectorAll('#crypto-grid .crypto-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`#crypto-grid .crypto-card[data-currency="${key}"]`)?.classList.add('selected');
    document.getElementById('deposit-address-section').style.display = '';
    document.getElementById('deposit-details-section').style.display = '';
    document.getElementById('deposit-currency-name').textContent = coin.name;
    document.getElementById('deposit-crypto-icon').textContent = coin.icon;
    document.getElementById('deposit-crypto-icon').style.color = coin.color;
    document.getElementById('deposit-wallet-address').textContent = coin.address;
    document.getElementById('copy-feedback').style.display = 'none';
  }

  function copyWalletAddress() {
    const addr = document.getElementById('deposit-wallet-address').textContent;
    navigator.clipboard.writeText(addr).then(() => {
      const fb = document.getElementById('copy-feedback');
      fb.style.display = 'block';
      setTimeout(() => fb.style.display = 'none', 2000);
    });
  }

  function handleDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    const txHash = document.getElementById('deposit-txhash').value;
    const errEl = document.getElementById('deposit-error');
    if (!selectedDepositCurrency) { errEl.textContent = 'Select a currency'; errEl.style.display = 'block'; return; }
    const r = Auth.submitDeposit(amount, selectedDepositCurrency, txHash);
    if (!r.ok) { errEl.textContent = r.error; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    document.querySelectorAll('#deposit-modal .deposit-step').forEach(s => s.style.display = 'none');
    document.getElementById('deposit-success').classList.add('active');
    document.getElementById('deposit-success-amount').textContent = `$${amount.toLocaleString()} via ${selectedDepositCurrency}`;
    setTimeout(() => closeModal('deposit-modal'), 3000);
  }

  // --- Withdrawal ---
  function initWithdrawModal() {
    selectedWithdrawCurrency = null;
    const grid = document.getElementById('withdraw-crypto-grid');
    const err = document.getElementById('withdraw-error');
    const suc = document.getElementById('withdraw-success');
    if (err) err.style.display = 'none';
    if (suc) suc.classList.remove('active');
    const a = document.getElementById('withdraw-amount');
    const w = document.getElementById('withdraw-wallet');
    if (a) a.value = '';
    if (w) w.value = '';
    // Show form elements
    document.querySelectorAll('#withdraw-modal .form-group').forEach(f => f.style.display = '');
    const submitBtn = document.querySelector('#withdraw-modal .form-submit-btn');
    if (submitBtn) submitBtn.style.display = '';
    const balBar = document.querySelector('#withdraw-modal .balance-bar');
    if (balBar) balBar.style.display = '';

    grid.innerHTML = Object.entries(Auth.WALLET_ADDRESSES).map(([key, coin]) => `
      <button class="crypto-card crypto-card-sm" data-currency="${key}" onclick="App.selectWithdrawCurrency('${key}')">
        <span class="crypto-card-icon" style="color:${coin.color}">${coin.icon}</span>
        <span class="crypto-card-symbol">${coin.symbol}</span>
      </button>
    `).join('');
    syncBalance();
  }

  function selectWithdrawCurrency(key) {
    selectedWithdrawCurrency = key;
    document.querySelectorAll('#withdraw-crypto-grid .crypto-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`#withdraw-crypto-grid .crypto-card[data-currency="${key}"]`)?.classList.add('selected');
  }

  function handleWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const wallet = document.getElementById('withdraw-wallet').value;
    const errEl = document.getElementById('withdraw-error');
    if (!selectedWithdrawCurrency) { errEl.textContent = 'Select a currency'; errEl.style.display = 'block'; return; }
    const r = Auth.submitWithdrawal(amount, selectedWithdrawCurrency, wallet);
    if (!r.ok) { errEl.textContent = r.error; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    syncBalance();
    document.querySelectorAll('#withdraw-modal .form-group').forEach(f => f.style.display = 'none');
    document.querySelector('#withdraw-modal .form-submit-btn').style.display = 'none';
    document.querySelector('#withdraw-modal .balance-bar').style.display = 'none';
    document.getElementById('withdraw-success').classList.add('active');
    document.getElementById('withdraw-success-amount').textContent = `$${amount.toLocaleString()} via ${selectedWithdrawCurrency}`;
    setTimeout(() => closeModal('withdraw-modal'), 3000);
  }

  // --- Transaction History ---
  function renderUserTransactions() {
    const c = document.getElementById('user-transactions-list');
    if (!c) return;
    const user = Auth.getCurrentUser();
    if (!user) { c.innerHTML = '<p style="color:var(--clr-text-dim);padding:2rem;text-align:center">Not logged in</p>'; return; }
    const txs = [...(user.deposits || []).map(d => ({ ...d, type: 'deposit' })),
    ...(user.withdrawals || []).map(w => ({ ...w, type: 'withdrawal' }))]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (txs.length === 0) {
      c.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--clr-text-dim)"><div style="font-size:3rem;margin-bottom:1rem">📋</div><p>No transactions yet.</p></div>';
      return;
    }
    c.innerHTML = txs.map(tx => {
      const sc = tx.status === 'approved' ? 'status-approved' : tx.status === 'rejected' ? 'status-rejected' : 'status-pending';
      return `<div class="tx-item"><div class="tx-icon">${tx.type === 'deposit' ? '💳' : '💸'}</div><div class="tx-info"><div class="tx-type">${tx.type}</div><div class="tx-date">${new Date(tx.createdAt).toLocaleString()}</div>${tx.currency ? `<div class="tx-currency">${tx.currency}</div>` : ''}</div><div class="tx-right"><div class="tx-amount">${tx.type === 'deposit' ? '+' : '-'}$${tx.amount.toLocaleString()}</div><div class="tx-status ${sc}">${tx.status}</div></div></div>`;
    }).join('');
  }

  // --- Leaderboard ---
  function initLeaderboard() {
    const saved = localStorage.getItem('casino_leaderboard');
    leaderboard = saved ? JSON.parse(saved) : [];
    renderLeaderboard();
  }

  function addWin(game, amount) {
    const user = Auth.getCurrentUser();
    leaderboard.push({ game, amount, username: user ? user.username : 'Guest', date: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.amount - a.amount);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem('casino_leaderboard', JSON.stringify(leaderboard));
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const c = document.getElementById('leaderboard-list');
    if (!c) return;
    if (leaderboard.length === 0) {
      c.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--clr-text-dim)"><div style="font-size:3rem;margin-bottom:1rem">🏆</div><p>No wins yet. Start playing!</p></div>';
      return;
    }
    c.innerHTML = leaderboard.map((item, i) => `<div class="leaderboard-item"><div class="leaderboard-rank">#${i + 1}</div><div class="leaderboard-info"><div class="leaderboard-game">${item.game}</div><div class="leaderboard-date">${item.username || 'Player'} · ${item.date}</div></div><div class="leaderboard-amount">+$${item.amount.toLocaleString()}</div></div>`).join('');
  }

  // --- Navigation ---
  function openGame(gameId) {
    if (!Auth.isLoggedIn()) { openModal('auth-gate-modal'); return; }
    document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById('game-' + gameId);
    if (view) { view.classList.add('active'); document.body.style.overflow = 'hidden'; syncBalance(); }
  }

  function closeGame(id) {
    const v = document.getElementById('game-' + id);
    if (v) { v.classList.remove('active'); document.body.style.overflow = ''; }
  }

  function closeAllGames() {
    document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function goHome() { closeAllGames(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // --- Particles ---
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.5 + 0.1, color: Math.random() > 0.7 ? '#d4af37' : '#ffffff' });
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill(); p.x += p.speedX; p.y += p.speedY; if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0; if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0; });
      ctx.globalAlpha = 1; requestAnimationFrame(draw);
    }
    draw();
  }

  function initScrollEffects() {
    const nav = document.querySelector('.navbar');
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50));
  }

  function fireConfetti(count = 50) {
    const colors = ['#d4af37', '#f5d060', '#ff2d55', '#00e5ff', '#b24dff', '#00c853', '#fff'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = (Math.random() * 8 + 5) + 'px';
      el.style.height = (Math.random() * 8 + 5) + 'px';
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.setProperty('--fall-duration', (Math.random() * 2 + 2) + 's');
      el.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  function showWin(amount, gameName) {
    addWin(gameName, amount); fireConfetti(60);
    const o = document.getElementById('win-overlay'), a = document.getElementById('win-amount'), l = document.getElementById('win-label');
    if (o && a && l) { a.textContent = '+$' + amount.toLocaleString(); l.textContent = `You won at ${gameName}!`; o.classList.add('active'); setTimeout(() => o.classList.remove('active'), 3000); }
  }

  function initMobileMenu() {
    const links = document.querySelector('.navbar-links');
    if (links) links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const t = document.querySelector(href);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initClickOutside() {
    document.addEventListener('click', e => {
      const um = document.getElementById('user-menu');
      if (um && !um.contains(e.target)) um.classList.remove('open');
    });
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; } });
    });
  }

  function init() {
    initLeaderboard(); initParticles(); initScrollEffects(); initMobileMenu(); initSmoothScroll(); initClickOutside();
    updateAuthUI();
    const wo = document.getElementById('win-overlay');
    if (wo) wo.addEventListener('click', () => wo.classList.remove('active'));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeAllGames(); document.querySelectorAll('.modal-overlay.active').forEach(m => { m.classList.remove('active'); }); document.body.style.overflow = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    getBalance, updateBalance, setBalance, syncBalance,
    openGame, closeGame, goHome,
    openModal, closeModal, switchModal,
    handleSignUp, handleSignIn, handleSignOut, handlePlayNow,
    selectDepositCurrency, copyWalletAddress, handleDeposit,
    selectWithdrawCurrency, handleWithdrawal,
    showWin, fireConfetti, addWin
  };
})();
