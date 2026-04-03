/* ============================================
   CASINO ROYALE — Admin Panel Controller
   ============================================ */

const Admin = (() => {
  // Filter state
  let txTypeFilter = '';
  let txStatusFilter = '';

  function init() {
    if (!Auth.isAdmin()) {
      window.location.href = 'index.html';
      return;
    }
    renderStats();
    renderDeposits();
    renderWithdrawals();
    renderUsers('');
    renderTransactions();
    renderDatabase('');
  }

  // ─── Stats ────────────────────────────────────────────────────
  function renderStats() {
    const stats = Auth.adminGetStats();
    const container = document.getElementById('admin-stats');
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">👥</div>
        <div class="stat-card-label">Total Players</div>
        <div class="stat-card-value">${stats.totalUsers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💰</div>
        <div class="stat-card-label">Virtual in Circulation</div>
        <div class="stat-card-value">$${stats.totalBalance.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💳</div>
        <div class="stat-card-label">Pending Deposits</div>
        <div class="stat-card-value" style="color:${stats.pendingDeposits > 0 ? '#ffc800' : 'inherit'}">${stats.pendingDeposits}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💸</div>
        <div class="stat-card-label">Pending Withdrawals</div>
        <div class="stat-card-value" style="color:${stats.pendingWithdrawals > 0 ? '#ffc800' : 'inherit'}">${stats.pendingWithdrawals}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📈</div>
        <div class="stat-card-label">Total Real Crypto In</div>
        <div class="stat-card-value">$${stats.totalDeposited.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📉</div>
        <div class="stat-card-label">Total Real Crypto Out</div>
        <div class="stat-card-value">$${stats.totalWithdrawn.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📋</div>
        <div class="stat-card-label">Total Transactions</div>
        <div class="stat-card-value">${stats.totalTransactions}</div>
      </div>
    `;
  }

  // ─── Tabs ─────────────────────────────────────────────────────
  function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.admin-tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('active');
    // Refresh on open
    if (tab === 'database') renderDatabase(document.getElementById('db-search')?.value || '');
    if (tab === 'users') renderUsers(document.getElementById('users-search')?.value || '');
    if (tab === 'transactions') renderTransactions();
  }

  // ─── Pending Deposits ─────────────────────────────────────────
  function renderDeposits() {
    const deposits = Auth.adminGetPendingDeposits();
    const container = document.getElementById('panel-deposits');
    if (deposits.length === 0) {
      container.innerHTML = emptyState('✅', 'No pending deposits');
      return;
    }
    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>User</th><th>Amount</th><th>Currency</th><th>TX Hash</th><th>Date</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${deposits.map(d => `
              <tr>
                <td><button class="link-btn" onclick="Admin.openProfileModal('${d.username}')">${d.username}</button></td>
                <td class="amount">$${d.amount.toLocaleString()}</td>
                <td>${d.currency}</td>
                <td><span class="tx-hash" title="${d.txHash}">${d.txHash}</span></td>
                <td>${new Date(d.createdAt).toLocaleString()}</td>
                <td>
                  <div class="admin-actions">
                    <button class="admin-btn admin-btn-success admin-btn-sm" onclick="Admin.approveDeposit('${d.id}')">✅ Approve</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="Admin.rejectDeposit('${d.id}')">❌ Reject</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function approveDeposit(id) {
    if (confirm('Approve this deposit? Virtual credits will be added to the player.')) {
      Auth.adminApproveDeposit(id);
      renderDeposits(); renderStats(); renderTransactions(); renderUsers('');
    }
  }

  function rejectDeposit(id) {
    if (confirm('Reject this deposit?')) {
      Auth.adminRejectDeposit(id);
      renderDeposits(); renderStats(); renderTransactions();
    }
  }

  // ─── Pending Withdrawals ──────────────────────────────────────
  function renderWithdrawals() {
    const withdrawals = Auth.adminGetPendingWithdrawals();
    const container = document.getElementById('panel-withdrawals');
    if (withdrawals.length === 0) {
      container.innerHTML = emptyState('✅', 'No pending withdrawals');
      return;
    }
    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>User</th><th>Amount</th><th>Currency</th><th>Their Wallet Address</th><th>Date</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${withdrawals.map(w => `
              <tr>
                <td><button class="link-btn" onclick="Admin.openProfileModal('${w.username}')">${w.username}</button></td>
                <td class="amount">$${w.amount.toLocaleString()}</td>
                <td>${w.currency}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span class="tx-hash" title="${w.walletAddress}">${w.walletAddress}</span>
                    <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="navigator.clipboard.writeText('${w.walletAddress}')">📋</button>
                  </div>
                </td>
                <td>${new Date(w.createdAt).toLocaleString()}</td>
                <td>
                  <div class="admin-actions">
                    <button class="admin-btn admin-btn-success admin-btn-sm" onclick="Admin.approveWithdrawal('${w.id}')">✅ Sent</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="Admin.rejectWithdrawal('${w.id}')">❌ Reject</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function approveWithdrawal(id) {
    if (confirm('Mark as sent? Confirm you have manually sent the crypto to the player\'s wallet.')) {
      Auth.adminApproveWithdrawal(id);
      renderWithdrawals(); renderStats(); renderTransactions();
    }
  }

  function rejectWithdrawal(id) {
    if (confirm('Reject this withdrawal? Virtual balance will be refunded to the player.')) {
      Auth.adminRejectWithdrawal(id);
      renderWithdrawals(); renderStats(); renderTransactions(); renderUsers('');
    }
  }

  // ─── Players Panel ────────────────────────────────────────────
  function renderUsers(query) {
    let users = Auth.adminGetAllUsers();
    if (query) {
      const q = query.toLowerCase();
      users = users.filter(u => u.username.includes(q) || u.email.includes(q));
    }
    const container = document.getElementById('users-table-container');
    if (!container) return;
    if (users.length === 0) {
      container.innerHTML = emptyState('👥', query ? 'No players match your search' : 'No players yet');
      return;
    }
    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Username</th><th>Email</th><th>Balance</th>
            <th>Deposits</th><th>Withdrawals</th>
            <th>Status</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><button class="link-btn" onclick="Admin.openProfileModal('${u.username}')">${u.username}</button></td>
                <td>${u.email}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px">
                    <input class="admin-inline-input" type="number" id="bal-${u.username}" value="${u.balance}" min="0" step="1">
                    <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="Admin.setBalance('${u.username}')">Set</button>
                  </div>
                </td>
                <td>${u.depositsCount} <span class="dim">(+$${u.totalDeposited.toLocaleString()})</span></td>
                <td>${u.withdrawalsCount} <span class="dim">(-$${u.totalWithdrawn.toLocaleString()})</span></td>
                <td><span class="user-badge ${u.banned ? 'badge-banned' : 'badge-active'}">${u.banned ? '🚫 Banned' : '✅ Active'}</span></td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="admin-actions">
                    <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="Admin.openProfileModal('${u.username}')">👁 View</button>
                    <button class="admin-btn ${u.banned ? 'admin-btn-success' : 'admin-btn-danger'} admin-btn-sm" onclick="Admin.toggleBan('${u.username}')">
                      ${u.banned ? '✅ Unban' : '🚫 Ban'}
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function filterUsers(query) {
    renderUsers(query);
  }

  function setBalance(username) {
    const input = document.getElementById('bal-' + username);
    if (!input) return;
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) { alert('Invalid amount'); return; }
    Auth.adminSetUserBalance(username, val);
    renderUsers(document.getElementById('users-search')?.value || '');
    renderStats();
  }

  function toggleBan(username) {
    Auth.adminToggleBan(username);
    renderUsers(document.getElementById('users-search')?.value || '');
  }

  // ─── All Transactions Panel ────────────────────────────────────
  function setTxTypeFilter(btn, value) {
    txTypeFilter = value;
    document.querySelectorAll('#tx-type-chips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTransactions();
  }

  function setTxStatusFilter(btn, value) {
    txStatusFilter = value;
    document.querySelectorAll('#tx-status-chips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTransactions();
  }

  function filterTransactions() {
    renderTransactions();
  }

  function renderTransactions() {
    let transactions = Auth.adminGetAllTransactions();
    const query = (document.getElementById('tx-search')?.value || '').toLowerCase();
    if (query) transactions = transactions.filter(t => t.username.toLowerCase().includes(query));
    if (txTypeFilter) transactions = transactions.filter(t => t.type === txTypeFilter);
    if (txStatusFilter) transactions = transactions.filter(t => t.status === txStatusFilter);

    const container = document.getElementById('tx-table-container');
    if (!container) return;
    if (transactions.length === 0) {
      container.innerHTML = emptyState('📋', 'No transactions match your filters');
      return;
    }
    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Type</th><th>User</th><th>Amount</th><th>Currency</th>
            <th>Status</th><th>Date</th><th>Details</th>
          </tr></thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${t.type === 'deposit' ? '💳 Deposit' : '💸 Withdrawal'}</td>
                <td><button class="link-btn" onclick="Admin.openProfileModal('${t.username}')">${t.username}</button></td>
                <td class="amount">$${t.amount.toLocaleString()}</td>
                <td>${t.currency || '—'}</td>
                <td><span class="status status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.createdAt).toLocaleString()}</td>
                <td><span class="tx-hash" title="${t.txHash || t.walletAddress || ''}">${t.txHash || t.walletAddress || '—'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ─── Database Panel ────────────────────────────────────────────
  function renderDatabase(query) {
    renderDbStats();
    renderDbTable(query);
  }

  function filterDatabase(query) {
    renderDbTable(query);
  }

  function renderDbStats() {
    const dbStats = Auth.adminGetDatabaseStats();
    const container = document.getElementById('db-stats');
    if (!container) return;
    container.innerHTML = `
      <div class="db-stat-card">
        <div class="db-stat-icon">🏦</div>
        <div class="db-stat-body">
          <div class="db-stat-label">Real Crypto Received (Approved)</div>
          <div class="db-stat-value">$${dbStats.realCryptoIn.toLocaleString()}</div>
        </div>
      </div>
      <div class="db-stat-card">
        <div class="db-stat-icon">🎮</div>
        <div class="db-stat-body">
          <div class="db-stat-label">Virtual Credits In Play</div>
          <div class="db-stat-value">$${dbStats.virtualInPlay.toLocaleString()}</div>
        </div>
      </div>
      <div class="db-stat-card">
        <div class="db-stat-icon">📤</div>
        <div class="db-stat-body">
          <div class="db-stat-label">Real Crypto Sent Out (Approved)</div>
          <div class="db-stat-value">$${dbStats.realCryptoOut.toLocaleString()}</div>
        </div>
      </div>
      <div class="db-stat-card">
        <div class="db-stat-icon">📊</div>
        <div class="db-stat-body">
          <div class="db-stat-label">House Profit</div>
          <div class="db-stat-value" style="color:${dbStats.houseProfit >= 0 ? 'var(--clr-green)' : 'var(--clr-red)'}">
            ${dbStats.houseProfit >= 0 ? '+' : ''}$${dbStats.houseProfit.toLocaleString()}
          </div>
        </div>
      </div>
    `;
  }

  function renderDbTable(query) {
    let users = Auth.adminGetAllUsers();
    if (query) {
      const q = query.toLowerCase();
      users = users.filter(u => u.username.includes(q) || u.email.includes(q));
    }
    const container = document.getElementById('db-table-container');
    if (!container) return;
    if (users.length === 0) {
      container.innerHTML = emptyState('🗄️', query ? 'No players match your search' : 'Database is empty');
      return;
    }
    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>#</th>
            <th>Username</th>
            <th>Email</th>
            <th>Virtual Balance</th>
            <th>Deposited (Real)</th>
            <th>Withdrawn (Real)</th>
            <th>Deposits</th>
            <th>Withdrawals</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Profile</th>
          </tr></thead>
          <tbody>
            ${users.map((u, i) => `
              <tr>
                <td class="dim">${i + 1}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td class="amount">$${u.balance.toLocaleString()}</td>
                <td style="color:var(--clr-green)">+$${u.totalDeposited.toLocaleString()}</td>
                <td style="color:var(--clr-red)">-$${u.totalWithdrawn.toLocaleString()}</td>
                <td><span class="count-badge">${u.depositsCount}</span></td>
                <td><span class="count-badge">${u.withdrawalsCount}</span></td>
                <td><span class="user-badge ${u.banned ? 'badge-banned' : 'badge-active'}">${u.banned ? '🚫 Banned' : '✅ Active'}</span></td>
                <td>${new Date(u.createdAt).toLocaleString()}</td>
                <td>
                  <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="Admin.openProfileModal('${u.username}')">👁 View</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ─── Player Profile Modal ──────────────────────────────────────
  function openProfileModal(username) {
    const profile = Auth.adminGetPlayerProfile(username);
    if (!profile) return;

    document.getElementById('profile-avatar').textContent = profile.username[0].toUpperCase();
    document.getElementById('profile-username').textContent = profile.username;
    document.getElementById('profile-email').textContent = profile.email;
    document.getElementById('profile-joined').textContent = 'Joined ' + new Date(profile.createdAt).toLocaleString();
    document.getElementById('profile-balance').textContent = '$' + profile.balance.toLocaleString();
    document.getElementById('profile-deposited').textContent = '+$' + profile.totalDeposited.toLocaleString();
    document.getElementById('profile-withdrawn').textContent = '-$' + profile.totalWithdrawn.toLocaleString();
    document.getElementById('profile-status').innerHTML = profile.banned
      ? '<span class="user-badge badge-banned">🚫 Banned</span>'
      : '<span class="user-badge badge-active">✅ Active</span>';

    document.getElementById('profile-dep-count').textContent = profile.deposits.length;
    document.getElementById('profile-wdr-count').textContent = profile.withdrawals.length;

    // Deposits tab
    const depPanel = document.getElementById('profile-panel-deposits');
    if (profile.deposits.length === 0) {
      depPanel.innerHTML = emptyState('💳', 'No deposits yet');
    } else {
      depPanel.innerHTML = `
        <div class="profile-tx-list">
          ${profile.deposits.map(d => `
            <div class="profile-tx-row">
              <div class="profile-tx-left">
                <span class="profile-tx-type">💳 Deposit</span>
                <span class="profile-tx-currency">${d.currency}</span>
                <span class="tx-hash" title="${d.txHash}">${d.txHash}</span>
              </div>
              <div class="profile-tx-right">
                <span class="profile-tx-amount">+$${d.amount.toLocaleString()}</span>
                <span class="status status-${d.status}">${d.status}</span>
                <span class="profile-tx-date">${new Date(d.createdAt).toLocaleString()}</span>
              </div>
            </div>`).join('')}
        </div>`;
    }

    // Withdrawals tab
    const wdrPanel = document.getElementById('profile-panel-withdrawals');
    if (profile.withdrawals.length === 0) {
      wdrPanel.innerHTML = emptyState('💸', 'No withdrawals yet');
    } else {
      wdrPanel.innerHTML = `
        <div class="profile-tx-list">
          ${profile.withdrawals.map(w => `
            <div class="profile-tx-row">
              <div class="profile-tx-left">
                <span class="profile-tx-type">💸 Withdrawal</span>
                <span class="profile-tx-currency">${w.currency}</span>
                <span class="tx-hash" title="${w.walletAddress}">${w.walletAddress}</span>
              </div>
              <div class="profile-tx-right">
                <span class="profile-tx-amount" style="color:var(--clr-red)">-$${w.amount.toLocaleString()}</span>
                <span class="status status-${w.status}">${w.status}</span>
                <span class="profile-tx-date">${new Date(w.createdAt).toLocaleString()}</span>
              </div>
            </div>`).join('')}
        </div>`;
    }

    // Reset to deposits tab
    switchProfileTab('deposits', document.querySelector('.profile-tab'));
    document.getElementById('profile-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProfileModal(e) {
    if (e && e.target !== document.getElementById('profile-modal')) return;
    document.getElementById('profile-modal').classList.remove('active');
    document.body.style.overflow = '';
  }

  function switchProfileTab(tab, btn) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById(`profile-panel-${tab}`)?.classList.add('active');
  }

  // ─── Logout ───────────────────────────────────────────────────
  function logout() {
    Auth.signOut();
    window.location.href = 'index.html';
  }

  // ─── Helpers ──────────────────────────────────────────────────
  function emptyState(icon, text) {
    return `<div class="admin-empty"><div class="admin-empty-icon">${icon}</div><div class="admin-empty-text">${text}</div></div>`;
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchTab,
    approveDeposit, rejectDeposit,
    approveWithdrawal, rejectWithdrawal,
    setBalance, toggleBan,
    filterUsers, filterTransactions,
    setTxTypeFilter, setTxStatusFilter,
    filterDatabase,
    openProfileModal, closeProfileModal, switchProfileTab,
    logout
  };
})();
