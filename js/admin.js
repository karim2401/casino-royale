/* ============================================
   CASINO ROYALE — Admin Panel Controller
   ============================================ */

const Admin = (() => {
  function init() {
    // Check admin auth
    if (!Auth.isAdmin()) {
      window.location.href = 'index.html';
      return;
    }
    renderStats();
    renderDeposits();
    renderWithdrawals();
    renderUsers();
    renderTransactions();
  }

  // --- Stats ---
  function renderStats() {
    const stats = Auth.adminGetStats();
    const container = document.getElementById('admin-stats');
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">👥</div>
        <div class="stat-card-label">Total Users</div>
        <div class="stat-card-value">${stats.totalUsers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💰</div>
        <div class="stat-card-label">Total User Balance</div>
        <div class="stat-card-value">$${stats.totalBalance.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💳</div>
        <div class="stat-card-label">Pending Deposits</div>
        <div class="stat-card-value" style="color: ${stats.pendingDeposits > 0 ? '#ffc800' : 'inherit'}">${stats.pendingDeposits}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💸</div>
        <div class="stat-card-label">Pending Withdrawals</div>
        <div class="stat-card-value" style="color: ${stats.pendingWithdrawals > 0 ? '#ffc800' : 'inherit'}">${stats.pendingWithdrawals}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📈</div>
        <div class="stat-card-label">Total Deposited</div>
        <div class="stat-card-value">$${stats.totalDeposited.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📉</div>
        <div class="stat-card-label">Total Withdrawn</div>
        <div class="stat-card-value">$${stats.totalWithdrawn.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📋</div>
        <div class="stat-card-label">Total Transactions</div>
        <div class="stat-card-value">${stats.totalTransactions}</div>
      </div>
    `;
  }

  // --- Tabs ---
  function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.admin-tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('active');
  }

  // --- Pending Deposits ---
  function renderDeposits() {
    const deposits = Auth.adminGetPendingDeposits();
    const container = document.getElementById('panel-deposits');

    if (deposits.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">✅</div>
          <div class="admin-empty-text">No pending deposits</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>TX Hash</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${deposits.map(d => `
              <tr>
                <td><strong>${d.username}</strong></td>
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
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function approveDeposit(id) {
    if (confirm('Approve this deposit? Funds will be credited to the user.')) {
      Auth.adminApproveDeposit(id);
      renderDeposits();
      renderStats();
      renderTransactions();
      renderUsers();
    }
  }

  function rejectDeposit(id) {
    if (confirm('Reject this deposit?')) {
      Auth.adminRejectDeposit(id);
      renderDeposits();
      renderStats();
      renderTransactions();
    }
  }

  // --- Pending Withdrawals ---
  function renderWithdrawals() {
    const withdrawals = Auth.adminGetPendingWithdrawals();
    const container = document.getElementById('panel-withdrawals');

    if (withdrawals.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">✅</div>
          <div class="admin-empty-text">No pending withdrawals</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Wallet Address</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${withdrawals.map(w => `
              <tr>
                <td><strong>${w.username}</strong></td>
                <td class="amount">$${w.amount.toLocaleString()}</td>
                <td>${w.currency}</td>
                <td><span class="tx-hash" title="${w.walletAddress}">${w.walletAddress}</span></td>
                <td>${new Date(w.createdAt).toLocaleString()}</td>
                <td>
                  <div class="admin-actions">
                    <button class="admin-btn admin-btn-success admin-btn-sm" onclick="Admin.approveWithdrawal('${w.id}')">✅ Approve</button>
                    <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="Admin.rejectWithdrawal('${w.id}')">❌ Reject</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function approveWithdrawal(id) {
    if (confirm('Approve this withdrawal? Make sure you have sent the funds to the user.')) {
      Auth.adminApproveWithdrawal(id);
      renderWithdrawals();
      renderStats();
      renderTransactions();
    }
  }

  function rejectWithdrawal(id) {
    if (confirm('Reject this withdrawal? Funds will be refunded to the user.')) {
      Auth.adminRejectWithdrawal(id);
      renderWithdrawals();
      renderStats();
      renderTransactions();
      renderUsers();
    }
  }

  // --- Users ---
  function renderUsers() {
    const users = Auth.adminGetAllUsers();
    const container = document.getElementById('panel-users');

    if (users.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">👥</div>
          <div class="admin-empty-text">No users yet</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Balance</th>
              <th>Deposits</th>
              <th>Withdrawals</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <input class="admin-inline-input" type="number" id="bal-${u.username}" value="${u.balance}" min="0" step="1">
                    <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="Admin.setBalance('${u.username}')">Set</button>
                  </div>
                </td>
                <td>${u.depositsCount} ($${u.totalDeposited.toLocaleString()})</td>
                <td>${u.withdrawalsCount} ($${u.totalWithdrawn.toLocaleString()})</td>
                <td>
                  <span class="user-badge ${u.banned ? 'badge-banned' : 'badge-active'}">
                    ${u.banned ? '🚫 Banned' : '✅ Active'}
                  </span>
                </td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button class="admin-btn ${u.banned ? 'admin-btn-success' : 'admin-btn-danger'} admin-btn-sm" onclick="Admin.toggleBan('${u.username}')">
                    ${u.banned ? '✅ Unban' : '🚫 Ban'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function setBalance(username) {
    const input = document.getElementById('bal-' + username);
    if (!input) return;
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) { alert('Invalid amount'); return; }
    Auth.adminSetUserBalance(username, val);
    renderUsers();
    renderStats();
  }

  function toggleBan(username) {
    const result = Auth.adminToggleBan(username);
    if (result.ok) {
      renderUsers();
    }
  }

  // --- All Transactions ---
  function renderTransactions() {
    const transactions = Auth.adminGetAllTransactions();
    const container = document.getElementById('panel-transactions');

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">📋</div>
          <div class="admin-empty-text">No transactions yet</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>User</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${t.type === 'deposit' ? '💳 Deposit' : '💸 Withdrawal'}</td>
                <td><strong>${t.username}</strong></td>
                <td class="amount">$${t.amount.toLocaleString()}</td>
                <td>${t.currency || '—'}</td>
                <td><span class="status status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.createdAt).toLocaleString()}</td>
                <td><span class="tx-hash" title="${t.txHash || t.walletAddress || ''}">${t.txHash || t.walletAddress || '—'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // --- Logout ---
  function logout() {
    Auth.signOut();
    window.location.href = 'index.html';
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchTab,
    approveDeposit, rejectDeposit,
    approveWithdrawal, rejectWithdrawal,
    setBalance, toggleBan,
    logout
  };
})();
