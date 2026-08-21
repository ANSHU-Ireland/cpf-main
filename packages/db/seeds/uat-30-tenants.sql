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
