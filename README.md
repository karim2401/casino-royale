# 🎰 Casino Royale

> **Full-stack online casino platform** — Vanilla HTML/CSS/JS frontend + Node.js/Express/PostgreSQL backend with real-time Socket.IO updates.

![Casino Royale Banner](https://img.shields.io/badge/Casino%20Royale-Premium%20Experience-d4af37?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48dGV4dCB5PScuOWVtJyBmb250LXNpemU9JzkwJz7wn46wPC90ZXh0Pjwvc3ZnPg==)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20PostgreSQL-339933?style=for-the-badge&logo=node.js)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Games](#-games)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [🚀 Running Locally](#-running-locally)
- [☁️ Deploy to Railway](#️-deploy-to-railway)
- [API Reference](#-api-reference)
- [Admin Panel](#-admin-panel)
- [Currencies & Payments](#-currencies--payments)
- [Responsible Gambling](#-responsible-gambling)

---

## 🌟 Overview

Casino Royale is a **full-stack casino platform** with a secure Node.js backend. Users can register, deposit (via crypto), play four casino games with **server-side RNG** (no cheating possible), track winnings on a live leaderboard, and withdraw funds — all managed through a built-in admin dashboard with real-time Socket.IO updates.

The site features:
- 🔐 **JWT authentication** — secure sessions, no localStorage manipulation
- 🎮 **4 fully playable casino games** with server-side RNG
- 💰 **Atomic balance operations** — database-level transaction safety
- 🏆 **Real-time leaderboard** via Socket.IO WebSockets
- 👑 **Admin panel** for managing users, deposits & withdrawals
- 🌍 **Multi-language support** (English & French)
- 📱 **Responsive** — mobile-first design

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth System** | JWT-based sign up / sign in with bcrypt password hashing |
| 💰 **Wallet** | Real-time balance via Socket.IO push updates |
| 💳 **Deposits** | Multi-crypto deposit flow with admin approval |
| 💸 **Withdrawals** | Withdrawal requests with atomic balance deduction |
| 📋 **Transactions** | Full deposit/withdrawal history per user |
| 🏆 **Leaderboard** | Top 10 biggest wins — live-updated across all users |
| 🎨 **Animations** | Particle canvas background, confetti, win overlays |
| 📱 **Responsive** | Mobile-first, hamburger menu, touch-friendly |
| 🌍 **i18n** | English/French language toggle |
| 👑 **Admin Panel** | User management, real-time tx approval/rejection |

---

## 🎮 Games

| Game | Min Bet | Top Payout |
|---|---|---|
| 🎰 Lucky Slots | $1 | 100× (⭐⭐⭐) |
| 🃏 Blackjack | $5 | 2.5× (natural blackjack) |
| 🎡 Roulette | $1 | 36× (single number) |
| 🎲 Dice | $1 | 5× (exactly 7) |

> All game outcomes are computed **server-side** — outcomes cannot be predicted or manipulated by the client.

---

## 📁 Project Structure

```
casino-royale/
├── index.html              # Main player-facing page
├── admin.html              # Admin dashboard
├── README.md
│
├── css/                    # All styles
│   ├── index.css
│   ├── layout.css
│   ├── games.css
│   ├── animations.css
│   └── admin.css
│
├── js/                     # Frontend JavaScript
│   ├── api.js              # ← API client (replaces localStorage)
│   ├── app.js              # App controller
│   ├── auth.js             # Auth UI logic
│   ├── slots.js            # Slots game UI
│   ├── blackjack.js        # Blackjack game UI
│   ├── roulette.js         # Roulette game UI
│   ├── dice.js             # Dice game UI
│   └── admin.js            # Admin panel UI
│
└── casino-api/             # 🔥 Backend (Node.js + Express)
    ├── package.json
    ├── .env.example        # ← copy to .env and fill in
    ├── railway.json        # Railway deployment config
    │
    └── src/
        ├── index.js        # Entry point (Express + Socket.IO)
        ├── db/
        │   ├── schema.sql  # PostgreSQL schema
        │   ├── index.js    # DB connection pool
        │   └── init.js     # One-shot schema setup script
        ├── middleware/
        │   ├── auth.js     # JWT verification
        │   ├── admin.js    # Admin guard
        │   └── rateLimit.js
        ├── routes/
        │   ├── auth.js     # /api/auth/*
        │   ├── wallet.js   # /api/wallet/*
        │   ├── games.js    # /api/games/*
        │   └── admin.js    # /api/admin/*
        └── services/
            ├── socket.js   # Socket.IO server
            └── games/
                ├── slots.js
                ├── dice.js
                ├── roulette.js
                └── blackjack.js
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | PostgreSQL 16 |
| **Real-time** | Socket.IO 4 |
| **Auth** | JWT + bcryptjs |
| **Deployment** | Railway (backend + DB) |
| **Fonts** | Google Fonts (Cinzel + Inter) |

---

## 🚀 Running Locally

### Prerequisites

| Tool | Purpose | Required? |
|---|---|---|
| Node.js 18+ | Run the backend | ✅ Yes |
| Docker Desktop | Run PostgreSQL | ✅ Yes (easiest) |
| Git | Clone the repo | ✅ Yes |

> **No local PostgreSQL installation needed** — Docker handles it.

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/karim2401/casino-royale.git
cd casino-royale
```

---

### Step 2 — Start the database (Docker)

```bash
# Pull and start a PostgreSQL container
docker run -d \
  --name casino-royale-db \
  -e POSTGRES_USER=casino \
  -e POSTGRES_PASSWORD=casino123 \
  -e POSTGRES_DB=casino_royale \
  -p 5433:5432 \
  --restart unless-stopped \
  postgres:16-alpine
```

> **Windows PowerShell** — use backtick `` ` `` instead of `\` for line continuation, or run it as one line:
> ```powershell
> docker run -d --name casino-royale-db -e POSTGRES_USER=casino -e POSTGRES_PASSWORD=casino123 -e POSTGRES_DB=casino_royale -p 5433:5432 --restart unless-stopped postgres:16-alpine
> ```

---

### Step 3 — Configure the backend

```bash
cd casino-api

# Copy the example env file
cp .env.example .env        # Mac/Linux
copy .env.example .env      # Windows
```

The `.env` is pre-filled for the Docker container above — **no changes needed** if you used the exact `docker run` command in Step 2.

```env
DATABASE_URL=postgresql://casino:casino123@localhost:5433/casino_royale
JWT_SECRET=casino_royale_dev_secret_change_in_production_2026
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=*
```

---

### Step 4 — Install dependencies & create tables

```bash
# Still inside casino-api/
npm install           # Install backend packages
npm run db:init       # Create database tables (run once)
```

Expected output:
```
✅  Database schema initialised successfully.
```

---

### Step 5 — Start the backend

```bash
npm run dev
```

Expected output:
```
╔════════════════════════════════════════╗
║   🎰  Casino Royale API  Online!       ║
║   Port   : 3001                        ║
║   Env    : development                 ║
╚════════════════════════════════════════╝
```

Health check: open `http://localhost:3001/health` — should return `{"status":"ok"}`.

---

### Step 6 — Serve the frontend

Open a **second terminal**:

```bash
# From the casino-royale/ root (NOT casino-api/)
npx serve . -p 8080
```

Then open **[http://localhost:8080](http://localhost:8080)** in your browser. 🎉

---

### ⚠️ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---|---|
| Run `npm install` in `casino-royale/` root | Run it in `casino-royale/casino-api/` |
| Run `npm run dev` twice | Only one instance on port 3001 — kill old ones first |
| Run `node src/db/init.js` without `.env` | Fill in `.env` first (Step 3) |
| Port 3001 already in use | Run: `Get-NetTCPConnection -LocalPort 3001 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |

---

### Restart After a Reboot

```bash
# 1. Restart the DB container (don't re-create it)
docker start casino-royale-db

# 2. Start backend (in casino-api/)
cd casino-royale/casino-api
npm run dev

# 3. Open frontend (in a second terminal, from casino-royale/)
npx serve . -p 8080
```

---

## ☁️ Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Add a **PostgreSQL** plugin to your project
4. Add a second service → set **Root Directory** to `casino-api`
5. Railway auto-detects `railway.json` and uses `node src/index.js`
6. Set these **environment variables** in the Railway dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-provided by Railway's PostgreSQL plugin |
| `JWT_SECRET` | Any long random string (32+ chars) |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | Your frontend URL (or `*` temporarily) |

7. In the Railway shell, run once:
```bash
node src/db/init.js
```

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/register` and `/api/auth/login`.

### Auth
```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { identifier, password }
GET  /api/auth/me
```

### Wallet
```
GET  /api/wallet/balance
POST /api/wallet/deposit    { amount, currency, txHash }
POST /api/wallet/withdraw   { amount, currency, walletAddress }
GET  /api/wallet/history
```

### Games
```
POST /api/games/slots/spin          { bet }
POST /api/games/dice/roll           { bet, prediction: 'under'|'seven'|'over' }
POST /api/games/roulette/spin       { bet, betType, betValue? }
POST /api/games/blackjack/deal      { bet }
POST /api/games/blackjack/action    { action: 'hit'|'stand'|'double' }
GET  /api/games/leaderboard
```

### Admin (requires admin JWT)
```
GET   /api/admin/stats
GET   /api/admin/users
PATCH /api/admin/users/:id/balance
PATCH /api/admin/users/:id/ban
GET   /api/admin/transactions
PATCH /api/admin/transactions/:id/approve
PATCH /api/admin/transactions/:id/reject
```

---

## 👑 Admin Panel

Access via `admin.html` or by signing in with admin credentials from your database.

Default local admin (created by `npm run db:init`):

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Change the admin password immediately in production!**

### Admin Features:
- 📊 **Dashboard stats** — users, pending transactions, revenue, house profit
- 👥 **User management** — view all users, set balances, ban/unban
- 💳 **Deposit approval** — approve or reject (credits player balance)
- 💸 **Withdrawal management** — approve (confirm sent) or reject (refunds balance)
- 🔔 **Real-time alerts** — Socket.IO notifies admin instantly of new requests

---

## 💱 Currencies & Payments

| Platform | Min Deposit | Min Withdrawal |
|---|---|---|
| Binance Pay | $10 | $50 |
| Coinbase Pay | $10 | $50 |
| Crypto.com | $10 | $50 |
| Kraken | $10 | $50 |
| Bybit | $10 | $50 |
| KuCoin | $10 | $50 |

> Wallet addresses are configured in `js/api.js` under `WALLET_ADDRESSES`. Replace with your real addresses before going live.

---

## ⚠️ Responsible Gambling

- **Age verification**: Must be **18+** to play
- **Disclaimer**: Displayed in footer and during sign-up
- **Play responsibly message**: "Gambling can be addictive. Play responsibly."

> This project is for **educational/demonstration purposes**. Operating a real-money gambling platform requires licenses and legal compliance in your jurisdiction.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<div align="center">
  Made with ❤️ · 🎰 Casino Royale · Play Responsibly
</div>
