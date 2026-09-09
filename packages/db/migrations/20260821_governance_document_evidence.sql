BEGIN;

-- The OpenAPI GenericCommand envelope carries reason/expectedVersion and may contain
-- operation-specific fields that do not belong in the canonical regulatory tables. Keep that
-- accepted evidence alongside (never instead of) the canonical record. The tenant link also
-- scopes canonical provider tables whose immutable baseline intentionally has no tenant_id.
CREATE TABLE IF NOT EXISTS governance.document_payload_evidence (
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  document_type text NOT NULL
    CHECK (document_type IN (
      'ai_literacy', 'dataset', 'data_use_register', 'impact_assessment',
      'post_market_plan', 'post_market_signal', 'qms_document',
      'technical_document', 'vendor_evidence', 'deployer_instruction',
      'eu_declaration', 'eu_registration', 'ce_marking'
    )),
  resource_id uuid NOT NULL,
  accepted_payload jsonb NOT NULL CHECK (jsonb_typeof(accepted_payload) = 'object'),
  operation_reason text CHECK (operation_reason IS NULL OR length(operation_reason) <= 2000),
  expected_version integer CHECK (expected_version IS NULL OR expected_version >= 0),
  created_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, document_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_governance_document_payload_resource
  ON governance.document_payload_evidence (document_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_governance_document_payload_tenant_created
  ON governance.document_payload_evidence (tenant_id, created_at DESC);

ALTER TABLE governance.document_payload_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.document_payload_evidence FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_tenant_isolation ON governance.document_payload_evidence;
CREATE POLICY v2_tenant_isolation ON governance.document_payload_evidence
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());

REVOKE ALL ON governance.document_payload_evidence FROM PUBLIC;
REVOKE ALL ON governance.document_payload_evidence FROM cpf_app;
GRANT SELECT, INSERT ON governance.document_payload_evidence TO cpf_app;

COMMIT;
