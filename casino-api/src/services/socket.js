/**
 * Socket.IO service
 *
 * Rooms:
 *   user-{id}   — private room per logged-in user
 *   admin-room  — all connected admins
 *
 * Events emitted by server:
 *   balance:update      → user room
 *   leaderboard:update  → broadcast (all)
 *   admin:new_deposit   → admin-room
 *   admin:new_withdrawal→ admin-room
 */
const jwt = require('jsonwebtoken');

let _io = null;

function init(server) {
  const { Server } = require('socket.io');
  const FRONTEND = process.env.FRONTEND_ORIGIN || '*';

  _io = new Server(server, {
    cors: {
      origin: FRONTEND,
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections via JWT query param or auth header
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  _io.on('connection', (socket) => {
    const { id, username, is_admin } = socket.user;
    console.log(`🔌 Socket connected: ${username} (${socket.id})`);

    // Join personal room
    socket.join(`user-${id}`);

    // Admins join the admin room
    if (is_admin) {
      socket.join('admin-room');
      console.log(`👑 Admin ${username} joined admin-room`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${username}`);
    });
  });

  return _io;
}

function getIO() {
  if (!_io) throw new Error('Socket.IO not yet initialized');
  return _io;
}

module.exports = { init, getIO };
