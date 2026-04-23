const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'casino-royale-secret-key-super-secure',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Setup default admin if not exists
db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)",
            ['admin', 'admin@casino.com', hash, 1]);
    }
});

// Middleware
const authMiddleware = (req, res, next) => {
    if (req.session.userId) next();
    else res.status(401).json({ ok: false, error: 'Unauthorized' });
};

const adminMiddleware = (req, res, next) => {
    if (req.session.userId && req.session.isAdmin) next();
    else res.status(403).json({ ok: false, error: 'Forbidden' });
};

// --- AUTH API ROUTES ---
app.post('/api/auth/signup', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ ok: false, error: 'All fields required' });
    
    if (username.length < 3 || username.length > 20 || !/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ ok: false, error: 'Invalid username format' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", [username.toLowerCase(), email.toLowerCase(), hash], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ ok: false, error: 'Username or email already exists' });
            return res.status(500).json({ ok: false, error: 'Database error' });
        }
        req.session.userId = this.lastID;
        res.json({ ok: true });
    });
});

app.post('/api/auth/signin', (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, error: 'All fields required' });
    username = username.toLowerCase();
    db.get("SELECT * FROM users WHERE username = ? OR email = ?", [username, username], (err, user) => {
        if (err || !user) return res.status(400).json({ ok: false, error: 'Account not found' });
        if (user.is_banned) return res.status(403).json({ ok: false, error: 'Account suspended' });
        
        if (bcrypt.compareSync(password, user.password_hash)) {
            req.session.userId = user.id;
            req.session.isAdmin = user.is_admin;
            res.json({ ok: true, isAdmin: user.is_admin });
        } else {
            res.status(400).json({ ok: false, error: 'Incorrect password' });
        }
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// --- USER API ROUTES ---
app.get('/api/user/me', authMiddleware, (req, res) => {
    db.get("SELECT id, username, email, balance, is_admin, is_banned, binance_id, created_at FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (err || !user) return res.status(404).json({ ok: false, error: 'User not found' });
        
        db.all("SELECT * FROM transactions WHERE user_id = ? AND type = 'deposit'", [user.id], (err, deposits) => {
            db.all("SELECT * FROM transactions WHERE user_id = ? AND type = 'withdrawal'", [user.id], (err, withdrawals) => {
                user.deposits = deposits || [];
                user.withdrawals = withdrawals || [];
                // map keys for existing frontend
                user.deposits.forEach(d => { d.createdAt = d.created_at; d.txHash = d.wallet_or_hash; });
                user.withdrawals.forEach(w => { w.createdAt = w.created_at; w.walletAddress = w.wallet_or_hash; });
                res.json({ ok: true, user });
            });
        });
    });
});

app.post('/api/user/balance', authMiddleware, (req, res) => {
    const { amount } = req.body;
    db.run("UPDATE users SET balance = GREATEST(0, balance + ?) WHERE id = ?", [amount, req.session.userId], function(err) {
        if (err) return res.status(500).json({ ok: false, error: 'Update failed' });
        db.get("SELECT balance FROM users WHERE id = ?", [req.session.userId], (err, row) => {
            res.json({ ok: true, balance: row.balance });
        });
    });
});

app.post('/api/user/binance', authMiddleware, (req, res) => {
    const { binance_id } = req.body;
    db.run("UPDATE users SET binance_id = ? WHERE id = ?", [binance_id, req.session.userId], function(err) {
        if (err) return res.status(500).json({ ok: false, error: 'Update failed' });
        res.json({ ok: true });
    });
});

app.post('/api/banking/deposit', authMiddleware, (req, res) => {
    const { amount, currency, txHash } = req.body;
    db.run("INSERT INTO transactions (user_id, type, amount, currency, wallet_or_hash, status) VALUES (?, 'deposit', ?, ?, ?, 'pending')", 
        [req.session.userId, amount, currency, txHash], 
        function(err) {
            if (err) return res.json({ ok: false, error: 'Database error' });
            res.json({ ok: true });
    });
});

app.post('/api/banking/withdraw', authMiddleware, (req, res) => {
    const { amount, currency, walletAddress } = req.body;
    db.get("SELECT balance FROM users WHERE id = ?", [req.session.userId], (err, row) => {
        if (err || !row || row.balance < amount) return res.json({ ok: false, error: 'Insufficient balance' });
        
        db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, req.session.userId], (err) => {
            db.run("INSERT INTO transactions (user_id, type, amount, currency, wallet_or_hash, status) VALUES (?, 'withdrawal', ?, ?, ?, 'pending')",
                [req.session.userId, amount, currency, walletAddress], function(err) {
                    res.json({ ok: true });
                });
        });
    });
});

// --- ADMIN API ROUTES ---
app.get('/api/admin/data', adminMiddleware, (req, res) => {
    db.all("SELECT id, username, email, balance, is_admin, is_banned as banned, created_at as createdAt FROM users", (err, users) => {
        db.all("SELECT t.id, t.user_id, t.type, t.amount, t.currency, t.wallet_or_hash, t.status, t.created_at as createdAt, u.username FROM transactions t JOIN users u ON t.user_id = u.id", (err, transactions) => {
            res.json({ ok: true, users, transactions });
        });
    });
});

app.post('/api/admin/action', adminMiddleware, (req, res) => {
    const { action, targetId, payload } = req.body;
    
    if (action === 'approveDeposit') {
        db.get("SELECT user_id, amount, status FROM transactions WHERE id = ?", [targetId], (err, tx) => {
            if (tx && tx.status === 'pending') {
                db.run("UPDATE transactions SET status = 'approved' WHERE id = ?", [targetId]);
                db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);
                return res.json({ok: true});
            }
            res.json({ok: false, error: 'Tx not found/pending'});
        });
    } else if (action === 'rejectDeposit') {
        db.run("UPDATE transactions SET status = 'rejected' WHERE id = ?", [targetId]);
        res.json({ok: true});
    } else if (action === 'approveWithdrawal') {
        db.run("UPDATE transactions SET status = 'approved' WHERE id = ?", [targetId]);
        res.json({ok: true});
    } else if (action === 'rejectWithdrawal') {
        db.get("SELECT user_id, amount, status FROM transactions WHERE id = ?", [targetId], (err, tx) => {
            if (tx && tx.status === 'pending') {
                db.run("UPDATE transactions SET status = 'rejected' WHERE id = ?", [targetId]);
                db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]); // refund
                return res.json({ok: true});
            }
            res.json({ok: false, error: 'Tx not found/pending'});
        });
    } else if (action === 'setBalance') {
        db.run("UPDATE users SET balance = ? WHERE username = ?", [payload.balance, payload.username]);
        res.json({ok: true});
    } else if (action === 'toggleBan') {
        db.run("UPDATE users SET is_banned = NOT is_banned WHERE username = ?", [payload.username]);
        res.json({ok: true});
    }
});

app.listen(PORT, () => {
    console.log(`Casino Server running on http://localhost:${PORT}`);
});
