/* ============================================
   CASINO ROYALE — API Client
   Replaces all localStorage logic in auth.js/app.js
   ============================================ */

const API = (() => {
  // ─── Config ────────────────────────────────────────────────────────────────
  // Change this to your Railway API URL when deployed:
  // e.g. 'https://casino-royale-api.up.railway.app'
  const BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://YOUR_RAILWAY_API_URL_HERE';  // ← update before deploying

  const TOKEN_KEY  = 'cr_token';
  const SOCKET_URL = BASE_URL;

  // ─── Token helpers ──────────────────────────────────────────────────────────
  function getToken()         { return localStorage.getItem(TOKEN_KEY); }
  function setToken(token)    { localStorage.setItem(TOKEN_KEY, token); }
  function clearToken()       { localStorage.removeItem(TOKEN_KEY); }
  function isLoggedIn()       { return !!getToken(); }

  // Decode JWT payload without verification (for reading user info client-side)
  function decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch { return null; }
  }

  function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    return decodeToken(token);
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user?.is_admin === true;
  }

  // ─── Fetch helper ───────────────────────────────────────────────────────────
  async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token   = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(BASE_URL + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  const get    = (p)       => request('GET',   p);
  const post   = (p, b)    => request('POST',  p, b);
  const patch  = (p, b)    => request('PATCH', p, b);

  // ─── Auth ───────────────────────────────────────────────────────────────────
  async function register(username, email, password) {
    const data = await post('/api/auth/register', { username, email, password });
    setToken(data.token);
    return data.user;
  }

  async function login(identifier, password) {
    const data = await post('/api/auth/login', { identifier, password });
    setToken(data.token);
    return data.user;
  }

  function logout() {
    clearToken();
    if (window._socket) { window._socket.disconnect(); window._socket = null; }
  }

  async function me() {
    const data = await get('/api/auth/me');
    return data.user;
  }

  // ─── Wallet ─────────────────────────────────────────────────────────────────
  async function getBalance() {
    const data = await get('/api/wallet/balance');
    return data.balance;
  }

  async function submitDeposit(amount, currency, txHash) {
    return await post('/api/wallet/deposit', { amount, currency, txHash });
  }

  async function submitWithdrawal(amount, currency, walletAddress) {
    return await post('/api/wallet/withdraw', { amount, currency, walletAddress });
  }

  async function getHistory() {
    const data = await get('/api/wallet/history');
    return data.transactions;
  }

  // ─── Games ──────────────────────────────────────────────────────────────────
  async function slotsSpin(bet) {
    return await post('/api/games/slots/spin', { bet });
  }

  async function diceRoll(bet, prediction) {
    return await post('/api/games/dice/roll', { bet, prediction });
  }

  async function rouletteSpin(bet, betType, betValue = null) {
    return await post('/api/games/roulette/spin', { bet, betType, betValue });
  }

  async function blackjackDeal(bet) {
    return await post('/api/games/blackjack/deal', { bet });
  }

  async function blackjackAction(action) {
    return await post('/api/games/blackjack/action', { action });
  }

  async function getLeaderboard() {
    const data = await get('/api/games/leaderboard');
    return data.leaderboard;
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────
  async function adminGetStats()              { return await get('/api/admin/stats'); }
  async function adminGetUsers(q = '')        { return (await get(`/api/admin/users?q=${encodeURIComponent(q)}`)).users; }
  async function adminGetTransactions(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return (await get(`/api/admin/transactions?${qs}`)).transactions;
  }
  async function adminSetBalance(id, balance)         { return await patch(`/api/admin/users/${id}/balance`, { balance }); }
  async function adminToggleBan(id)                   { return await patch(`/api/admin/users/${id}/ban`); }
  async function adminApproveTransaction(id)          { return await patch(`/api/admin/transactions/${id}/approve`); }
  async function adminRejectTransaction(id)           { return await patch(`/api/admin/transactions/${id}/reject`); }
  async function adminGetUserProfile(id)              { return await get(`/api/admin/users/${id}/profile`); }

  // ─── Socket.IO (real-time) ──────────────────────────────────────────────────
  function connectSocket(onBalanceUpdate, onLeaderboardUpdate) {
    if (!window.io) {
      console.warn('Socket.IO client not loaded. Add <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>');
      return null;
    }
    const token  = getToken();
    if (!token) return null;

    const socket = window.io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
    socket.on('connect_error', (err) => console.warn('Socket error:', err.message));

    if (onBalanceUpdate)    socket.on('balance:update',    onBalanceUpdate);
    if (onLeaderboardUpdate) socket.on('leaderboard:update', onLeaderboardUpdate);

    window._socket = socket;
    return socket;
  }

  // ─── Wallet addresses (kept client-side for display only) ──────────────────
  const WALLET_ADDRESSES = {
    BINANCE:  { address: '91847388', name: 'Binance Pay',    symbol: 'UID', icon: '🔶', color: '#f3ba2f' },
    COINBASE: { address: '91847388', name: 'Coinbase Pay',   symbol: 'ID',  icon: '🔵', color: '#0052ff' },
    CRYPTOCOM:{ address: '91847388', name: 'Crypto.com Pay', symbol: 'ID',  icon: '🦁', color: '#1199fa' },
    KRAKEN:   { address: '91847388', name: 'Kraken',         symbol: 'ID',  icon: '🟣', color: '#5741d9' },
    BYBIT:    { address: '91847388', name: 'Bybit Pay',      symbol: 'UID', icon: '🟡', color: '#ffb11a' },
    KUCOIN:   { address: '91847388', name: 'KuCoin Pay',     symbol: 'UID', icon: '🟢', color: '#24ae8f' },
  };

  const MIN_DEPOSIT    = 10;
  const MIN_WITHDRAWAL = 50;

  return {
    // Auth
    register, login, logout, me, isLoggedIn, isAdmin, getCurrentUser,
    // Wallet
    getBalance, submitDeposit, submitWithdrawal, getHistory,
    // Games
    slotsSpin, diceRoll, rouletteSpin, blackjackDeal, blackjackAction, getLeaderboard,
    // Admin
    adminGetStats, adminGetUsers, adminGetTransactions, adminSetBalance,
    adminToggleBan, adminApproveTransaction, adminRejectTransaction, adminGetUserProfile,
    // Socket
    connectSocket,
    // Constants
    WALLET_ADDRESSES, MIN_DEPOSIT, MIN_WITHDRAWAL,
  };
})();
