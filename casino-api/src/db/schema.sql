-- ============================================================
--  Casino Royale — PostgreSQL Schema
--  Run once against your Railway (or local) database
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(20)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  balance       DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_admin      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Create default admin (password: admin123 — change immediately in production!)
-- bcrypt hash of 'admin123' with 10 rounds
INSERT INTO users (username, email, password_hash, is_admin)
VALUES (
  'admin',
  'admin@casino-royale.internal',
  '$2a$10$N9qo8uLYzThh7bHNfEm9cOFH2CKTwO6xN9Z8v5XkYJfWV0bvn0iHu',
  TRUE
) ON CONFLICT (username) DO NOTHING;

-- Transactions (deposits + withdrawals)
CREATE TABLE IF NOT EXISTS transactions (
  id              VARCHAR(60)   PRIMARY KEY,
  user_id         INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20)   NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount          DECIMAL(12,2) NOT NULL,
  currency        VARCHAR(20),
  tx_hash         TEXT,           -- deposit proof
  wallet_address  TEXT,           -- withdrawal destination
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','approved','rejected')),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);

-- Game rounds
CREATE TABLE IF NOT EXISTS game_rounds (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game        VARCHAR(30)   NOT NULL,          -- 'slots' | 'blackjack' | 'roulette' | 'dice'
  bet_amount  DECIMAL(12,2) NOT NULL,
  win_amount  DECIMAL(12,2) NOT NULL,          -- net delta (positive = player won)
  result_data JSONB,                            -- full game snapshot
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_user_id ON game_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game    ON game_rounds(game);

-- Leaderboard view — top 10 wins overall
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    u.username,
    gr.game,
    gr.win_amount,
    gr.bet_amount,
    gr.created_at
  FROM game_rounds gr
  JOIN users u ON u.id = gr.user_id
  WHERE gr.win_amount > 0
    AND u.is_banned = FALSE
  ORDER BY gr.win_amount DESC
  LIMIT 10;
