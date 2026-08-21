BEGIN;

ALTER TABLE integration.connections
  ADD COLUMN IF NOT EXISTS credentials_rotated_at timestamptz;

GRANT SELECT, INSERT, UPDATE ON
  integration.connections,
  integration.webhook_subscriptions
TO cpf_app;

COMMIT;
