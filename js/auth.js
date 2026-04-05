/* ============================================
   CASINO ROYALE — Auth & Data Layer
   ============================================ */

const Auth = (() => {
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const DB_KEY = 'casino_db';
  const SESSION_KEY = 'casino_session';

  // --- Crypto wallet addresses (PLACEHOLDER — owner will replace) ---
  const WALLET_ADDRESSES = {
    BTC: { address: 'YOUR_BTC_ADDRESS_HERE', name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: '#f7931a' },
    ETH: { address: '0x951a1cc8d040630baecf0e674a11e0a398a85152', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', color: '#627eea' },
    USDT: { address: '0x951a1cc8d040630baecf0e674a11e0a398a85152', name: 'Tether (USDT)', symbol: 'USDT', icon: '₮', color: '#26a17b' },
    LTC: { address: 'YOUR_LTC_ADDRESS_HERE', name: 'Litecoin', symbol: 'LTC', icon: 'Ł', color: '#bfbbbb' },
    BNB: { address: 'YOUR_BNB_ADDRESS_HERE', name: 'BNB', symbol: 'BNB', icon: '◆', color: '#f3ba2f' },
    DOGE: { address: 'YOUR_DOGE_ADDRESS_HERE', name: 'Dogecoin', symbol: 'DOGE', icon: 'Ð', color: '#c2a633' },
    SOL: { address: 'YOUR_SOL_ADDRESS_HERE', name: 'Solana', symbol: 'SOL', icon: '◎', color: '#9945ff' },
    XRP: { address: 'YOUR_XRP_ADDRESS_HERE', name: 'Ripple', symbol: 'XRP', icon: '✕', color: '#346aa9' }
  };

  const MIN_DEPOSIT = 10;
  const MIN_WITHDRAWAL = 50;

  // --- Database ---
  function getDB() {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : { users: {}, transactions: [] };
    } catch { return { users: {}, transactions: [] }; }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // --- Simple hash (demo-grade, NOT production secure) ---
  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
  }

  // --- Sign Up ---
  function signUp(username, email, password) {
    if (!username || !email || !password) return { ok: false, error: 'All fields are required' };

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (username.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };
    if (username.length > 20) return { ok: false, error: 'Username must be 20 characters or less' };
    if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, error: 'Username: letters, numbers, underscores only' };
    if (username === ADMIN_USERNAME) return { ok: false, error: 'Username not available' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid email address' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };

    const db = getDB();

    if (db.users[username]) return { ok: false, error: 'Username already taken' };

    const emailExists = Object.values(db.users).some(u => u.email === email);
    if (emailExists) return { ok: false, error: 'Email already registered' };

    db.users[username] = {
      username,
      email,
      passwordHash: hashPassword(password),
      balance: 0,
      deposits: [],
      withdrawals: [],
      createdAt: new Date().toISOString(),
      banned: false
    };

    saveDB(db);
    setSession(username);
    return { ok: true, user: getSafeUser(username) };
  }

  // --- Sign In ---
  function signIn(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) return { ok: false, error: 'All fields are required' };

    usernameOrEmail = usernameOrEmail.trim().toLowerCase();

    // Admin login
    if (usernameOrEmail === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setSession('__admin__');
      return { ok: true, user: { username: 'admin', isAdmin: true }, isAdmin: true };
    }

    const db = getDB();
    let user = db.users[usernameOrEmail];

    // Try matching by email
    if (!user) {
      const found = Object.values(db.users).find(u => u.email === usernameOrEmail);
      if (found) user = found;
    }

    if (!user) return { ok: false, error: 'Account not found' };
    if (user.banned) return { ok: false, error: 'Account has been suspended' };
    if (user.passwordHash !== hashPassword(password)) return { ok: false, error: 'Incorrect password' };

    setSession(user.username);
    return { ok: true, user: getSafeUser(user.username) };
  }

  // --- Sign Out ---
  function signOut() {
    localStorage.removeItem(SESSION_KEY);
  }

  // --- Session ---
  function setSession(username) {
    localStorage.setItem(SESSION_KEY, username);
  }

  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function isAdmin() {
    return getSession() === '__admin__';
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    if (session === '__admin__') return { username: 'admin', isAdmin: true, balance: 0 };
    return getSafeUser(session);
  }

  function getSafeUser(username) {
    const db = getDB();
    const user = db.users[username];
    if (!user) return null;
    return {
      username: user.username,
      email: user.email,
      balance: user.balance,
      deposits: user.deposits || [],
      withdrawals: user.withdrawals || [],
      createdAt: user.createdAt,
      banned: user.banned
    };
  }

  // --- Balance ---
  function getUserBalance() {
    const session = getSession();
    if (!session || session === '__admin__') return 0;
    const db = getDB();
    return db.users[session]?.balance || 0;
  }

  function updateUserBalance(amount) {
    const session = getSession();
    if (!session || session === '__admin__') return;
    const db = getDB();
    if (!db.users[session]) return;
    db.users[session].balance += amount;
    if (db.users[session].balance < 0) db.users[session].balance = 0;
    saveDB(db);
  }

  function setUserBalance(val) {
    const session = getSession();
    if (!session || session === '__admin__') return;
    const db = getDB();
    if (!db.users[session]) return;
    db.users[session].balance = val;
    saveDB(db);
  }

  // --- Deposits ---
  function submitDeposit(amount, currency, txHash) {
    const session = getSession();
    if (!session || session === '__admin__') return { ok: false, error: 'Not logged in' };
    if (amount < MIN_DEPOSIT) return { ok: false, error: `Minimum deposit is $${MIN_DEPOSIT}` };
    if (!currency || !WALLET_ADDRESSES[currency]) return { ok: false, error: 'Invalid currency' };
    if (!txHash || txHash.trim().length < 5) return { ok: false, error: 'Please enter a valid transaction ID' };

    const db = getDB();
    if (!db.users[session]) return { ok: false, error: 'User not found' };

    const deposit = {
      id: 'DEP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      username: session,
      amount: parseFloat(amount),
      currency,
      txHash: txHash.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.users[session].deposits.push(deposit);
    db.transactions.push({ ...deposit, type: 'deposit' });
    saveDB(db);
    return { ok: true, deposit };
  }

  // --- Withdrawals ---
  function submitWithdrawal(amount, currency, walletAddress) {
    const session = getSession();
    if (!session || session === '__admin__') return { ok: false, error: 'Not logged in' };
    if (amount < MIN_WITHDRAWAL) return { ok: false, error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` };
    if (!currency) return { ok: false, error: 'Select a currency' };
    if (!walletAddress || walletAddress.trim().length < 10) return { ok: false, error: 'Enter a valid wallet address' };

    const db = getDB();
    if (!db.users[session]) return { ok: false, error: 'User not found' };
    if (db.users[session].balance < amount) return { ok: false, error: 'Insufficient balance' };

    const withdrawal = {
      id: 'WDR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      username: session,
      amount: parseFloat(amount),
      currency,
      walletAddress: walletAddress.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Deduct immediately
    db.users[session].balance -= amount;
    db.users[session].withdrawals.push(withdrawal);
    db.transactions.push({ ...withdrawal, type: 'withdrawal' });
    saveDB(db);
    return { ok: true, withdrawal };
  }

  // --- Admin Functions ---
  function adminGetAllUsers() {
    if (!isAdmin()) return [];
    const db = getDB();
    return Object.values(db.users).map(u => ({
      username: u.username,
      email: u.email,
      balance: u.balance,
      banned: u.banned,
      createdAt: u.createdAt,
      depositsCount: (u.deposits || []).length,
      withdrawalsCount: (u.withdrawals || []).length,
      totalDeposited: (u.deposits || []).filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0),
      totalWithdrawn: (u.withdrawals || []).filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)
    }));
  }

  function adminGetPendingDeposits() {
    if (!isAdmin()) return [];
    const db = getDB();
    return db.transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  }

  function adminGetPendingWithdrawals() {
    if (!isAdmin()) return [];
    const db = getDB();
    return db.transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  }

  function adminGetAllTransactions() {
    if (!isAdmin()) return [];
    const db = getDB();
    return (db.transactions || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function adminApproveDeposit(depositId) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();

    // Update in transactions
    const tx = db.transactions.find(t => t.id === depositId && t.type === 'deposit');
    if (!tx || tx.status !== 'pending') return { ok: false, error: 'Deposit not found or already processed' };
    tx.status = 'approved';

    // Update in user
    const user = db.users[tx.username];
    if (user) {
      const dep = user.deposits.find(d => d.id === depositId);
      if (dep) dep.status = 'approved';
      user.balance += tx.amount;
    }

    saveDB(db);
    return { ok: true };
  }

  function adminRejectDeposit(depositId) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();

    const tx = db.transactions.find(t => t.id === depositId && t.type === 'deposit');
    if (!tx || tx.status !== 'pending') return { ok: false, error: 'Deposit not found or already processed' };
    tx.status = 'rejected';

    const user = db.users[tx.username];
    if (user) {
      const dep = user.deposits.find(d => d.id === depositId);
      if (dep) dep.status = 'rejected';
    }

    saveDB(db);
    return { ok: true };
  }

  function adminApproveWithdrawal(withdrawalId) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();

    const tx = db.transactions.find(t => t.id === withdrawalId && t.type === 'withdrawal');
    if (!tx || tx.status !== 'pending') return { ok: false, error: 'Withdrawal not found or already processed' };
    tx.status = 'approved';

    const user = db.users[tx.username];
    if (user) {
      const wdr = user.withdrawals.find(w => w.id === withdrawalId);
      if (wdr) wdr.status = 'approved';
    }

    saveDB(db);
    return { ok: true };
  }

  function adminRejectWithdrawal(withdrawalId) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();

    const tx = db.transactions.find(t => t.id === withdrawalId && t.type === 'withdrawal');
    if (!tx || tx.status !== 'pending') return { ok: false, error: 'Withdrawal not found or already processed' };
    tx.status = 'rejected';

    // Refund user balance
    const user = db.users[tx.username];
    if (user) {
      const wdr = user.withdrawals.find(w => w.id === withdrawalId);
      if (wdr) wdr.status = 'rejected';
      user.balance += tx.amount;
    }

    saveDB(db);
    return { ok: true };
  }

  function adminSetUserBalance(username, newBalance) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();
    if (!db.users[username]) return { ok: false, error: 'User not found' };
    db.users[username].balance = parseFloat(newBalance);
    saveDB(db);
    return { ok: true };
  }

  function adminToggleBan(username) {
    if (!isAdmin()) return { ok: false };
    const db = getDB();
    if (!db.users[username]) return { ok: false, error: 'User not found' };
    db.users[username].banned = !db.users[username].banned;
    saveDB(db);
    return { ok: true, banned: db.users[username].banned };
  }

  function adminGetStats() {
    if (!isAdmin()) return {};
    const db = getDB();
    const users = Object.values(db.users);
    return {
      totalUsers: users.length,
      totalBalance: users.reduce((s, u) => s + u.balance, 0),
      pendingDeposits: db.transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length,
      pendingWithdrawals: db.transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length,
      totalDeposited: db.transactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + t.amount, 0),
      totalWithdrawn: db.transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + t.amount, 0),
      totalTransactions: db.transactions.length
    };
  }

  function adminGetPlayerProfile(username) {
    if (!isAdmin()) return null;
    const db = getDB();
    const user = db.users[username];
    if (!user) return null;
    const deposits = user.deposits || [];
    const withdrawals = user.withdrawals || [];
    return {
      username: user.username,
      email: user.email,
      balance: user.balance,
      banned: user.banned,
      createdAt: user.createdAt,
      deposits: [...deposits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      withdrawals: [...withdrawals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      totalDeposited: deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0),
      totalWithdrawn: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)
    };
  }

  function adminGetDatabaseStats() {
    if (!isAdmin()) return {};
    const db = getDB();
    const users = Object.values(db.users);
    const realCryptoIn = db.transactions
      .filter(t => t.type === 'deposit' && t.status === 'approved')
      .reduce((s, t) => s + t.amount, 0);
    const realCryptoOut = db.transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'approved')
      .reduce((s, t) => s + t.amount, 0);
    const virtualInPlay = users.reduce((s, u) => s + u.balance, 0);
    return {
      realCryptoIn,
      realCryptoOut,
      virtualInPlay,
      houseProfit: realCryptoIn - realCryptoOut - virtualInPlay
    };
  }

  return {
    signUp, signIn, signOut, isLoggedIn, isAdmin, getCurrentUser, getSession,
    getUserBalance, updateUserBalance, setUserBalance,
    submitDeposit, submitWithdrawal,
    WALLET_ADDRESSES, MIN_DEPOSIT, MIN_WITHDRAWAL,
    // Admin
    adminGetAllUsers, adminGetPendingDeposits, adminGetPendingWithdrawals,
    adminGetAllTransactions, adminApproveDeposit, adminRejectDeposit,
    adminApproveWithdrawal, adminRejectWithdrawal,
    adminSetUserBalance, adminToggleBan, adminGetStats,
    adminGetPlayerProfile, adminGetDatabaseStats
  };
})();
