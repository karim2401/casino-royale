/**
 * db/init.js — run once to create tables
 * Usage: node src/db/init.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs   = require('fs');
const path = require('path');
const db   = require('./index');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('✅  Database schema initialised successfully.');
  } catch (err) {
    console.error('❌  Schema init error:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

init();
