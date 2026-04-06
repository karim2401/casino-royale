const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway provides SSL in production — require it there, disable locally
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
