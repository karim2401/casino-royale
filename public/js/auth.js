const Auth = (() => {
  const WALLET_ADDRESSES = {
    VISA: { address: 'Card Number', name: 'Visa', symbol: 'USD', icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" style="width:2em;vertical-align:middle;">', color: '#1434CB' },
    MASTERCARD: { address: 'Card Number', name: 'Mastercard', symbol: 'USD', icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" style="width:2em;vertical-align:middle;">', color: '#EB001B' },
    BINANCE: { address: '91847388', name: 'Binance Pay', symbol: 'UID', icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" style="width:1.5em;vertical-align:middle;">', color: '#f3ba2f' },
    COINBASE: { address: '91847388', name: 'Coinbase Pay', symbol: 'ID', icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/c/c0/Coinbase_Logo.svg" style="width:1.5em;vertical-align:middle;">', color: '#0052ff' },
    CRYPTOCOM: { address: '91847388', name: 'Crypto.com Pay', symbol: 'ID', icon: '🦁', color: '#1199fa' },
    KRAKEN: { address: '91847388', name: 'Kraken', symbol: 'ID', icon: '🟣', color: '#5741d9' },
    BYBIT: { address: '91847388', name: 'Bybit Pay', symbol: 'UID', icon: '🟡', color: '#ffb11a' },
    KUCOIN: { address: '91847388', name: 'KuCoin Pay', symbol: 'UID', icon: '🟢', color: '#24ae8f' }
  };
  const MIN_DEPOSIT = 10;
  const MIN_WITHDRAWAL = 50;

  let currentUser = null;
  let isAdminUser = false;
  let fetchPromise = null;
  
  let adminUsers = [];
  let adminTransactions = [];

  async function _init() {
    try {
      const res = await fetch('/api/user/me');
      const data = await res.json();
      if (data.ok) {
        currentUser = data.user;
        isAdminUser = !!data.user.is_admin;
        if (isAdminUser) await refreshAdminData();
      }
    } catch { }
  }

  async function ensureInit() {
    if (!fetchPromise) fetchPromise = _init();
    await fetchPromise;
  }

  async function signUp(username, email, password) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (data.ok) await _init();
    return data;
  }

  async function signIn(username, password) {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.ok) {
        await _init();
        if (isAdminUser) data.isAdmin = true;
    }
    return data;
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    isAdminUser = false;
  }

  function isLoggedIn() { return !!currentUser; }
  function isAdmin() { return isAdminUser; }
  function getCurrentUser() { return currentUser; }
  function getSession() { return currentUser ? currentUser.username : null; }

  function getUserBalance() { return currentUser ? currentUser.balance : 0; }

  async function updateUserBalance(amount) {
    if (!currentUser || isAdminUser) return;
    const res = await fetch('/api/user/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.ok) { currentUser.balance = data.balance; }
  }

  async function updateBinanceId(binance_id) {
    if (!currentUser || isAdminUser) return;
    const res = await fetch('/api/user/binance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binance_id })
    });
    const data = await res.json();
    if (data.ok) { currentUser.binance_id = binance_id; }
    return data;
  }

  // --- Banking ---
  async function submitDeposit(amount, currency, txHash) {
    if (amount < MIN_DEPOSIT) return { ok: false, error: `Minimum deposit is $${MIN_DEPOSIT}` };
    const res = await fetch('/api/banking/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, txHash })
    });
    return await res.json();
  }

  async function submitWithdrawal(amount, currency, walletAddress) {
    if (amount < MIN_WITHDRAWAL) return { ok: false, error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` };
    const res = await fetch('/api/banking/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, walletAddress })
    });
    return await res.json();
  }

  // --- Admin ---
  async function refreshAdminData() {
    try {
        const res = await fetch('/api/admin/data');
        const data = await res.json();
        if (data.ok) {
            adminUsers = data.users;
            adminTransactions = data.transactions;
            
            adminUsers.forEach(u => {
                const depTx = adminTransactions.filter(t => t.user_id === u.id && t.type === 'deposit');
                const wdrTx = adminTransactions.filter(t => t.user_id === u.id && t.type === 'withdrawal');
                u.depositsCount = depTx.length;
                u.withdrawalsCount = wdrTx.length;
                u.totalDeposited = depTx.filter(t=>t.status==='approved').reduce((s,t)=>s+t.amount,0);
                u.totalWithdrawn = wdrTx.filter(t=>t.status==='approved').reduce((s,t)=>s+t.amount,0);
                u.deposits = depTx;
                u.withdrawals = wdrTx;
                
                // Polyfill for frontend that still wants older structure
                u.deposits.forEach(d => { d.txHash = d.wallet_or_hash; d.id = String(d.id); });
                u.withdrawals.forEach(w => { w.walletAddress = w.wallet_or_hash; w.id = String(w.id); });
            });
        }
    } catch { }
  }

  function adminGetAllUsers() { return adminUsers; }
  function adminGetPendingDeposits() { return adminTransactions.filter(t => t.type === 'deposit' && t.status === 'pending'); }
  function adminGetPendingWithdrawals() { return adminTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending'); }
  function adminGetAllTransactions() { return [...adminTransactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function adminGetPlayerProfile(username) { return adminUsers.find(u => u.username === username); }
  
  function adminGetStats() {
    return {
      totalUsers: adminUsers.length,
      totalBalance: adminUsers.reduce((s, u) => s + u.balance, 0),
      pendingDeposits: adminGetPendingDeposits().length,
      pendingWithdrawals: adminGetPendingWithdrawals().length,
      totalDeposited: adminTransactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + t.amount, 0),
      totalWithdrawn: adminTransactions.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + t.amount, 0),
      totalTransactions: adminTransactions.length
    };
  }

  function adminGetDatabaseStats() {
    const realCryptoIn = adminTransactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
    const realCryptoOut = adminTransactions.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
    const virtualInPlay = adminUsers.reduce((s, u) => s + u.balance, 0);
    return { realCryptoIn, realCryptoOut, virtualInPlay, houseProfit: realCryptoIn - realCryptoOut - virtualInPlay };
  }

  async function _adminAction(action, targetId, payload) {
    await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, targetId, payload })
    });
    await refreshAdminData();
  }

  async function adminApproveDeposit(id) { await _adminAction('approveDeposit', id); }
  async function adminRejectDeposit(id) { await _adminAction('rejectDeposit', id); }
  async function adminApproveWithdrawal(id) { await _adminAction('approveWithdrawal', id); }
  async function adminRejectWithdrawal(id) { await _adminAction('rejectWithdrawal', id); }
  async function adminSetUserBalance(username, balance) { await _adminAction('setBalance', null, { username, balance }); }
  async function adminToggleBan(username) { await _adminAction('toggleBan', null, { username }); }

  return {
    ensureInit, signUp, signIn, signOut, isLoggedIn, isAdmin, getCurrentUser, getSession,
    getUserBalance, updateUserBalance, updateBinanceId, submitDeposit, submitWithdrawal,
    WALLET_ADDRESSES, MIN_DEPOSIT, MIN_WITHDRAWAL,
    // Admin
    refreshAdminData, adminGetAllUsers, adminGetPendingDeposits, adminGetPendingWithdrawals,
    adminGetAllTransactions, adminApproveDeposit, adminRejectDeposit,
    adminApproveWithdrawal, adminRejectWithdrawal,
    adminSetUserBalance, adminToggleBan, adminGetStats,
    adminGetPlayerProfile, adminGetDatabaseStats
  };
})();
