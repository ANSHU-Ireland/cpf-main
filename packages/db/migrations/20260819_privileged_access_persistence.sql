BEGIN;

-- The baseline models the legal purpose and internal case reference. The public command also
-- carries the concrete access scope and human justification; retain both as first-class evidence.
ALTER TABLE iam.privileged_access_grants
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS reason text;

GRANT SELECT, INSERT, UPDATE ON iam.privileged_access_grants TO cpf_app;

COMMIT;
