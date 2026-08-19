BEGIN;

ALTER TABLE audit.outbox_events
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS last_error_hash text;

CREATE INDEX IF NOT EXISTS idx_outbox_publish_lease
  ON audit.outbox_events(status, locked_at)
  WHERE status = 'publishing';

COMMIT;
