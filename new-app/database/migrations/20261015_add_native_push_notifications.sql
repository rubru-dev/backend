CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Notifikasi invoice sekarang dipicu saat status Terbit/Lunas dan hanya untuk
-- Super Admin. Rule deadline lama tidak lagi dipakai.
UPDATE fontee_reminder_rules
SET is_active = FALSE, updated_at = NOW()
WHERE feature = 'invoice_sign_head';
