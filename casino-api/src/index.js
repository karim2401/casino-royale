require('dotenv').config();

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');

const socketService = require('./services/socket');

// Routes
const authRoutes   = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const gamesRoutes  = require('./routes/games');
const adminRoutes  = require('./routes/admin');

const app    = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const FRONTEND = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Socket.IO (must be before routes that call getIO()) ──────────────────────
socketService.init(server);

// ─── Health check (Railway uses this) ────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/wallet',  walletRoutes);
app.use('/api/games',   gamesRoutes);
app.use('/api/admin',   adminRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   🎰  Casino Royale API  Online!       ║
  ║   Port   : ${PORT}                        ║
  ║   Env    : ${(process.env.NODE_ENV || 'development').padEnd(11)}               ║
  ╚════════════════════════════════════════╝
  `);
});
