const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'if0_41729806_royal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Connected to the MySQL database (if0_41729806_royal).');

// --- Create Tables ---
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    binance_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

const createTransactionsTable = `
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type VARCHAR(50),
    amount DECIMAL(15,2),
    currency VARCHAR(50),
    wallet_or_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
`;

const createGamesTable = `
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    game VARCHAR(100),
    bet_amount DECIMAL(15,2),
    win_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
`;

pool.query(createUsersTable, (err) => {
    if (err) console.error("Error creating users table:", err);
});
pool.query(createTransactionsTable, (err) => {
    if (err) console.error("Error creating transactions table:", err);
});
pool.query(createGamesTable, (err) => {
    if (err) console.error("Error creating games table:", err);
});

// --- SQLite Adapter ---
// This adapter mimics the 'sqlite3' API so that we don't have to rewrite 
// all the existing queries in server.js!
const db = {
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, function(err, results) {
            if (callback) {
                // SQLite provides 'this.lastID' and 'this.changes' in the callback context.
                // We mimic that using MySQL's insertId and affectedRows.
                const context = results ? { lastID: results.insertId, changes: results.affectedRows } : {};
                callback.call(context, err);
            }
        });
    },
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, (err, results) => {
            if (err) return callback(err);
            // .get() returns the first row
            callback(null, results && results.length > 0 ? results[0] : null);
        });
    },
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, (err, results) => {
            callback(err, results);
        });
    }
};

module.exports = db;
