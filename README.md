# 🎰 Casino Royale

> **Premium online casino platform** — Built with vanilla HTML, CSS, and JavaScript. No dependencies, no build step — just open and play.

![Casino Royale Banner](https://img.shields.io/badge/Casino%20Royale-Premium%20Experience-d4af37?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48dGV4dCB5PScuOWVtJyBmb250LXNpemU9JzkwJz7wn46wPC90ZXh0Pjwvc3ZnPg==)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Languages](https://img.shields.io/badge/i18n-EN%20%7C%20FR-blue?style=for-the-badge)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Games](#-games)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Authentication System](#-authentication-system)
- [Admin Panel](#-admin-panel)
- [Localization (i18n)](#-localization-i18n)
- [Currencies & Payments](#-currencies--payments)
- [Tech Stack](#-tech-stack)
- [Responsible Gambling](#-responsible-gambling)

---

## 🌟 Overview

Casino Royale is a **full-stack frontend casino platform** that simulates a real-money gambling experience. Users can register, deposit (via crypto), play four premium casino games, track their winnings on the leaderboard, and withdraw funds — all managed through a built-in admin dashboard.

The site features:
- 🌍 **Multi-language support** (English & French)
- 💳 **Real crypto wallet addresses** for deposits/withdrawals
- 🔐 **LocalStorage-based auth** (no backend required)
- 🎮 **4 fully playable casino games**
- 🏆 **Persistent leaderboard**
- 👑 **Admin panel** for managing users and transactions

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth System** | Sign up / Sign in with username, email & password |
| 💰 **Wallet** | Real-time balance display with animated counter |
| 💳 **Deposits** | Multi-crypto deposit flow with wallet address & TX hash |
| 💸 **Withdrawals** | Crypto withdrawal requests with admin approval |
| 📋 **Transactions** | Full deposit/withdrawal history per user |
| 🏆 **Leaderboard** | Top 10 biggest wins across all games |
| 🎨 **Animations** | Particle canvas background, confetti, win overlays |
| 📱 **Responsive** | Mobile-first, hamburger menu, touch-friendly |
| 🌍 **i18n** | English/French language toggle (EN/FR) |
| 👑 **Admin Panel** | User management, tx approval/rejection |

---

## 🎮 Games

### 🎰 Lucky Slots
Spin 3 reels. Match symbols to win multipliers from **0.5× up to 100×**.

| Combination | Payout |
|---|---|
| ⭐⭐⭐ Stars | **100×** |
| 7️⃣7️⃣7️⃣ Sevens | **50×** |
| 💎💎💎 Diamonds | **20×** |
| 🔔🔔🔔 Bells | **12×** |
| 🍋🍋🍋 Lemons | **8×** |
| 🍒🍒🍒 Cherries | **5×** |
| Any 2 match | **0.5×** |

Minimum bet: **$1**

---

### 🃏 Blackjack
Classic card game vs the dealer. Hit, Stand, or Double Down.  
Blackjack pays **2.5×**. Minimum bet: **$5**

---

### 🎡 Roulette
European roulette with a full betting board.  
Single numbers pay **36×**. Colors/odds pay **2×**. Minimum bet: **$1**

---

### 🎲 Dice
Predict the outcome of two dice rolls.

| Prediction | Condition | Payout |
|---|---|---|
| ⬇️ Under 7 | Total 2–6 | **2×** |
| 🎯 Exactly 7 | Total = 7 | **5×** |
| ⬆️ Over 7 | Total 8–12 | **2×** |

Minimum bet: **$1**

---

## 📁 Project Structure

```
casino-royale/
├── index.html          # Main player-facing page
├── admin.html          # Admin dashboard
├── README.md           # This file
│
├── css/
│   ├── index.css       # Global design tokens & base styles
│   ├── layout.css      # Navbar, hero, sections, modals, footer
│   ├── games.css       # Game views, card components
│   ├── animations.css  # Keyframes, transitions, confetti, particles
│   └── admin.css       # Admin panel styles
│
└── js/
    ├── auth.js         # Authentication, user storage, crypto wallets
    ├── app.js          # App controller (modals, wallet UI, leaderboard)
    ├── slots.js        # Lucky Slots game logic
    ├── blackjack.js    # Blackjack game logic
    ├── roulette.js     # Roulette game logic + board rendering
    ├── dice.js         # Dice game logic
    └── admin.js        # Admin panel logic
```

---

## 🚀 Getting Started

### Requirements
- A modern browser (Chrome, Firefox, Edge, Safari)
- No Node.js, no npm, no build step needed

### Run Locally

1. **Clone or download** the project:
   ```bash
   git clone <your-repo-url>
   cd casino-royale
   ```

2. **Open `index.html`** directly in your browser:
   - Double-click `index.html`, OR
   - Right-click → "Open with" → your browser

3. **Or serve with a local server** (recommended to avoid CORS on some browsers):
   ```bash
   # Python
   python -m http.server 8080

   # Node.js
   npx serve .
   ```
   Then visit `http://localhost:8080`

### Default Admin Account

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ Change the admin credentials in `js/auth.js` before deploying!

---

## 🔐 Authentication System

All user data is stored in **localStorage** under the key `casino_users`.

### User object schema:
```json
{
  "username": "player1",
  "email": "player@email.com",
  "password": "hashed_password",
  "balance": 500,
  "deposits": [],
  "withdrawals": [],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### Deposit object:
```json
{
  "id": "dep_1234567890",
  "amount": 100,
  "currency": "BTC",
  "txHash": "abc123...",
  "status": "pending",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

> **Note:** This auth system is for demonstration purposes. In production, use a real backend with hashed passwords and JWT sessions.

---

## 👑 Admin Panel

Access via `admin.html` or by signing in with admin credentials.

### Admin Features:
- 📊 **Dashboard stats** — total users, pending transactions, revenue
- 👥 **User management** — view all users, balances, and game history
- 💳 **Deposit approval** — approve or reject user deposit requests (credits balance)
- 💸 **Withdrawal management** — approve or reject withdrawal requests (debits balance)
- 🔑 **Balance editing** — manually set any user's balance

---

## 🌍 Localization (i18n)

Casino Royale supports **English (EN)** and **French (FR)** via the `js/i18n.js` module.

### Switching Language
Click the **EN / FR** toggle button in the top navbar to switch languages. The choice is saved in `localStorage`.

### Adding New Languages
Edit `js/i18n.js` and add a new language key:

```javascript
const translations = {
  en: { /* English strings */ },
  fr: { /* French strings */ },
  es: { /* Add Spanish here */ }
};
```

Then register a new button in the navbar and call `I18n.setLanguage('es')`.

### Adding New Keys
1. Add the key in all language objects in `js/i18n.js`
2. Add `data-i18n="your.key"` to the HTML element
3. The page will auto-translate on load and on language switch

---

## 💱 Currencies & Payments

Supported cryptocurrencies for deposits and withdrawals:

| Currency | Symbol | Min Deposit | Min Withdrawal |
|---|---|---|---|
| Bitcoin | BTC | $10 | $50 |
| Ethereum | ETH | $10 | $50 |
| Tether | USDT | $10 | $50 |
| BNB | BNB | $10 | $50 |
| Solana | SOL | $10 | $50 |
| Litecoin | LTC | $10 | $50 |
| Dogecoin | DOGE | $10 | $50 |
| Ripple | XRP | $10 | $50 |

> Wallet addresses are configured in `js/auth.js` under `WALLET_ADDRESSES`. **Replace with your real wallet addresses before going live.**

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Structure** | HTML5 (Semantic) |
| **Styling** | Vanilla CSS (custom properties, flexbox, grid) |
| **Logic** | Vanilla JavaScript (ES6+ modules pattern) |
| **Storage** | Browser `localStorage` |
| **Fonts** | Google Fonts (Cinzel + Inter) |
| **Icons** | Emoji (no external icon library needed) |
| **Build** | None — zero dependencies |

---

## ⚠️ Responsible Gambling

This platform includes responsible gambling notices:

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
