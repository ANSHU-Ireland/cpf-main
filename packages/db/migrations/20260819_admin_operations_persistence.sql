BEGIN;

-- Audit exports are durable jobs. The signed object and its digest are populated by the
-- asynchronous export worker; the request path only creates the scoped pending job.
CREATE TABLE IF NOT EXISTS audit.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  requested_by uuid NOT NULL REFERENCES iam.users(id),
  from_at timestamptz NOT NULL,
  to_at timestamptz NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'json')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  object_uri text,
  sha256 text,
  signature text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (from_at < to_at),
  CHECK (status <> 'completed' OR (object_uri IS NOT NULL AND sha256 IS NOT NULL AND signature IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant_created
  ON audit.export_jobs (tenant_id, created_at DESC);

ALTER TABLE audit.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.export_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_tenant_isolation ON audit.export_jobs;
CREATE POLICY v2_tenant_isolation ON audit.export_jobs
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());

-- Maintenance windows are platform-wide rather than tenant-owned. Access remains restricted by
-- the platform-staff service policy and the least-privilege application role grants below.
CREATE TABLE IF NOT EXISTS audit.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CHECK (starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_time
  ON audit.maintenance_windows (starts_at DESC, ends_at DESC);

GRANT SELECT, INSERT, UPDATE ON audit.export_jobs TO cpf_app;
GRANT SELECT, INSERT ON audit.maintenance_windows TO cpf_app;

COMMIT;
