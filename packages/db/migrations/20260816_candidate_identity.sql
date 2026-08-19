BEGIN;

ALTER TABLE hiring.candidates
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES iam.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_tenant_user
  ON hiring.candidates (tenant_id, user_id)
  WHERE user_id IS NOT NULL;

COMMIT;
