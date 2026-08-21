BEGIN;

-- The public submission commands carry a reference and summary rather than the full, strongly
-- typed regulatory records. Persist that command envelope instead of fabricating a domain row.
CREATE TABLE IF NOT EXISTS governance.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  submission_type text NOT NULL
    CHECK (submission_type IN (
      'ce_marking', 'conformity_assessment', 'eu_declaration',
      'eu_registration', 'serious_incident', 'change_request'
    )),
  reference text NOT NULL,
  summary text NOT NULL CHECK (length(btrim(summary)) > 0),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'processing', 'accepted', 'rejected', 'failed')),
  submitted_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, submission_type, reference)
);

CREATE INDEX IF NOT EXISTS idx_governance_submissions_tenant_created
  ON governance.submissions (tenant_id, created_at DESC);

ALTER TABLE governance.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_tenant_isolation ON governance.submissions;
CREATE POLICY v2_tenant_isolation ON governance.submissions
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());

-- Preserve decision/update evidence that the public operations accept but the immutable baseline
-- did not yet have columns for.
ALTER TABLE governance.serious_incident_reports
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE governance.change_requests
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES iam.users(id),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT, INSERT ON governance.submissions TO cpf_app;
GRANT SELECT ON governance.ai_system_records, governance.deployer_instructions TO cpf_app;
GRANT SELECT, UPDATE ON
  governance.conformity_assessments,
  governance.serious_incident_reports,
  governance.change_requests
TO cpf_app;

COMMIT;
