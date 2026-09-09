BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.cpf_seed_uuid(seed_value text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed_value), 1, 8) || '-' ||
    substr(md5(seed_value), 9, 4) || '-4' ||
    substr(md5(seed_value), 14, 3) || '-8' ||
    substr(md5(seed_value), 18, 3) || '-' ||
    substr(md5(seed_value), 21, 12)
  )::uuid
$$;

INSERT INTO tenant.plans (id, code, name, entitlements, status)
VALUES
  (pg_temp.cpf_seed_uuid('uat-plan-growth'), 'growth', 'Growth',
   '{"seatLimit":75,"campaignLimit":20,"candidateLimit":2500}'::jsonb, 'active'),
  (pg_temp.cpf_seed_uuid('uat-plan-enterprise'), 'enterprise', 'Enterprise',
   '{"seatLimit":250,"campaignLimit":100,"candidateLimit":25000,"sso":true,"auditExport":true}'::jsonb, 'active'),
  (pg_temp.cpf_seed_uuid('uat-plan-regulated'), 'regulated', 'Regulated Enterprise',
   '{"seatLimit":500,"campaignLimit":250,"candidateLimit":100000,"sso":true,"auditExport":true,"dataResidency":"EU"}'::jsonb, 'active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  entitlements = EXCLUDED.entitlements,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO iam.roles (id, code, name, scope, is_system)
VALUES
  (pg_temp.cpf_seed_uuid('uat-role-employer-admin'), 'employer_admin', 'Employer administrator', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-approver'), 'employer_admin_approver', 'Employer decision approver', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-reviewer'), 'reviewer', 'Reviewer', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-candidate'), 'candidate', 'Candidate', 'candidate_self', true),
  (pg_temp.cpf_seed_uuid('uat-role-governance'), 'governance_officer', 'Governance officer', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-support'), 'support_agent', 'Support agent', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-operations'), 'operations_admin', 'Operations administrator', 'platform', true),
  (pg_temp.cpf_seed_uuid('uat-role-auditor'), 'auditor', 'Auditor', 'tenant', true),
  (pg_temp.cpf_seed_uuid('uat-role-system-admin'), 'system_admin', 'System administrator', 'platform', true),
  (pg_temp.cpf_seed_uuid('uat-role-platform-staff'), 'platform_staff', 'CPF platform staff', 'platform', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope,
  is_system = EXCLUDED.is_system;

DO $seed$
DECLARE
  tenant_number integer;
  current_tenant_id uuid;
  tenant_slug text;
  tenant_name text;
  plan_code text;
  persona text;
  persona_user_id uuid;
  persona_membership_id uuid;
  persona_role text;
  candidate_number integer;
  current_candidate_id uuid;
  candidate_user_id uuid;
  campaign_number integer;
  current_campaign_id uuid;
  admin_user_id uuid;
  current_auditor_user_id uuid;
  current_system_id uuid;
  current_post_market_plan_id uuid;
  current_conformity_id uuid;
  current_declaration_id uuid;
  org_names text[] := ARRAY[
    'Northstar Logistics', 'Bluehaven Health', 'Cedar & Finch Retail', 'Dublin Grid Services',
    'Evergreen Financial', 'Fjordline Mobility', 'Greenstone Construction', 'Harbourview Hotels',
    'Ionix Software', 'Juniper Public Services', 'Kestrel Aviation', 'Lighthouse Education',
    'Morrow Food Group', 'Nexa Pharmaceuticals', 'Oak & Ember Media', 'Pioneer Renewables',
    'Quayside Insurance', 'Redwood Manufacturing', 'Silverfern Telecom', 'Tandem Consulting',
    'Union Street Banking', 'Vertex BioScience', 'Westbridge Legal', 'Xenon Data Systems',
    'Yellowbrick Property', 'Zenith Marine', 'Arclight Energy', 'Brookfield Transport',
    'Copperlane Commerce', 'Driftwood Hospitality'
  ];
  role_titles text[] := ARRAY[
    'Operations Lead', 'Senior Software Engineer', 'Customer Success Manager',
    'Financial Analyst'
  ];
  campaign_statuses text[] := ARRAY['active', 'active', 'paused', 'closed'];
  application_statuses text[] := ARRAY[
    'invited', 'started', 'submitted', 'in_review', 'reviewed', 'progressed', 'not_progressed'
  ];
BEGIN
  FOR tenant_number IN 1..30 LOOP
    current_tenant_id := CASE WHEN tenant_number = 1
      THEN '11111111-0000-4000-8000-000000000001'::uuid
      ELSE pg_temp.cpf_seed_uuid(format('uat-tenant-%s', tenant_number)) END;
    tenant_slug := CASE WHEN tenant_number = 1
      THEN 'northstar-demo'
      ELSE format('uat-%s-%s', lpad(tenant_number::text, 2, '0'),
        lower(regexp_replace(org_names[tenant_number], '[^a-zA-Z0-9]+', '-', 'g'))) END;
    tenant_name := org_names[tenant_number];
    plan_code := CASE
      WHEN tenant_number % 5 = 0 THEN 'regulated'
      WHEN tenant_number % 2 = 0 THEN 'enterprise'
      ELSE 'growth'
    END;

    INSERT INTO tenant.organizations
      (id, slug, legal_name, display_name, status, data_region, default_timezone, branding, settings,
       created_at)
    VALUES
      (current_tenant_id, tenant_slug, tenant_name || ' Ltd', tenant_name,
       CASE WHEN tenant_number IN (9, 22) THEN 'suspended' ELSE 'active' END,
       'EU', CASE WHEN tenant_number % 3 = 0 THEN 'Europe/Paris' ELSE 'Europe/Dublin' END,
       jsonb_build_object('productName', 'CPF', 'accent',
         CASE tenant_number % 4 WHEN 0 THEN '#6d4aff' WHEN 1 THEN '#2f61d5'
              WHEN 2 THEN '#087f5b' ELSE '#b45309' END),
       jsonb_build_object('uatSeed', true, 'industry',
         CASE tenant_number % 6 WHEN 0 THEN 'Technology' WHEN 1 THEN 'Logistics'
              WHEN 2 THEN 'Healthcare' WHEN 3 THEN 'Financial services'
              WHEN 4 THEN 'Retail' ELSE 'Professional services' END,
         'candidateSupportSlaHours', 24),
       now() - make_interval(days => 30 + tenant_number * 3))
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      status = EXCLUDED.status,
      branding = EXCLUDED.branding,
      settings = EXCLUDED.settings,
      updated_at = now();

    INSERT INTO tenant.subscriptions
      (id, tenant_id, plan_id, status, starts_at, ends_at, overrides)
    SELECT pg_temp.cpf_seed_uuid(format('uat-subscription-%s', tenant_number)), current_tenant_id,
           plan.id, CASE WHEN tenant_number IN (7, 19) THEN 'past_due' ELSE 'active' END,
           now() - make_interval(days => 28 + tenant_number), NULL,
           jsonb_build_object('seatLimit', 40 + tenant_number * 7)
      FROM tenant.plans AS plan
     WHERE plan.code = plan_code
    ON CONFLICT (id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      ends_at = NULL,
      overrides = EXCLUDED.overrides,
      updated_at = now();

    INSERT INTO tenant.departments (id, tenant_id, name, code)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-dept-people', tenant_number)), current_tenant_id, 'People', 'PEO'),
      (pg_temp.cpf_seed_uuid(format('uat-%s-dept-product', tenant_number)), current_tenant_id, 'Product & Technology', 'PDT'),
      (pg_temp.cpf_seed_uuid(format('uat-%s-dept-operations', tenant_number)), current_tenant_id, 'Operations', 'OPS')
    ON CONFLICT (tenant_id, name) DO UPDATE SET status = 'active', updated_at = now();

    INSERT INTO tenant.teams (id, tenant_id, department_id, name)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-team-%s-%s', tenant_number,
             team_seed.department_code, team_seed.name)),
           current_tenant_id, department.id, team_seed.name
      FROM (VALUES
        ('PEO', 'Talent Acquisition'), ('PEO', 'People Operations'),
        ('PDT', 'Platform Engineering'), ('PDT', 'Data & AI'),
        ('OPS', 'Service Delivery'), ('OPS', 'Customer Operations')
      ) AS team_seed(department_code, name)
      JOIN tenant.departments AS department
        ON department.tenant_id = current_tenant_id AND department.code = team_seed.department_code
    ON CONFLICT (tenant_id, department_id, name) DO UPDATE SET status = 'active', updated_at = now();

    FOREACH persona IN ARRAY ARRAY['admin','reviewer','approver','governance','support','operations','auditor','candidate'] LOOP
      persona_user_id := CASE
        WHEN tenant_number = 1 AND persona = 'admin' THEN '11111111-0000-4000-8000-000000000010'::uuid
        WHEN tenant_number = 1 AND persona = 'reviewer' THEN '11111111-0000-4000-8000-000000000011'::uuid
        WHEN tenant_number = 1 AND persona = 'candidate' THEN '11111111-0000-4000-8000-000000000012'::uuid
        WHEN tenant_number = 1 AND persona = 'approver' THEN '11111111-0000-4000-8000-000000000014'::uuid
        ELSE pg_temp.cpf_seed_uuid(format('uat-%s-user-%s', tenant_number, persona))
      END;
      persona_role := CASE persona
        WHEN 'admin' THEN 'employer_admin'
        WHEN 'reviewer' THEN 'reviewer'
        WHEN 'approver' THEN 'employer_admin_approver'
        WHEN 'governance' THEN 'governance_officer'
        WHEN 'support' THEN 'support_agent'
        WHEN 'operations' THEN 'operations_admin'
        WHEN 'auditor' THEN 'auditor'
        ELSE 'candidate'
      END;

      INSERT INTO iam.users
        (id, email, display_name, user_type, status, mfa_enforced, email_verified_at)
      VALUES
        (persona_user_id,
         CASE
           WHEN tenant_number = 1 AND persona = 'admin' THEN 'admin@northstar.invalid'
           WHEN tenant_number = 1 AND persona = 'reviewer' THEN 'reviewer@northstar.invalid'
           WHEN tenant_number = 1 AND persona = 'candidate' THEN 'candidate.one@northstar.invalid'
           WHEN tenant_number = 1 AND persona = 'approver' THEN 'approver@northstar.invalid'
           ELSE format('%s@tenant-%s.cpf-uat.invalid', persona, lpad(tenant_number::text, 2, '0'))
         END,
         initcap(persona) || ' User · ' || tenant_name,
         CASE WHEN persona = 'candidate' THEN 'candidate' ELSE 'employer_user' END,
         'active', false, now())
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        status = 'active',
        mfa_enforced = false,
        failed_login_count = 0,
        locked_until = NULL,
        email_verified_at = EXCLUDED.email_verified_at,
        updated_at = now();

      INSERT INTO iam.password_credentials
        (user_id, password_hash, reset_required, password_version, last_rotated_at)
      SELECT persona_user_id, crypt('CPF-UAT-ChangeMe-2026!', gen_salt('bf', 10)), true, 1, now()
       WHERE NOT EXISTS (SELECT 1 FROM iam.password_credentials AS existing
                          WHERE existing.user_id = persona_user_id)
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO iam.auth_methods
        (id, user_id, method_type, label, credential_reference, public_metadata, status)
      VALUES
        (pg_temp.cpf_seed_uuid(format('uat-%s-auth-%s', tenant_number, persona)),
         persona_user_id, 'password', 'UAT temporary password', 'iam.password_credentials',
         '{"resetRequired":true,"synthetic":true}'::jsonb, 'active')
      ON CONFLICT (user_id, method_type, credential_reference) DO UPDATE SET
        label = EXCLUDED.label,
        public_metadata = EXCLUDED.public_metadata,
        status = 'active',
        revoked_at = NULL;

      persona_membership_id := pg_temp.cpf_seed_uuid(format('uat-%s-membership-%s', tenant_number, persona));
      INSERT INTO iam.memberships (id, tenant_id, user_id, status, starts_at)
      VALUES (persona_membership_id, current_tenant_id, persona_user_id, 'active', now() - interval '30 days')
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        status = 'active', ends_at = NULL, updated_at = now();

      SELECT membership.id INTO persona_membership_id
        FROM iam.memberships AS membership
       WHERE membership.tenant_id = current_tenant_id AND membership.user_id = persona_user_id;

      INSERT INTO iam.membership_roles
        (membership_id, role_id, scope_type, scope_id, granted_by)
      SELECT persona_membership_id, role.id,
             CASE WHEN role.scope = 'platform' THEN 'platform' ELSE 'tenant' END,
             current_tenant_id,
             CASE WHEN persona = 'admin' THEN persona_user_id
                  ELSE (SELECT app_user.id FROM iam.users AS app_user
                         WHERE app_user.email = CASE WHEN tenant_number = 1
                           THEN 'admin@northstar.invalid'::citext
                           ELSE format('admin@tenant-%s.cpf-uat.invalid', lpad(tenant_number::text, 2, '0'))::citext END)
             END
        FROM iam.roles AS role
       WHERE role.code = persona_role
      ON CONFLICT (membership_id, role_id, scope_type, scope_id) DO UPDATE SET
        expires_at = NULL;
    END LOOP;

    -- Seed a complete canonical governance workspace for every tenant. These are explicitly
    -- synthetic UAT records; the payload evidence table supplies tenant isolation for immutable
    -- provider tables whose v2.0 baseline intentionally has no tenant_id column.
    admin_user_id := CASE WHEN tenant_number = 1
      THEN '11111111-0000-4000-8000-000000000010'::uuid
      ELSE pg_temp.cpf_seed_uuid(format('uat-%s-user-admin', tenant_number)) END;
    current_auditor_user_id := pg_temp.cpf_seed_uuid(format('uat-%s-user-auditor', tenant_number));
    current_system_id := pg_temp.cpf_seed_uuid(format('uat-%s-ai-system', tenant_number));
    current_post_market_plan_id := pg_temp.cpf_seed_uuid(format('uat-%s-post-market-plan', tenant_number));
    current_conformity_id := pg_temp.cpf_seed_uuid(format('uat-%s-conformity', tenant_number));
    current_declaration_id := pg_temp.cpf_seed_uuid(format('uat-%s-eu-declaration', tenant_number));

    INSERT INTO governance.ai_system_records
      (id, system_code, name, provider_legal_name, intended_purpose, excluded_purposes,
       foreseeable_misuse, version, lifecycle_status, owner_user_id, created_at)
    VALUES
      (current_system_id, format('CPF-UAT-SYS-%s', lpad(tenant_number::text, 2, '0')),
       'CPF Structured Assessment Platform · ' || tenant_name, 'CPF Provider Limited',
       'Support structured competency assessment with accountable human review',
       '["fully automated hiring decisions","biometric categorisation"]'::jsonb,
       '["using observations outside the approved competency rubric"]'::jsonb,
       '2026.08-uat', 'pilot', admin_user_id, now() - interval '45 days')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      intended_purpose = EXCLUDED.intended_purpose,
      excluded_purposes = EXCLUDED.excluded_purposes,
      foreseeable_misuse = EXCLUDED.foreseeable_misuse,
      version = EXCLUDED.version,
      lifecycle_status = EXCLUDED.lifecycle_status,
      owner_user_id = EXCLUDED.owner_user_id,
      updated_at = now();

    INSERT INTO governance.ai_literacy_records
      (id, tenant_id, user_id, role_context, training_code, material_version,
       competence_result, completed_at, expires_at, evidence_uri, approved_by)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-ai-literacy', tenant_number)), current_tenant_id,
       admin_user_id, 'Employer administrator and human decision owner', 'CPF-AI-ACT-LITERACY',
       '2026.2', 'passed', now() - interval '12 days', now() + interval '353 days',
       format('s3://cpf-uat-evidence/%s/ai-literacy.json', tenant_slug), admin_user_id)
    ON CONFLICT (id) DO UPDATE SET
      role_context = EXCLUDED.role_context,
      material_version = EXCLUDED.material_version,
      competence_result = EXCLUDED.competence_result,
      completed_at = EXCLUDED.completed_at,
      expires_at = EXCLUDED.expires_at,
      evidence_uri = EXCLUDED.evidence_uri,
      approved_by = EXCLUDED.approved_by;

    INSERT INTO governance.dataset_registry
      (id, dataset_code, version, dataset_role, provenance, lawful_access, purpose,
       data_subjects, representativeness, quality_checks, bias_analysis, gaps,
       licence_terms, storage_region, retention_until, status, owner_user_id, approved_by)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-dataset', tenant_number)),
       format('CPF-UAT-VALIDATION-%s', lpad(tenant_number::text, 2, '0')), '2026.08',
       'validation', jsonb_build_object('source', 'deterministic synthetic UAT generator',
       'generatedAt', '2026-08-21'), 'Synthetic non-personal records only',
       'Validate tenant-isolated assessment and reporting journeys',
       '["synthetic candidates"]'::jsonb,
       jsonb_build_object('coverage', 'all configured role families', 'reviewed', true),
       jsonb_build_object('schema', 'passed', 'referentialIntegrity', 'passed'),
       jsonb_build_object('status', 'reviewed', 'protectedAttributes', 'synthetic only'),
       '[]'::jsonb, 'CPF internal UAT only', 'eu-west-1', current_date + 90,
       'approved', admin_user_id, admin_user_id)
    ON CONFLICT (id) DO UPDATE SET
      provenance = EXCLUDED.provenance,
      representativeness = EXCLUDED.representativeness,
      quality_checks = EXCLUDED.quality_checks,
      bias_analysis = EXCLUDED.bias_analysis,
      retention_until = EXCLUDED.retention_until,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by;

    INSERT INTO governance.data_use_register
      (id, tenant_id, purpose_code, purpose, data_subjects, data_fields, source,
       cpf_role, employer_role, lawful_basis, recipients, subprocessors, storage_region,
       deletion_method, rights, security_controls, model_use, training_use, human_access,
       dpia_status, owner_user_id, status)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-data-use', tenant_number)), current_tenant_id,
       format('CPF-UAT-ASSESS-%s', lpad(tenant_number::text, 2, '0')),
       'Deliver synthetic competency assessments for UAT', '["synthetic candidates"]'::jsonb,
       '["synthetic profile","assessment responses","human review evidence"]'::jsonb,
       'CPF deterministic UAT seed', 'processor', 'controller',
       'Synthetic data; no personal-data lawful basis required', '[]'::jsonb, '[]'::jsonb,
       'eu-west-1', 'Cryptographic erasure after UAT',
       '{"access":true,"correction":true,"deletion":true,"humanReview":true}'::jsonb,
       '{"encryption":true,"tenantRls":true,"auditChain":true}'::jsonb,
       'Generate observations only; never make a hiring decision', 'Prohibited',
       'Named reviewers and approved support access only', 'approved', admin_user_id, 'active')
    ON CONFLICT (id) DO UPDATE SET
      purpose = EXCLUDED.purpose,
      rights = EXCLUDED.rights,
      security_controls = EXCLUDED.security_controls,
      model_use = EXCLUDED.model_use,
      training_use = EXCLUDED.training_use,
      dpia_status = EXCLUDED.dpia_status,
      status = EXCLUDED.status,
      updated_at = now();

    INSERT INTO governance.impact_assessments
      (id, tenant_id, assessment_type, scope_type, scope_id, version_no, necessity,
       risks, measures, residual_risk, consultation_required, consultation_status,
       status, owner_user_id, dpo_opinion, approved_by, approved_at, review_due)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-impact-assessment', tenant_number)), current_tenant_id,
       'dpia', 'ai_system', current_system_id, 1,
       'Confirm necessity, proportionality, rights safeguards and human review before pilot use.',
       '[{"code":"DPIA-01","risk":"unauthorised cross-tenant access","rating":"high"},
         {"code":"DPIA-02","risk":"automation bias","rating":"medium"}]'::jsonb,
       '[{"code":"CTRL-RLS","status":"effective"},{"code":"CTRL-HUMAN","status":"effective"}]'::jsonb,
       'low', false, 'not_required', 'approved', admin_user_id,
       'Synthetic UAT design approved subject to production legal sign-off.', admin_user_id,
       now() - interval '8 days', current_date + 180)
    ON CONFLICT (id) DO UPDATE SET
      risks = EXCLUDED.risks,
      measures = EXCLUDED.measures,
      residual_risk = EXCLUDED.residual_risk,
      status = EXCLUDED.status,
      dpo_opinion = EXCLUDED.dpo_opinion,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      review_due = EXCLUDED.review_due;

    INSERT INTO governance.post_market_plans
      (id, ai_system_id, version_no, methodology, signal_catalogue, thresholds,
       review_cadence, status, owner_user_id, approved_by, approved_at)
    VALUES
      (current_post_market_plan_id, current_system_id, 1,
       '{"sampling":"monthly","segmentation":["role","assessment","tenant"]}'::jsonb,
       '[{"code":"QUALITY_DRIFT"},{"code":"RIGHTS_COMPLAINT"},{"code":"SECURITY_EVENT"}]'::jsonb,
       '{"warning":0.10,"breach":0.20}'::jsonb, interval '30 days', 'active',
       admin_user_id, admin_user_id, now() - interval '7 days')
    ON CONFLICT (id) DO UPDATE SET
      methodology = EXCLUDED.methodology,
      signal_catalogue = EXCLUDED.signal_catalogue,
      thresholds = EXCLUDED.thresholds,
      review_cadence = EXCLUDED.review_cadence,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

    INSERT INTO governance.post_market_signals
      (id, tenant_id, post_market_plan_id, signal_type, metric_window, value,
       threshold_status, source_reference, review_status, reviewer_user_id, reviewed_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-post-market-signal', tenant_number)),
       current_tenant_id, current_post_market_plan_id, 'quality_drift',
       tstzrange(now() - interval '30 days', now(), '[)'),
       jsonb_build_object('delta', round((tenant_number::numeric / 1000), 3),
                          'sampleSize', 80 + tenant_number * 5),
       CASE WHEN tenant_number IN (7, 19) THEN 'warning' ELSE 'normal' END,
       format('CPF-UAT-MONITOR-%s', lpad(tenant_number::text, 2, '0')), 'accepted',
       admin_user_id, now() - interval '1 day')
    ON CONFLICT (id) DO UPDATE SET
      metric_window = EXCLUDED.metric_window,
      value = EXCLUDED.value,
      threshold_status = EXCLUDED.threshold_status,
      review_status = EXCLUDED.review_status,
      reviewer_user_id = EXCLUDED.reviewer_user_id,
      reviewed_at = EXCLUDED.reviewed_at;

    INSERT INTO governance.quality_documents
      (id, document_code, version_no, document_type, title, content_uri, sha256,
       status, owner_user_id, approved_by, effective_from, review_due, approved_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-qms-document', tenant_number)),
       format('CPF-QMS-UAT-%s', lpad(tenant_number::text, 2, '0')), 1, 'quality_procedure',
       'Assessment quality and human-review procedure · ' || tenant_name,
       format('s3://cpf-uat-evidence/%s/qms-procedure.pdf', tenant_slug), repeat('a', 64),
       'effective', admin_user_id, admin_user_id, current_date - 30,
       current_date + 335, now() - interval '30 days')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content_uri = EXCLUDED.content_uri,
      sha256 = EXCLUDED.sha256,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      review_due = EXCLUDED.review_due,
      approved_at = EXCLUDED.approved_at;

    INSERT INTO governance.technical_document_versions
      (id, ai_system_id, version_no, release_version, annex_iv_manifest, object_uri,
       sha256, status, prepared_by, approved_by, approved_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-technical-document', tenant_number)),
       current_system_id, 1, '2026.08-uat',
       '{"sections":["intendedPurpose","architecture","dataGovernance","validation","humanOversight","cybersecurity"]}'::jsonb,
       format('s3://cpf-uat-evidence/%s/annex-iv.json', tenant_slug), repeat('b', 64),
       'approved', admin_user_id, admin_user_id, now() - interval '6 days')
    ON CONFLICT (id) DO UPDATE SET
      annex_iv_manifest = EXCLUDED.annex_iv_manifest,
      object_uri = EXCLUDED.object_uri,
      sha256 = EXCLUDED.sha256,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

    INSERT INTO governance.vendor_evidence
      (id, vendor_code, service_code, evidence_version, legal_entity, ai_act_role,
       gdpr_role, data_locations, subprocessors, transfer_mechanism, training_use,
       retention, deletion, security_evidence, model_documentation, limitations,
       change_notice, incident_notice, audit_rights, exit_plan, status, owner_user_id,
       approved_by, approved_at, review_due)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-vendor-evidence', tenant_number)),
       format('CPF-UAT-VENDOR-%s', lpad(tenant_number::text, 2, '0')), 'MODEL-GATEWAY', 1,
       'Synthetic Vendor Limited', 'provider', 'processor', '["eu-west-1"]'::jsonb,
       '[]'::jsonb, 'EU SCCs if required', 'Prohibited', '30 days',
       'Cryptographic erasure', '{"iso27001":"synthetic-UAT-evidence"}'::jsonb,
       '{"modelCard":true,"evaluationReport":true}'::jsonb,
       '["No automated hiring decision","Human review required"]'::jsonb,
       '30 days advance notice', '24 hour notification', 'Annual evidence review',
       'Export evidence then revoke and delete', 'approved', admin_user_id, admin_user_id,
       now() - interval '10 days', current_date + 170)
    ON CONFLICT (id) DO UPDATE SET
      security_evidence = EXCLUDED.security_evidence,
      model_documentation = EXCLUDED.model_documentation,
      limitations = EXCLUDED.limitations,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      review_due = EXCLUDED.review_due;

    INSERT INTO governance.deployer_instructions
      (id, ai_system_id, version_no, release_version, intended_purpose, input_requirements,
       accuracy_metrics, limitations, oversight_measures, monitoring_instructions,
       incident_instructions, maintenance_instructions, object_uri, sha256, status,
       approved_by, approved_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-deployer-instruction', tenant_number)),
       current_system_id, 1, '2026.08-uat',
       'Structured competency assessment with accountable human review',
       '{"supportedLocales":["en-IE"],"identityCheck":true}'::jsonb,
       '{"validationStatus":"passed","report":"synthetic UAT evidence"}'::jsonb,
       '["No automated hiring decision","Use only with the approved rubric"]'::jsonb,
       '{"namedReviewer":true,"overrideAuthority":true,"stopAuthority":true}'::jsonb,
       '{"quality":"monthly","rights":"continuous"}'::jsonb,
       '{"channel":"CPF support","seriousIncidentEscalation":true}'::jsonb,
       '{"releaseWindow":"controlled","rollbackRequired":true}'::jsonb,
       format('s3://cpf-uat-evidence/%s/deployer-instructions.json', tenant_slug),
       repeat('c', 64), 'effective', admin_user_id, now() - interval '5 days')
    ON CONFLICT (id) DO UPDATE SET
      intended_purpose = EXCLUDED.intended_purpose,
      input_requirements = EXCLUDED.input_requirements,
      accuracy_metrics = EXCLUDED.accuracy_metrics,
      limitations = EXCLUDED.limitations,
      oversight_measures = EXCLUDED.oversight_measures,
      monitoring_instructions = EXCLUDED.monitoring_instructions,
      incident_instructions = EXCLUDED.incident_instructions,
      maintenance_instructions = EXCLUDED.maintenance_instructions,
      object_uri = EXCLUDED.object_uri,
      sha256 = EXCLUDED.sha256,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

    INSERT INTO governance.conformity_assessments
      (id, ai_system_id, release_version, procedure, requirement_results, deviations,
       decision, assessed_by, approved_by, assessed_at, approved_at, valid_until)
    VALUES
      (current_conformity_id, current_system_id, '2026.08-uat', 'annex_vi_internal_control',
       '{"technicalDocumentation":"pass","qualityManagement":"pass","humanOversight":"pass"}'::jsonb,
       '[]'::jsonb, 'conformant', admin_user_id, admin_user_id,
       now() - interval '9 days', now() - interval '8 days', current_date + 180)
    ON CONFLICT (id) DO UPDATE SET
      requirement_results = EXCLUDED.requirement_results,
      deviations = EXCLUDED.deviations,
      decision = EXCLUDED.decision,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      valid_until = EXCLUDED.valid_until;

    INSERT INTO governance.eu_declarations
      (id, conformity_assessment_id, declaration_number, declaration_version,
       content_uri, sha256, status, signed_by, signed_at)
    VALUES
      (current_declaration_id, current_conformity_id,
       format('CPF-EU-DECL-UAT-%s', lpad(tenant_number::text, 2, '0')), 1,
       format('s3://cpf-uat-evidence/%s/eu-declaration.pdf', tenant_slug), repeat('d', 64),
       'signed', admin_user_id, now() - interval '7 days')
    ON CONFLICT (id) DO UPDATE SET
      content_uri = EXCLUDED.content_uri,
      sha256 = EXCLUDED.sha256,
      status = EXCLUDED.status,
      signed_by = EXCLUDED.signed_by,
      signed_at = EXCLUDED.signed_at;

    INSERT INTO governance.eu_registrations
      (id, ai_system_id, registration_reference, registration_payload, status,
       submitted_by, submitted_at, confirmed_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-eu-registration', tenant_number)),
       current_system_id, format('CPF-EU-REG-UAT-%s', lpad(tenant_number::text, 2, '0')),
       jsonb_build_object('environment', 'synthetic UAT', 'tenant', tenant_name,
                          'releaseVersion', '2026.08-uat'),
       'registered', admin_user_id, now() - interval '6 days', now() - interval '5 days')
    ON CONFLICT (id) DO UPDATE SET
      registration_reference = EXCLUDED.registration_reference,
      registration_payload = EXCLUDED.registration_payload,
      status = EXCLUDED.status,
      submitted_by = EXCLUDED.submitted_by,
      submitted_at = EXCLUDED.submitted_at,
      confirmed_at = EXCLUDED.confirmed_at,
      updated_at = now();

    INSERT INTO governance.ce_marking_records
      (id, ai_system_id, release_version, declaration_id, marking_location, status,
       approved_by, approved_at, evidence_uri)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-ce-marking', tenant_number)), current_system_id,
       '2026.08-uat', current_declaration_id, 'CPF release manifest and product information',
       'displayed', admin_user_id, now() - interval '5 days',
       format('s3://cpf-uat-evidence/%s/ce-marking.json', tenant_slug))
    ON CONFLICT (id) DO UPDATE SET
      marking_location = EXCLUDED.marking_location,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      evidence_uri = EXCLUDED.evidence_uri;

    INSERT INTO governance.document_payload_evidence
      (tenant_id, document_type, resource_id, accepted_payload, operation_reason,
       expected_version, created_by)
    SELECT current_tenant_id, document.document_type, document.resource_id,
           document.accepted_payload, 'Deterministic synthetic UAT seed', 0, admin_user_id
      FROM (VALUES
        ('ai_literacy', pg_temp.cpf_seed_uuid(format('uat-%s-ai-literacy', tenant_number)),
         jsonb_build_object('trainingCode', 'CPF-AI-ACT-LITERACY', 'materialVersion', '2026.2',
                            'roleContext', 'Employer administrator and human decision owner',
                            'competenceResult', 'passed')),
        ('dataset', pg_temp.cpf_seed_uuid(format('uat-%s-dataset', tenant_number)),
         jsonb_build_object('datasetCode', format('CPF-UAT-VALIDATION-%s', lpad(tenant_number::text, 2, '0')),
                            'version', '2026.08', 'datasetRole', 'validation',
                            'purpose', 'UAT validation', 'status', 'approved')),
        ('data_use_register', pg_temp.cpf_seed_uuid(format('uat-%s-data-use', tenant_number)),
         jsonb_build_object('purposeCode', format('CPF-UAT-ASSESS-%s', lpad(tenant_number::text, 2, '0')),
                            'purpose', 'Deliver synthetic competency assessments for UAT',
                            'storageRegion', 'eu-west-1', 'dpiaStatus', 'approved', 'status', 'active')),
        ('impact_assessment', pg_temp.cpf_seed_uuid(format('uat-%s-impact-assessment', tenant_number)),
         jsonb_build_object('assessmentType', 'dpia', 'scopeType', 'ai_system',
                            'scopeId', current_system_id, 'versionNo', 1,
                            'residualRisk', 'low', 'status', 'approved')),
        ('post_market_plan', current_post_market_plan_id,
         jsonb_build_object('aiSystemId', current_system_id, 'versionNo', 1,
                            'reviewCadence', '30 days', 'status', 'active')),
        ('post_market_signal', pg_temp.cpf_seed_uuid(format('uat-%s-post-market-signal', tenant_number)),
         jsonb_build_object('postMarketPlanId', current_post_market_plan_id,
                            'signalType', 'quality_drift',
                            'sourceReference', format('CPF-UAT-MONITOR-%s', lpad(tenant_number::text, 2, '0')),
                            'reviewStatus', 'accepted')),
        ('qms_document', pg_temp.cpf_seed_uuid(format('uat-%s-qms-document', tenant_number)),
         jsonb_build_object('documentCode', format('CPF-QMS-UAT-%s', lpad(tenant_number::text, 2, '0')),
                            'versionNo', 1, 'documentType', 'quality_procedure',
                            'title', 'Assessment quality and human-review procedure · ' || tenant_name,
                            'status', 'effective')),
        ('technical_document', pg_temp.cpf_seed_uuid(format('uat-%s-technical-document', tenant_number)),
         jsonb_build_object('aiSystemId', current_system_id, 'versionNo', 1,
                            'releaseVersion', '2026.08-uat', 'status', 'approved')),
        ('vendor_evidence', pg_temp.cpf_seed_uuid(format('uat-%s-vendor-evidence', tenant_number)),
         jsonb_build_object('vendorCode', format('CPF-UAT-VENDOR-%s', lpad(tenant_number::text, 2, '0')),
                            'serviceCode', 'MODEL-GATEWAY', 'evidenceVersion', 1,
                            'legalEntity', 'Synthetic Vendor Limited', 'status', 'approved')),
        ('deployer_instruction', pg_temp.cpf_seed_uuid(format('uat-%s-deployer-instruction', tenant_number)),
         jsonb_build_object('aiSystemId', current_system_id, 'versionNo', 1,
                            'releaseVersion', '2026.08-uat', 'status', 'effective')),
        ('eu_declaration', current_declaration_id,
         jsonb_build_object('conformityAssessmentId', current_conformity_id,
                            'declarationNumber', format('CPF-EU-DECL-UAT-%s', lpad(tenant_number::text, 2, '0')),
                            'declarationVersion', 1, 'status', 'signed')),
        ('eu_registration', pg_temp.cpf_seed_uuid(format('uat-%s-eu-registration', tenant_number)),
         jsonb_build_object('aiSystemId', current_system_id,
                            'registrationReference', format('CPF-EU-REG-UAT-%s', lpad(tenant_number::text, 2, '0')),
                            'status', 'registered')),
        ('ce_marking', pg_temp.cpf_seed_uuid(format('uat-%s-ce-marking', tenant_number)),
         jsonb_build_object('aiSystemId', current_system_id, 'releaseVersion', '2026.08-uat',
                            'declarationId', current_declaration_id, 'status', 'displayed'))
      ) AS document(document_type, resource_id, accepted_payload)
    ON CONFLICT (tenant_id, document_type, resource_id) DO UPDATE SET
      accepted_payload = EXCLUDED.accepted_payload,
      operation_reason = EXCLUDED.operation_reason,
      expected_version = EXCLUDED.expected_version,
      created_by = EXCLUDED.created_by;

    -- A representative, honest traceability workspace makes the audit journeys usable without
    -- claiming that externally blocked controls are complete. UUIDs are the public API lookup
    -- identifiers; requirement_key retains the normative human-readable reference.
    INSERT INTO audit.requirement_traceability
      (id, tenant_id, requirement_key, requirement_title, controls, design_surfaces,
       api_operations, implementation_artifacts, coverage, status, created_by, created_at)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-requirement-%s', tenant_number, requirement.requirement_key)),
           current_tenant_id, requirement.requirement_key, requirement.requirement_title,
           requirement.controls, requirement.design_surfaces, requirement.api_operations,
           requirement.implementation_artifacts, requirement.coverage, requirement.status,
           admin_user_id, now() - interval '12 days'
      FROM (VALUES
        ('FR-IAM-02', 'Tenant-aware role-based access control on every API, interface and data query.',
         '["CTRL-FR-IAM-02","PostgreSQL RLS","Server role and resource policy"]'::jsonb,
         '["Role journeys","Denied and cross-tenant states"]'::jsonb,
         '["POST /v2/auth/login","GET /v2/me"]'::jsonb,
         '["Runtime-role integration tests","Tenant-negative repository tests"]'::jsonb,
         'full', 'verified'),
        ('FR-TEN-02', 'Separate tenant users, candidate records, campaigns, reports and audit views.',
         '["CTRL-FR-TEN-02","Forced tenant RLS"]'::jsonb,
         '["EMP-01","AUD-01"]'::jsonb,
         '["GET /v2/organization","GET /v2/audit/evidence-collections"]'::jsonb,
         '["30-tenant deterministic seed","Schema-facts RLS gate"]'::jsonb,
         'full', 'verified'),
        ('FR-CAN-08', 'Candidate work auto-saves and supports recovery after a temporary network loss.',
         '["CTRL-FR-CAN-08","Versioned response persistence"]'::jsonb,
         '["RUN-02"]'::jsonb,
         '["PUT /v2/attempts/{attemptId}/responses/{itemId}"]'::jsonb,
         '["RUN-02 database journey","Autosave interaction test"]'::jsonb,
         'full', 'verified'),
        ('FR-REV-04', 'Human reviewers score approved criteria with evidence-linked rationale.',
         '["CTRL-FR-REV-04","Human decision authority"]'::jsonb,
         '["REV-08"]'::jsonb,
         '["GET /v2/review-assignments/{assignmentId}/scorecard"]'::jsonb,
         '["REV-08 database journey","Insufficient-evidence test"]'::jsonb,
         'full', 'verified'),
        ('FR-GOV-06', 'Technical documentation is versioned and linked to requirement evidence.',
         '["CTRL-FR-GOV-06","Canonical governance documents"]'::jsonb,
         '["GOV-05","AUD-02"]'::jsonb,
         '["GET /v2/governance/technical-documents","POST /v2/governance/technical-documents"]'::jsonb,
         '["Canonical technical-document row","Governance repository integration test"]'::jsonb,
         'full', 'verified'),
        ('FR-GOV-07', 'Protected logs support traceability, monitoring and incident investigation.',
         '["CTRL-FR-GOV-07","Hash-chained audit events","Transactional outbox"]'::jsonb,
         '["GOV-17","AUD-02"]'::jsonb,
         '[]'::jsonb,
         '["Audit writer tests","Outbox worker tests"]'::jsonb,
         'partial', 'implemented'),
        ('FR-GOV-31', 'Material governance approvals enforce separation of duties.',
         '["CTRL-FR-GOV-31","Distinct-person decision approval"]'::jsonb,
         '["EMP-21","GOV-18"]'::jsonb,
         '["POST /v2/decisions/{decisionId}/approvals","PUT /v2/governance/change-requests/{changeId}/decision"]'::jsonb,
         '["Decision approval integration tests"]'::jsonb,
         'partial', 'implemented'),
        ('FR-AUD-01', 'Auditors receive purpose-scoped access to approved evidence collections.',
         '["CTRL-FR-AUD-01","Auditor-only application policy","Tenant RLS"]'::jsonb,
         '["AUD-01"]'::jsonb,
         '["GET /v2/audit/evidence-collections","POST /v2/audit/evidence-collections"]'::jsonb,
         '["Evidence collection repository integration test"]'::jsonb,
         'partial', 'implemented'),
        ('FR-AUD-02', 'Evidence exports include integrity, provenance and access-history metadata.',
         '["CTRL-FR-AUD-02","Immutable custody events"]'::jsonb,
         '["AUD-01"]'::jsonb,
         '["POST /v2/admin/audit-exports","POST /v2/audit/evidence-collections"]'::jsonb,
         '["Evidence item hashes","Custody-event ledger"]'::jsonb,
         'partial', 'implemented'),
        ('FR-AUD-03', 'Requirements trace to controls, implementation and verification evidence.',
         '["CTRL-FR-AUD-03","Requirement-to-evidence links"]'::jsonb,
         '["AUD-02"]'::jsonb,
         '["GET /v2/audit/traceability/{requirementId}"]'::jsonb,
         '["Traceability repository integration test","UAT audit journey"]'::jsonb,
         'partial', 'implemented'),
        ('FR-AUD-04', 'Regulator requests use verified authority, legal scope and custody controls.',
         '["CTRL-FR-AUD-04"]'::jsonb,
         '["AUD-01"]'::jsonb,
         '[]'::jsonb,
         '["External authority-verification procedure required"]'::jsonb,
         'unlinked', 'blocked'),
        ('FR-AUD-05', 'Auditor access excludes unrelated tenant and restricted evidence.',
         '["CTRL-FR-AUD-05","Forced RLS","Least-privilege grants"]'::jsonb,
         '["AUD-01","AUD-02"]'::jsonb,
         '["GET /v2/audit/evidence-collections","GET /v2/audit/traceability/{requirementId}"]'::jsonb,
         '["Cross-tenant negative integration test","Application-role privilege gate"]'::jsonb,
         'partial', 'implemented')
      ) AS requirement(requirement_key, requirement_title, controls, design_surfaces,
                       api_operations, implementation_artifacts, coverage, status)
    ON CONFLICT (tenant_id, requirement_key) DO UPDATE SET
      requirement_title = EXCLUDED.requirement_title,
      controls = EXCLUDED.controls,
      design_surfaces = EXCLUDED.design_surfaces,
      api_operations = EXCLUDED.api_operations,
      implementation_artifacts = EXCLUDED.implementation_artifacts,
      coverage = EXCLUDED.coverage,
      status = EXCLUDED.status,
      updated_at = now();

    INSERT INTO audit.evidence_collections
      (id, tenant_id, title, purpose, framework, custodian_user_id, status,
       sealed_at, sealed_by, creation_reason, created_by, created_at)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-evidence-collection-%s', tenant_number, collection.code)),
           current_tenant_id, collection.title || ' · ' || tenant_name, collection.purpose,
           collection.framework, current_auditor_user_id, collection.status,
           CASE WHEN collection.sealed THEN now() - interval '7 days' ELSE NULL END,
           CASE WHEN collection.sealed THEN current_auditor_user_id ELSE NULL END,
           'Deterministic synthetic UAT evidence workspace.', admin_user_id,
           now() - make_interval(days => collection.age_days)
      FROM (VALUES
        ('access', 'Access and tenant-isolation evidence',
         'Validate authentication, role scope and tenant separation.', 'CPF security controls',
         'complete', true, 12),
        ('journeys', 'Candidate and reviewer journey evidence',
         'Retain verified candidate autosave and human review results.', 'CPF product controls',
         'ready', false, 11),
        ('governance', 'EU AI Act governance evidence',
         'Assemble canonical technical, logging and approval evidence.', 'EU AI Act',
         'ready', false, 10),
        ('audit', 'Audit and traceability control evidence',
         'Trace audit requirements to implementation and explicit blockers.', 'EU AI Act',
         'ready', false, 9)
      ) AS collection(code, title, purpose, framework, status, sealed, age_days)
    ON CONFLICT (tenant_id, id) DO UPDATE SET
      title = EXCLUDED.title,
      purpose = EXCLUDED.purpose,
      framework = EXCLUDED.framework,
      custodian_user_id = EXCLUDED.custodian_user_id,
      status = EXCLUDED.status,
      sealed_at = EXCLUDED.sealed_at,
      sealed_by = EXCLUDED.sealed_by,
      updated_at = now();

    INSERT INTO audit.evidence_collection_items
      (id, tenant_id, collection_id, requirement_traceability_id, evidence_type,
       display_label, reference_uri, sha256, metadata, added_by, created_at)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-evidence-item-%s', tenant_number, mapping.requirement_key)),
           current_tenant_id,
           pg_temp.cpf_seed_uuid(format('uat-%s-evidence-collection-%s', tenant_number, mapping.collection_code)),
           traceability.id, 'automated_uat_result',
           mapping.requirement_key || ' synthetic UAT example (not release approval)',
           format('cpf://uat-evidence/%s/%s', tenant_slug, lower(mapping.requirement_key)),
           encode(digest(format('uat-%s-%s', tenant_number, mapping.requirement_key), 'sha256'), 'hex'),
           jsonb_build_object('synthetic', true, 'environment', 'uat',
                              'requirementKey', mapping.requirement_key),
           current_auditor_user_id, now() - interval '8 days'
      FROM (VALUES
        ('access', 'FR-IAM-02'), ('access', 'FR-TEN-02'), ('access', 'FR-AUD-01'),
        ('access', 'FR-AUD-05'), ('journeys', 'FR-CAN-08'), ('journeys', 'FR-REV-04'),
        ('governance', 'FR-GOV-06'), ('governance', 'FR-GOV-07'),
        ('governance', 'FR-GOV-31'), ('audit', 'FR-AUD-02'), ('audit', 'FR-AUD-03'),
        ('audit', 'FR-AUD-04')
      ) AS mapping(collection_code, requirement_key)
      JOIN audit.requirement_traceability AS traceability
        ON traceability.tenant_id = current_tenant_id
       AND traceability.requirement_key = mapping.requirement_key
    ON CONFLICT (id) DO UPDATE SET
      display_label = EXCLUDED.display_label,
      requirement_traceability_id = EXCLUDED.requirement_traceability_id,
      reference_uri = EXCLUDED.reference_uri,
      sha256 = EXCLUDED.sha256,
      metadata = EXCLUDED.metadata,
      added_by = EXCLUDED.added_by;

    INSERT INTO audit.evidence_custody_events
      (id, tenant_id, collection_id, actor_user_id, action, detail, metadata, occurred_at)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-custody-created-%s', tenant_number, collection.code)),
           current_tenant_id,
           pg_temp.cpf_seed_uuid(format('uat-%s-evidence-collection-%s', tenant_number, collection.code)),
           current_auditor_user_id, 'created', 'Synthetic UAT collection created.',
           '{"synthetic":true}'::jsonb, now() - interval '9 days'
      FROM (VALUES ('access'), ('journeys'), ('governance'), ('audit')) AS collection(code)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO audit.evidence_custody_events
      (id, tenant_id, collection_id, actor_user_id, action, detail, metadata, occurred_at)
    SELECT pg_temp.cpf_seed_uuid(format('uat-%s-custody-item-%s', tenant_number, mapping.requirement_key)),
           current_tenant_id,
           pg_temp.cpf_seed_uuid(format('uat-%s-evidence-collection-%s', tenant_number, mapping.collection_code)),
           current_auditor_user_id, 'item_added',
           mapping.requirement_key || ' evidence linked.',
           jsonb_build_object('synthetic', true, 'requirementKey', mapping.requirement_key),
           now() - interval '8 days'
      FROM (VALUES
        ('access', 'FR-IAM-02'), ('access', 'FR-TEN-02'), ('access', 'FR-AUD-01'),
        ('access', 'FR-AUD-05'), ('journeys', 'FR-CAN-08'), ('journeys', 'FR-REV-04'),
        ('governance', 'FR-GOV-06'), ('governance', 'FR-GOV-07'),
        ('governance', 'FR-GOV-31'), ('audit', 'FR-AUD-02'), ('audit', 'FR-AUD-03'),
        ('audit', 'FR-AUD-04')
      ) AS mapping(collection_code, requirement_key)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO audit.evidence_custody_events
      (id, tenant_id, collection_id, actor_user_id, action, detail, metadata, occurred_at)
    VALUES
      (pg_temp.cpf_seed_uuid(format('uat-%s-custody-sealed-access', tenant_number)),
       current_tenant_id,
       pg_temp.cpf_seed_uuid(format('uat-%s-evidence-collection-access', tenant_number)),
       current_auditor_user_id, 'sealed', 'Access-control evidence approved and sealed.',
       '{"synthetic":true}'::jsonb, now() - interval '7 days')
    ON CONFLICT (id) DO NOTHING;

    FOR campaign_number IN 1..4 LOOP
      current_campaign_id := pg_temp.cpf_seed_uuid(format('uat-%s-campaign-%s', tenant_number, campaign_number));
      INSERT INTO hiring.campaigns
        (id, tenant_id, department_id, team_id, owner_user_id, code, title, role_name,
         seniority, status, current_version_no, created_at)
      VALUES
        (current_campaign_id, current_tenant_id,
         pg_temp.cpf_seed_uuid(format('uat-%s-dept-%s', tenant_number,
           CASE WHEN campaign_number <= 2 THEN 'product' ELSE 'operations' END)),
         NULL,
         CASE WHEN tenant_number = 1 THEN '11111111-0000-4000-8000-000000000010'::uuid
              ELSE pg_temp.cpf_seed_uuid(format('uat-%s-user-admin', tenant_number)) END,
         format('UAT-%s-%s', lpad(tenant_number::text, 2, '0'), campaign_number),
         role_titles[campaign_number] || ' · ' || tenant_name,
         role_titles[campaign_number],
         CASE WHEN campaign_number = 2 THEN 'senior' ELSE 'mid' END,
         campaign_statuses[campaign_number], 1,
         now() - make_interval(days => campaign_number * 6 + tenant_number))
      ON CONFLICT (tenant_id, code) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        updated_at = now();
    END LOOP;

    FOR candidate_number IN 1..12 LOOP
      current_candidate_id := CASE WHEN tenant_number = 1 AND candidate_number = 1
        THEN '11111111-0000-4000-8000-000000000202'::uuid
        ELSE pg_temp.cpf_seed_uuid(format('uat-%s-candidate-%s', tenant_number, candidate_number)) END;
      candidate_user_id := CASE WHEN candidate_number = 1 THEN
        CASE WHEN tenant_number = 1 THEN '11111111-0000-4000-8000-000000000012'::uuid
             ELSE pg_temp.cpf_seed_uuid(format('uat-%s-user-candidate', tenant_number)) END
        ELSE NULL END;
      INSERT INTO hiring.candidates (id, tenant_id, external_reference, status, user_id, created_at)
      VALUES
        (current_candidate_id, current_tenant_id,
         CASE WHEN tenant_number = 1 AND candidate_number = 1 THEN 'DEMO-CANDIDATE-01'
              ELSE format('UAT-%s-CAND-%s', lpad(tenant_number::text, 2, '0'), lpad(candidate_number::text, 3, '0')) END,
         CASE WHEN candidate_number = 12 THEN 'withdrawn' ELSE 'active' END,
         candidate_user_id,
         now() - make_interval(days => candidate_number + tenant_number))
      ON CONFLICT (tenant_id, external_reference) DO UPDATE SET
        status = EXCLUDED.status,
        user_id = EXCLUDED.user_id,
        updated_at = now();

      INSERT INTO hiring.applications
        (id, tenant_id, campaign_id, candidate_id, status, source, source_reference, created_at)
      VALUES
        (pg_temp.cpf_seed_uuid(format('uat-%s-application-%s', tenant_number, candidate_number)),
         current_tenant_id,
         pg_temp.cpf_seed_uuid(format('uat-%s-campaign-%s', tenant_number, ((candidate_number - 1) % 4) + 1)),
         current_candidate_id,
         application_statuses[((candidate_number - 1) % array_length(application_statuses, 1)) + 1],
         CASE WHEN candidate_number % 3 = 0 THEN 'ats' ELSE 'manual' END,
         format('UAT-SOURCE-%s-%s', tenant_number, candidate_number),
         now() - make_interval(days => candidate_number + tenant_number))
      ON CONFLICT (campaign_id, candidate_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = now();
    END LOOP;
  END LOOP;

  INSERT INTO iam.users
    (id, email, display_name, user_type, status, mfa_enforced, email_verified_at)
  VALUES
    (pg_temp.cpf_seed_uuid('uat-platform-administrator'), 'platform.admin@cpf-uat.invalid',
     'CPF Platform Administrator', 'cpf_staff', 'active', false, now())
  ON CONFLICT (email) DO UPDATE SET
    status = 'active',
    mfa_enforced = false,
    failed_login_count = 0,
    locked_until = NULL,
    updated_at = now();

  INSERT INTO iam.password_credentials
    (user_id, password_hash, reset_required, password_version, last_rotated_at)
  SELECT app_user.id, crypt('CPF-UAT-ChangeMe-2026!', gen_salt('bf', 10)), true, 1, now()
    FROM iam.users AS app_user
   WHERE app_user.email = 'platform.admin@cpf-uat.invalid'
     AND NOT EXISTS (SELECT 1 FROM iam.password_credentials AS existing
                      WHERE existing.user_id = app_user.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.memberships (id, tenant_id, user_id, status, starts_at)
  SELECT pg_temp.cpf_seed_uuid('uat-platform-membership'),
         '11111111-0000-4000-8000-000000000001'::uuid, app_user.id, 'active', now()
    FROM iam.users AS app_user
   WHERE app_user.email = 'platform.admin@cpf-uat.invalid'
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'active', ends_at = NULL, updated_at = now();

  INSERT INTO iam.membership_roles
    (membership_id, role_id, scope_type, scope_id, granted_by)
  SELECT membership.id, role.id, 'platform',
         '11111111-0000-4000-8000-000000000001'::uuid, app_user.id
    FROM iam.users AS app_user
    JOIN iam.memberships AS membership ON membership.user_id = app_user.id
    JOIN iam.roles AS role ON role.code = 'system_admin'
   WHERE app_user.email = 'platform.admin@cpf-uat.invalid'
  ON CONFLICT (membership_id, role_id, scope_type, scope_id) DO UPDATE SET expires_at = NULL;

  -- Bring any additional synthetic candidate identities from the rich Northstar fixture under the
  -- same explicit UAT credential and tenant-membership controls.
  INSERT INTO iam.password_credentials
    (user_id, password_hash, reset_required, password_version, last_rotated_at)
  SELECT app_user.id, crypt('CPF-UAT-ChangeMe-2026!', gen_salt('bf', 10)), true, 1, now()
    FROM iam.users AS app_user
   WHERE app_user.email::text LIKE '%.invalid'
     AND NOT EXISTS (SELECT 1 FROM iam.password_credentials AS password
                      WHERE password.user_id = app_user.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.memberships (id, tenant_id, user_id, status, starts_at)
  SELECT pg_temp.cpf_seed_uuid('uat-candidate-membership-' || app_user.id::text),
         candidate.tenant_id, app_user.id, 'active', now() - interval '30 days'
    FROM iam.users AS app_user
    JOIN hiring.candidates AS candidate ON candidate.user_id = app_user.id
   WHERE NOT EXISTS (SELECT 1 FROM iam.memberships AS membership
                      WHERE membership.tenant_id = candidate.tenant_id
                        AND membership.user_id = app_user.id)
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'active', ends_at = NULL;

  INSERT INTO iam.membership_roles
    (membership_id, role_id, scope_type, scope_id, granted_by)
  SELECT membership.id, role.id, 'tenant', membership.tenant_id,
         COALESCE((SELECT admin_membership.user_id
                     FROM iam.memberships AS admin_membership
                     JOIN iam.membership_roles AS admin_binding
                       ON admin_binding.membership_id = admin_membership.id
                     JOIN iam.roles AS admin_role ON admin_role.id = admin_binding.role_id
                    WHERE admin_membership.tenant_id = membership.tenant_id
                      AND admin_role.code = 'employer_admin'
                    LIMIT 1), membership.user_id)
    FROM iam.memberships AS membership
    JOIN iam.users AS app_user ON app_user.id = membership.user_id
    JOIN iam.roles AS role ON role.code = 'candidate'
   WHERE app_user.user_type = 'candidate'
  ON CONFLICT (membership_id, role_id, scope_type, scope_id) DO UPDATE SET expires_at = NULL;
END
$seed$;

COMMIT;
