BEGIN;

INSERT INTO tenant.organizations
  (id, slug, legal_name, display_name, status, data_region, default_timezone, branding, settings)
VALUES
  ('11111111-0000-4000-8000-000000000001', 'northstar-demo', 'Northstar Logistics Ltd',
   'Northstar Logistics', 'active', 'EU', 'Europe/Dublin',
   '{"productName":"CPF","accent":"#2f61d5"}'::jsonb,
   '{"demo":true,"industry":"Logistics","seatLimit":250}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  status = EXCLUDED.status,
  branding = EXCLUDED.branding,
  settings = EXCLUDED.settings,
  updated_at = now();

INSERT INTO iam.users (id, email, display_name, user_type, status, mfa_enforced)
VALUES
  ('11111111-0000-4000-8000-000000000010', 'admin@northstar.invalid', 'Morgan Lee', 'employer_user', 'active', true),
  ('11111111-0000-4000-8000-000000000011', 'reviewer@northstar.invalid', 'Avery Chen', 'employer_user', 'active', true),
  ('11111111-0000-4000-8000-000000000012', 'candidate.one@northstar.invalid', 'Jamie Patel', 'candidate', 'active', false),
  ('11111111-0000-4000-8000-000000000013', 'candidate.two@northstar.invalid', 'Riley Morgan', 'candidate', 'active', false),
  ('11111111-0000-4000-8000-000000000014', 'approver@northstar.invalid', 'Priya Shah', 'employer_user', 'active', true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  status = EXCLUDED.status,
  mfa_enforced = EXCLUDED.mfa_enforced,
  updated_at = now();

INSERT INTO iam.roles (id, code, name, scope, is_system)
VALUES
  ('11111111-0000-4000-8000-000000000020', 'employer_admin', 'Employer administrator', 'tenant', true),
  ('11111111-0000-4000-8000-000000000021', 'reviewer', 'Reviewer', 'tenant', true),
  ('11111111-0000-4000-8000-000000000022', 'candidate', 'Candidate', 'candidate_self', true),
  ('11111111-0000-4000-8000-000000000023', 'employer_admin_approver', 'Employer decision approver', 'tenant', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope;

INSERT INTO iam.memberships (id, tenant_id, user_id, status, starts_at, ends_at)
VALUES
  ('11111111-0000-4000-8000-000000000030', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000010', 'active', now() - interval '30 days', NULL),
  ('11111111-0000-4000-8000-000000000031', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000011', 'active', now() - interval '30 days', NULL),
  ('11111111-0000-4000-8000-000000000032', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000012', 'active', now() - interval '30 days', NULL),
  ('11111111-0000-4000-8000-000000000033', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000014', 'active', now() - interval '30 days', NULL)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, ends_at = NULL, updated_at = now();

INSERT INTO iam.membership_roles
  (membership_id, role_id, scope_type, scope_id, granted_by, expires_at)
SELECT fixture.membership_id::uuid, role.id, fixture.scope_type,
       fixture.scope_id::uuid, '11111111-0000-4000-8000-000000000010'::uuid, NULL
FROM (VALUES
  ('11111111-0000-4000-8000-000000000030', 'employer_admin', 'tenant',
   '11111111-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000030', 'platform_staff', 'platform',
   '11111111-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000031', 'reviewer', 'submission',
   '11111111-0000-4000-8000-000000000321'),
  ('11111111-0000-4000-8000-000000000032', 'candidate', 'submission',
   '11111111-0000-4000-8000-000000000300'),
  ('11111111-0000-4000-8000-000000000033', 'employer_admin', 'tenant',
   '11111111-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000033', 'employer_admin_approver', 'tenant',
   '11111111-0000-4000-8000-000000000001')
) AS fixture(membership_id, role_code, scope_type, scope_id)
JOIN iam.roles AS role ON role.code = fixture.role_code
ON CONFLICT (membership_id, role_id, scope_type, scope_id)
DO UPDATE SET expires_at = NULL, granted_by = EXCLUDED.granted_by;

INSERT INTO iam.user_sessions
  (id, user_id, refresh_token_hash, device_label, created_at, last_seen_at, expires_at,
   revoked_at, revocation_reason)
VALUES
  ('11111111-0000-4000-8000-000000000040', '11111111-0000-4000-8000-000000000010',
   encode(digest('cpf-demo-admin-token-2026', 'sha256'), 'hex'), 'CPF synthetic admin', now(), now(),
   now() + interval '30 days', NULL, NULL),
  ('11111111-0000-4000-8000-000000000041', '11111111-0000-4000-8000-000000000011',
   encode(digest('cpf-demo-reviewer-token-2026', 'sha256'), 'hex'), 'CPF synthetic reviewer', now(), now(),
   now() + interval '30 days', NULL, NULL),
  ('11111111-0000-4000-8000-000000000042', '11111111-0000-4000-8000-000000000012',
   encode(digest('cpf-demo-candidate-token-2026', 'sha256'), 'hex'), 'CPF synthetic candidate', now(), now(),
   now() + interval '30 days', NULL, NULL),
  ('11111111-0000-4000-8000-000000000043', '11111111-0000-4000-8000-000000000014',
   encode(digest('cpf-demo-approver-token-2026', 'sha256'), 'hex'), 'CPF synthetic approver', now(), now(),
   now() + interval '30 days', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  refresh_token_hash = EXCLUDED.refresh_token_hash,
  last_seen_at = EXCLUDED.last_seen_at,
  expires_at = EXCLUDED.expires_at,
  revoked_at = NULL,
  revocation_reason = NULL;

INSERT INTO assessment.competency_frameworks
  (id, tenant_id, code, name, owner_user_id, status)
VALUES
  ('11111111-0000-4000-8000-000000000100', '11111111-0000-4000-8000-000000000001',
   'OPS-LEAD', 'Operations Leadership', '11111111-0000-4000-8000-000000000010', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO assessment.competency_framework_versions
  (id, framework_id, version_no, content, rationale, approval_status, effective_from,
   approved_by, approved_at)
VALUES
  ('11111111-0000-4000-8000-000000000101', '11111111-0000-4000-8000-000000000100', 3,
   '{"competencies":["evidence-led judgement","operational reasoning","communication"]}'::jsonb,
   'Calibrated synthetic demo framework', 'approved', now() - interval '90 days',
   '11111111-0000-4000-8000-000000000010', now() - interval '90 days')
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, approval_status = EXCLUDED.approval_status;

INSERT INTO assessment.competencies
  (id, framework_version_id, code, name, description, level_anchors, display_order)
VALUES
  ('11111111-0000-4000-8000-000000000102', '11111111-0000-4000-8000-000000000101',
   'EVIDENCE', 'Evidence-led judgement',
   'Separates verified facts from assumptions and cites evidence for consequential decisions.',
   '["developing","meets","exceeds"]'::jsonb, 1)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, level_anchors = EXCLUDED.level_anchors;

INSERT INTO assessment.rubric_versions
  (id, tenant_id, code, version_no, status, scoring_range, weighting_policy,
   effective_from, approved_by, approved_at)
VALUES
  ('11111111-0000-4000-8000-000000000110', '11111111-0000-4000-8000-000000000001',
   'OPS-LEAD-RUBRIC', 3, 'active', '{"min":1,"max":4}'::jsonb,
   '{"method":"weighted_mean"}'::jsonb, now() - interval '60 days',
   '11111111-0000-4000-8000-000000000010', now() - interval '60 days')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, scoring_range = EXCLUDED.scoring_range;

INSERT INTO assessment.rubric_criteria
  (id, rubric_version_id, competency_id, code, title, description, weight,
   min_score, max_score, minimum_evidence_count, ai_assistance_policy, display_order)
VALUES
  ('11111111-0000-4000-8000-000000000111', '11111111-0000-4000-8000-000000000110', '11111111-0000-4000-8000-000000000102',
   'EVIDENCE', 'Evidence-led judgement', 'Uses source evidence and distinguishes facts from assumptions.', 0.25, 1, 4, 1, 'allowed', 1),
  ('11111111-0000-4000-8000-000000000112', '11111111-0000-4000-8000-000000000110', NULL,
   'CONSTRAINTS', 'Constraint identification', 'Identifies the binding operational constraint.', 0.20, 1, 4, 1, 'allowed', 2),
  ('11111111-0000-4000-8000-000000000113', '11111111-0000-4000-8000-000000000110', NULL,
   'REVERSIBILITY', 'Reversible action', 'Chooses a proportionate and reversible first step.', 0.20, 1, 4, 1, 'allowed', 3),
  ('11111111-0000-4000-8000-000000000114', '11111111-0000-4000-8000-000000000110', NULL,
   'RISK', 'Risk awareness', 'Names material risks, limits and escalation points.', 0.20, 1, 4, 1, 'allowed', 4),
  ('11111111-0000-4000-8000-000000000115', '11111111-0000-4000-8000-000000000110', NULL,
   'COMMUNICATION', 'Operational communication', 'Communicates a clear and auditable recommendation.', 0.15, 1, 4, 1, 'allowed', 5)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  weight = EXCLUDED.weight;

INSERT INTO assessment.model_registry
  (id, provider, model_key, display_name, model_version, intended_purpose, limitations,
   data_region, status, evaluation_summary, approved_by, approved_at)
VALUES
  ('11111111-0000-4000-8000-000000000120', 'cpf-demo', 'guided-assistant',
   'CPF Guided Assistant', '2026-08', 'Candidate clarification within a bounded assessment task',
   'May not score, rank, infer protected attributes or recommend progression.', 'EU', 'active',
   '{"synthetic":true,"safety":"passed"}'::jsonb,
   '11111111-0000-4000-8000-000000000010', now() - interval '30 days')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, limitations = EXCLUDED.limitations;

INSERT INTO assessment.prompt_versions
  (id, code, version_no, purpose, system_prompt, safety_policy, status, approved_by, approved_at)
VALUES
  ('11111111-0000-4000-8000-000000000121', 'candidate-guidance', 4,
   'Provide bounded task clarification without solving or scoring.',
   'Clarify instructions only. Do not produce an answer, score, rank or progression recommendation.',
   '{"noScoring":true,"noRanking":true,"humanAuthority":true}'::jsonb, 'active',
   '11111111-0000-4000-8000-000000000010', now() - interval '30 days')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, safety_policy = EXCLUDED.safety_policy;

INSERT INTO assessment.plugin_registry
  (id, code, provider, name, version, permissions, security_review, privacy_review,
   accessibility_review, status)
VALUES
  ('11111111-0000-4000-8000-000000000122', 'cpf.demo.workspace', 'CPF',
   'Synthetic Workspace', '1.0.0', '{"files":"sandbox-only"}'::jsonb,
   '{"status":"passed"}'::jsonb, '{"status":"passed"}'::jsonb,
   '{"status":"passed"}'::jsonb, 'active')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, permissions = EXCLUDED.permissions;

INSERT INTO assessment.assessments
  (id, tenant_id, code, title, target_role, seniority, owner_user_id, lifecycle_status)
VALUES
  ('11111111-0000-4000-8000-000000000130', '11111111-0000-4000-8000-000000000001',
   'OPS-LEAD-2026', 'Operations Lead Applied Assessment', 'Operations Lead', 'senior',
   '11111111-0000-4000-8000-000000000010', 'active')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, lifecycle_status = EXCLUDED.lifecycle_status;

INSERT INTO assessment.assessment_versions
  (id, assessment_id, version_no, competency_framework_version_id, rubric_version_id,
   default_model_id, default_prompt_version_id, duration_seconds, instructions,
   technical_requirements, accessibility_config, monitoring_policy, status,
   effective_from, content_hash)
VALUES
  ('11111111-0000-4000-8000-000000000131', '11111111-0000-4000-8000-000000000130', 3,
   '11111111-0000-4000-8000-000000000101', '11111111-0000-4000-8000-000000000110',
   '11111111-0000-4000-8000-000000000120', '11111111-0000-4000-8000-000000000121',
   5400, '{"summary":"Five evidence-led operational tasks"}'::jsonb,
   '{"browser":"current"}'::jsonb, '{"keyboard":true,"screenReader":true}'::jsonb,
   '{"camera":false,"microphone":false}'::jsonb, 'active', now() - interval '30 days',
   'demo-assessment-v3')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, instructions = EXCLUDED.instructions;

INSERT INTO assessment.assessment_sections
  (id, assessment_version_id, section_type, title, instructions, duration_seconds,
   display_order, config)
VALUES
  ('11111111-0000-4000-8000-000000000132', '11111111-0000-4000-8000-000000000131',
   'practical', 'Applied task', '{"evidenceRequired":true}'::jsonb, 5400, 1,
   '{"autosave":true,"taskNavigator":true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, config = EXCLUDED.config;

INSERT INTO assessment.assessment_items
  (id, section_id, item_type, title, prompt, expected_artifacts, config, display_order, content_hash)
VALUES
  ('11111111-0000-4000-8000-000000000133', '11111111-0000-4000-8000-000000000132', 'written', 'Task 1',
   '{"brief":"Summarise the available evidence and identify what is not yet known."}'::jsonb, '[]'::jsonb, '{"maxWords":300}'::jsonb, 1, 'demo-task-1'),
  ('11111111-0000-4000-8000-000000000134', '11111111-0000-4000-8000-000000000132', 'written', 'Task 2',
   '{"brief":"Identify the operational constraint, separate verified facts from assumptions, then propose a reversible first step."}'::jsonb, '[]'::jsonb, '{"maxWords":500}'::jsonb, 2, 'demo-task-2'),
  ('11111111-0000-4000-8000-000000000135', '11111111-0000-4000-8000-000000000132', 'written', 'Task 3',
   '{"brief":"Design a proportionate validation plan with clear stop conditions."}'::jsonb, '[]'::jsonb, '{"maxWords":500}'::jsonb, 3, 'demo-task-3'),
  ('11111111-0000-4000-8000-000000000136', '11111111-0000-4000-8000-000000000132', 'written', 'Task 4',
   '{"brief":"Reconcile the evidence and explain any remaining uncertainty."}'::jsonb, '[]'::jsonb, '{"maxWords":500}'::jsonb, 4, 'demo-task-4'),
  ('11111111-0000-4000-8000-000000000137', '11111111-0000-4000-8000-000000000132', 'written', 'Task 5',
   '{"brief":"Write the final operational recommendation and escalation path."}'::jsonb, '[]'::jsonb, '{"maxWords":500}'::jsonb, 5, 'demo-task-5')
ON CONFLICT (id) DO UPDATE SET prompt = EXCLUDED.prompt, config = EXCLUDED.config;

INSERT INTO hiring.campaigns
  (id, tenant_id, owner_user_id, code, title, role_name, seniority, status, current_version_no)
VALUES
  ('11111111-0000-4000-8000-000000000200', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000010', 'OPS-LEAD-AUG26',
   'Operations Lead — August 2026', 'Operations Lead', 'senior', 'active', 3)
,
  ('11111111-0000-4000-8000-000000000208', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000010', 'WAREHOUSE-SYSTEMS-AUT26',
   'Warehouse Systems Engineers — Autumn 2026', 'Warehouse Systems Engineer', 'mid', 'draft', 1),
  ('11111111-0000-4000-8000-000000000209', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000010', 'DATA-ANALYST-ROLLING',
   'Data Analysts — Rolling', 'Data Analyst', 'mid', 'paused', 2)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, updated_at = now();

INSERT INTO hiring.campaign_versions
  (id, campaign_id, tenant_id, version_no, job_description,
   competency_framework_version_id, assessment_version_id, review_policy,
   invitation_policy, scoring_policy, status, created_by)
VALUES
  ('11111111-0000-4000-8000-000000000201', '11111111-0000-4000-8000-000000000200',
   '11111111-0000-4000-8000-000000000001', 3,
   'Lead evidence-based recovery and continuous improvement across a multi-site logistics operation.',
   '11111111-0000-4000-8000-000000000101', '11111111-0000-4000-8000-000000000131',
   '{"blindReview":true,"reviewerCount":2,"aiReveal":"afterIndependentReview"}'::jsonb,
   '{"maxAttempts":2}'::jsonb, '{"method":"weighted_mean","humanOnly":true}'::jsonb,
   'active', '11111111-0000-4000-8000-000000000010')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, review_policy = EXCLUDED.review_policy;

INSERT INTO hiring.candidates (id, tenant_id, external_reference, status, user_id)
VALUES
  ('11111111-0000-4000-8000-000000000202', '11111111-0000-4000-8000-000000000001', 'DEMO-CANDIDATE-01', 'active', '11111111-0000-4000-8000-000000000012'),
  ('11111111-0000-4000-8000-000000000205', '11111111-0000-4000-8000-000000000001', 'DEMO-CANDIDATE-02', 'active', '11111111-0000-4000-8000-000000000013'),
  ('11111111-0000-4000-8000-000000000210', '11111111-0000-4000-8000-000000000001', 'DEMO-CANDIDATE-03', 'active', NULL),
  ('11111111-0000-4000-8000-000000000213', '11111111-0000-4000-8000-000000000001', 'DEMO-CANDIDATE-04', 'withdrawn', NULL),
  ('11111111-0000-4000-8000-000000000216', '11111111-0000-4000-8000-000000000001', 'DEMO-CANDIDATE-05', 'active', NULL)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  user_id = EXCLUDED.user_id,
  updated_at = now();

INSERT INTO hiring.applications
  (id, tenant_id, campaign_id, candidate_id, status, source, source_reference)
VALUES
  ('11111111-0000-4000-8000-000000000203', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000200', '11111111-0000-4000-8000-000000000202',
   'started', 'demo_seed', 'NORTHSTAR-OPS-001'),
  ('11111111-0000-4000-8000-000000000206', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000200', '11111111-0000-4000-8000-000000000205',
   'in_review', 'demo_seed', 'NORTHSTAR-OPS-002'),
  ('11111111-0000-4000-8000-000000000211', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000208', '11111111-0000-4000-8000-000000000210',
   'invited', 'demo_seed', 'NORTHSTAR-WAREHOUSE-001'),
  ('11111111-0000-4000-8000-000000000214', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000209', '11111111-0000-4000-8000-000000000213',
   'withdrawn', 'demo_seed', 'NORTHSTAR-DATA-001'),
  ('11111111-0000-4000-8000-000000000217', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000200', '11111111-0000-4000-8000-000000000216',
   'reviewed', 'demo_seed', 'NORTHSTAR-OPS-005')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

INSERT INTO hiring.invitations
  (id, tenant_id, application_id, token_hash, status, max_attempts, valid_from,
   expires_at, sent_at, created_by)
VALUES
  ('11111111-0000-4000-8000-000000000204', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000203', 'demo-token-current-2026', 'accepted', 2,
   now() - interval '2 days', now() + interval '5 days', now() - interval '2 days',
   '11111111-0000-4000-8000-000000000010'),
  ('11111111-0000-4000-8000-000000000207', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000206', 'demo-token-submitted-2026', 'completed', 1,
   now() - interval '5 days', now() + interval '2 days', now() - interval '5 days',
   '11111111-0000-4000-8000-000000000010'),
  ('11111111-0000-4000-8000-000000000212', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000211', 'demo-token-warehouse-2026', 'sent', 2,
   now() - interval '1 day', now() + interval '9 days', now() - interval '1 day',
   '11111111-0000-4000-8000-000000000010'),
  ('11111111-0000-4000-8000-000000000215', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000214', 'demo-token-data-expired-2026', 'expired', 1,
   now() - interval '12 days', now() - interval '2 days', now() - interval '12 days',
   '11111111-0000-4000-8000-000000000010')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, expires_at = EXCLUDED.expires_at;

INSERT INTO runtime.attempts
  (id, tenant_id, application_id, invitation_id, attempt_no, status,
   started_at, submitted_at, remaining_seconds, row_version)
VALUES
  ('11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000203', '11111111-0000-4000-8000-000000000204',
   1, 'in_progress', now() - interval '8 minutes', NULL, 4935, 3),
  ('11111111-0000-4000-8000-000000000301', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000206', '11111111-0000-4000-8000-000000000207',
   1, 'submitted', now() - interval '3 days', now() - interval '3 days' + interval '74 minutes', 0, 8)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  submitted_at = EXCLUDED.submitted_at,
  remaining_seconds = EXCLUDED.remaining_seconds,
  row_version = EXCLUDED.row_version,
  updated_at = now();

INSERT INTO runtime.attempt_version_bindings
  (attempt_id, tenant_id, campaign_version_id, assessment_version_id, rubric_version_id,
   competency_framework_version_id, model_id, prompt_version_id, plugin_policy_snapshot,
   monitoring_policy_snapshot, scoring_policy_snapshot, binding_hash)
VALUES
  ('11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000201', '11111111-0000-4000-8000-000000000131',
   '11111111-0000-4000-8000-000000000110', '11111111-0000-4000-8000-000000000101',
   '11111111-0000-4000-8000-000000000120', '11111111-0000-4000-8000-000000000121',
   '{"allowed":["cpf.demo.workspace"]}'::jsonb, '{"camera":false}'::jsonb,
   '{"humanOnly":true}'::jsonb, 'northstar-binding-current-v3'),
  ('11111111-0000-4000-8000-000000000301', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000201', '11111111-0000-4000-8000-000000000131',
   '11111111-0000-4000-8000-000000000110', '11111111-0000-4000-8000-000000000101',
   '11111111-0000-4000-8000-000000000120', '11111111-0000-4000-8000-000000000121',
   '{"allowed":["cpf.demo.workspace"]}'::jsonb, '{"camera":false}'::jsonb,
   '{"humanOnly":true}'::jsonb, 'northstar-binding-submitted-v3')
ON CONFLICT (attempt_id) DO UPDATE SET
  assessment_version_id = EXCLUDED.assessment_version_id,
  rubric_version_id = EXCLUDED.rubric_version_id,
  binding_hash = EXCLUDED.binding_hash;

INSERT INTO runtime.responses
  (id, tenant_id, attempt_id, assessment_item_id, response_json, state, row_version, updated_at)
VALUES
  ('11111111-0000-4000-8000-000000000340', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000133',
   '{"value":"The available telemetry confirms the recovery window; queue ownership remains unverified."}'::jsonb,
   'draft', 2, now() - interval '4 minutes'),
  ('11111111-0000-4000-8000-000000000341', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000134',
   '{"value":"The confirmed constraint is the four-hour recovery window. I would isolate the affected queue, preserve current evidence, and validate capacity before changing the wider workflow."}'::jsonb,
   'draft', 3, now() - interval '90 seconds'),
  ('11111111-0000-4000-8000-000000000344', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000135',
   '{"value":"I would run a bounded validation with an explicit rollback point, compare queue latency before and after, and stop if recovery capacity falls below the agreed threshold."}'::jsonb,
   'draft', 1, now() - interval '70 seconds'),
  ('11111111-0000-4000-8000-000000000345', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000136',
   '{"value":"The evidence supports queue isolation as a short-term control, but ownership and downstream capacity remain uncertain and should be escalated before a permanent change."}'::jsonb,
   'draft', 1, now() - interval '55 seconds'),
  ('11111111-0000-4000-8000-000000000346', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000137',
   '{"value":"Proceed with a reversible queue isolation, monitor the recovery window and capacity guardrails, and escalate to the operations owner if either threshold is breached."}'::jsonb,
   'draft', 1, now() - interval '40 seconds'),
  ('11111111-0000-4000-8000-000000000350', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000301', '11111111-0000-4000-8000-000000000134',
   '{"value":"The response proposes a reversible first step and names the evidence needed before proceeding."}'::jsonb,
   'final', 4, now() - interval '3 days' + interval '70 minutes')
ON CONFLICT (attempt_id, assessment_item_id) DO UPDATE SET
  response_json = EXCLUDED.response_json,
  state = EXCLUDED.state,
  row_version = EXCLUDED.row_version,
  updated_at = EXCLUDED.updated_at;

INSERT INTO runtime.item_flags
  (id, tenant_id, attempt_id, assessment_item_id, flagged, updated_at)
VALUES
  ('11111111-0000-4000-8000-000000000342', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000135', true, now())
ON CONFLICT (id) DO UPDATE SET flagged = EXCLUDED.flagged, updated_at = now();

INSERT INTO runtime.precheck_runs
  (id, tenant_id, attempt_id, status, checks, started_at, completed_at, does_not_consume_attempt)
VALUES
  ('11111111-0000-4000-8000-000000000343', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', 'passed',
   '{"browser":true,"network":true,"keyboard":true,"screenReader":true}'::jsonb,
   now() - interval '12 minutes', now() - interval '11 minutes', true)
ON CONFLICT (id) DO UPDATE SET checks = EXCLUDED.checks, status = EXCLUDED.status;

INSERT INTO evidence.ai_conversations
  (id, tenant_id, attempt_id, assessment_item_id, model_id, prompt_version_id, status, started_at)
VALUES
  ('11111111-0000-4000-8000-000000000360', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000300', '11111111-0000-4000-8000-000000000134',
   '11111111-0000-4000-8000-000000000120', '11111111-0000-4000-8000-000000000121',
   'active', now() - interval '6 minutes')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, ended_at = NULL;

INSERT INTO runtime.submissions
  (id, tenant_id, attempt_id, manifest, manifest_hash, status, submitted_at, confirmation_code)
VALUES
  ('11111111-0000-4000-8000-000000000310', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000301',
   '{"responses":5,"artifacts":1,"bindingHash":"northstar-binding-submitted-v3"}'::jsonb,
   'northstar-submission-manifest-v1', 'accepted', now() - interval '3 days' + interval '74 minutes',
   'CPF-DEMO-2026-0001')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, manifest = EXCLUDED.manifest;

INSERT INTO hiring.reviewer_profiles
  (id, tenant_id, user_id, expertise, training_status, calibration_status,
   conflict_declaration_required, max_active_reviews)
VALUES
  ('11111111-0000-4000-8000-000000000320', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000011', '["operations","evidence-led assessment"]'::jsonb,
   'passed', 'calibrated', true, 8)
ON CONFLICT (id) DO UPDATE SET
  expertise = EXCLUDED.expertise,
  training_status = EXCLUDED.training_status,
  calibration_status = EXCLUDED.calibration_status,
  updated_at = now();

INSERT INTO review.reviewer_assignments
  (id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group,
   status, assigned_at, due_at)
VALUES
  ('11111111-0000-4000-8000-000000000321', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000310', '11111111-0000-4000-8000-000000000320',
   'primary', 'blind-a', 'in_progress', now() - interval '1 day', now() + interval '2 days')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, due_at = EXCLUDED.due_at;

INSERT INTO review.scorecards
  (id, tenant_id, assignment_id, rubric_version_id, status, overall_confidence,
   summary, submitted_at, created_at, updated_at)
VALUES
  ('11111111-0000-4000-8000-000000000322', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000321', '11111111-0000-4000-8000-000000000110',
   'draft', 0.78, 'Evidence is clear on the initial constraint; two criteria remain to be completed.',
   NULL, now() - interval '3 hours', now() - interval '28 minutes')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  overall_confidence = EXCLUDED.overall_confidence,
  summary = EXCLUDED.summary,
  updated_at = EXCLUDED.updated_at;

INSERT INTO review.criterion_scores
  (id, tenant_id, scorecard_id, criterion_id, human_score, confidence,
   insufficient_evidence, evidence_links, reviewer_comment, created_at, updated_at)
VALUES
  ('11111111-0000-4000-8000-000000000331', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000322', '11111111-0000-4000-8000-000000000111',
   3, 0.85, false, '[{"responseId":"11111111-0000-4000-8000-000000000350","locator":"paragraph 2"}]'::jsonb,
   'Uses the confirmed recovery window and keeps assumptions explicit.', now() - interval '32 minutes', now() - interval '28 minutes'),
  ('11111111-0000-4000-8000-000000000332', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000322', '11111111-0000-4000-8000-000000000112',
   3, 0.80, false, '[{"responseId":"11111111-0000-4000-8000-000000000350","locator":"paragraph 1"}]'::jsonb,
   'Identifies the four-hour recovery window as the binding constraint.', now() - interval '26 minutes', now() - interval '22 minutes'),
  ('11111111-0000-4000-8000-000000000333', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000322', '11111111-0000-4000-8000-000000000113',
   3, 0.74, false, '[{"responseId":"11111111-0000-4000-8000-000000000350","locator":"paragraph 2"}]'::jsonb,
   'The first action is bounded, reversible, and paired with an explicit validation step.', now() - interval '20 minutes', now() - interval '18 minutes')
ON CONFLICT (scorecard_id, criterion_id) DO UPDATE SET
  human_score = EXCLUDED.human_score,
  confidence = EXCLUDED.confidence,
  evidence_links = EXCLUDED.evidence_links,
  reviewer_comment = EXCLUDED.reviewer_comment,
  updated_at = EXCLUDED.updated_at;

INSERT INTO evidence.evidence_objects
  (id, tenant_id, attempt_id, evidence_type, source_table, source_id, object_uri,
   sha256, metadata, created_at)
VALUES
  ('11111111-0000-4000-8000-000000000370', '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000301', 'candidate_response', 'runtime.responses',
   '11111111-0000-4000-8000-000000000350', NULL, 'northstar-response-task2-v4',
   '{"task":"Task 2","version":4,"sourceLabel":"Candidate response"}'::jsonb,
   now() - interval '3 days' + interval '70 minutes')
ON CONFLICT (id) DO UPDATE SET metadata = EXCLUDED.metadata, sha256 = EXCLUDED.sha256;

COMMIT;
