BEGIN;

-- Evidence collections are purpose-scoped, tenant-owned bundles. Collection items and
-- custody events remain append-only so exported audit evidence can be reconstructed without
-- reading mutable application projections.
CREATE TABLE IF NOT EXISTS audit.evidence_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 4 AND 200),
  purpose text NOT NULL CHECK (length(btrim(purpose)) BETWEEN 4 AND 2000),
  framework text NOT NULL CHECK (length(btrim(framework)) BETWEEN 2 AND 200),
  custodian_user_id uuid NOT NULL REFERENCES iam.users(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'complete', 'archived')),
  sealed_at timestamptz,
  sealed_by uuid REFERENCES iam.users(id),
  creation_reason text CHECK (creation_reason IS NULL OR length(creation_reason) <= 2000),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CHECK ((sealed_at IS NULL) = (sealed_by IS NULL))
);

CREATE TABLE IF NOT EXISTS audit.requirement_traceability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  requirement_key text NOT NULL CHECK (length(btrim(requirement_key)) BETWEEN 3 AND 100),
  requirement_title text NOT NULL CHECK (length(btrim(requirement_title)) BETWEEN 4 AND 4000),
  controls jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(controls) = 'array'),
  design_surfaces jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(design_surfaces) = 'array'),
  api_operations jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(api_operations) = 'array'),
  implementation_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(implementation_artifacts) = 'array'),
  coverage text NOT NULL DEFAULT 'unlinked'
    CHECK (coverage IN ('unlinked', 'partial', 'full')),
  status text NOT NULL DEFAULT 'specified'
    CHECK (status IN ('specified', 'implemented', 'verified', 'blocked')),
  created_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, requirement_key)
);

CREATE TABLE IF NOT EXISTS audit.evidence_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  collection_id uuid NOT NULL,
  requirement_traceability_id uuid,
  evidence_type text NOT NULL CHECK (length(btrim(evidence_type)) BETWEEN 2 AND 100),
  display_label text NOT NULL CHECK (length(btrim(display_label)) BETWEEN 2 AND 500),
  reference_uri text,
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  added_by uuid NOT NULL REFERENCES iam.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, collection_id)
    REFERENCES audit.evidence_collections(tenant_id, id),
  FOREIGN KEY (tenant_id, requirement_traceability_id)
    REFERENCES audit.requirement_traceability(tenant_id, id),
  UNIQUE (tenant_id, collection_id, evidence_type, display_label)
);

CREATE TABLE IF NOT EXISTS audit.evidence_custody_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
  collection_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES iam.users(id),
  action text NOT NULL CHECK (action IN (
    'created', 'item_added', 'item_removed', 'sealed', 'exported', 'accessed'
  )),
  detail text CHECK (detail IS NULL OR length(detail) <= 2000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, collection_id)
    REFERENCES audit.evidence_collections(tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_collections_tenant_created
  ON audit.evidence_collections (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirement_traceability_tenant_status
  ON audit.requirement_traceability (tenant_id, status, requirement_key);
CREATE INDEX IF NOT EXISTS idx_evidence_collection_items_collection
  ON audit.evidence_collection_items (tenant_id, collection_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_collection_items_requirement
  ON audit.evidence_collection_items (tenant_id, requirement_traceability_id)
  WHERE requirement_traceability_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_custody_events_collection
  ON audit.evidence_custody_events (tenant_id, collection_id, occurred_at);

ALTER TABLE audit.evidence_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.evidence_collections FORCE ROW LEVEL SECURITY;
ALTER TABLE audit.requirement_traceability ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.requirement_traceability FORCE ROW LEVEL SECURITY;
ALTER TABLE audit.evidence_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.evidence_collection_items FORCE ROW LEVEL SECURITY;
ALTER TABLE audit.evidence_custody_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.evidence_custody_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_tenant_isolation ON audit.evidence_collections;
CREATE POLICY v2_tenant_isolation ON audit.evidence_collections
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());
DROP POLICY IF EXISTS v2_tenant_isolation ON audit.requirement_traceability;
CREATE POLICY v2_tenant_isolation ON audit.requirement_traceability
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());
DROP POLICY IF EXISTS v2_tenant_isolation ON audit.evidence_collection_items;
CREATE POLICY v2_tenant_isolation ON audit.evidence_collection_items
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());
DROP POLICY IF EXISTS v2_tenant_isolation ON audit.evidence_custody_events;
CREATE POLICY v2_tenant_isolation ON audit.evidence_custody_events
  USING (tenant_id = iam.current_tenant_id())
  WITH CHECK (tenant_id = iam.current_tenant_id());

REVOKE ALL ON audit.evidence_collections FROM PUBLIC, cpf_app;
REVOKE ALL ON audit.requirement_traceability FROM PUBLIC, cpf_app;
REVOKE ALL ON audit.evidence_collection_items FROM PUBLIC, cpf_app;
REVOKE ALL ON audit.evidence_custody_events FROM PUBLIC, cpf_app;
GRANT SELECT, INSERT ON audit.evidence_collections TO cpf_app;
GRANT SELECT ON audit.requirement_traceability TO cpf_app;
GRANT SELECT ON audit.evidence_collection_items TO cpf_app;
GRANT SELECT, INSERT ON audit.evidence_custody_events TO cpf_app;

COMMIT;
