-- CPF AI-Native Hiring Assessment Platform
-- PostgreSQL 16+ logical schema baseline
-- Version 2.0 - 4 August 2026
-- Prefer application-generated UUIDv7; gen_random_uuid() is a fallback.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS assessment;
CREATE SCHEMA IF NOT EXISTS hiring;
CREATE SCHEMA IF NOT EXISTS runtime;
CREATE SCHEMA IF NOT EXISTS evidence;
CREATE SCHEMA IF NOT EXISTS review;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS support;

CREATE OR REPLACE FUNCTION audit.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION iam.current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION iam.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE TABLE tenant.plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('active','inactive','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug citext NOT NULL UNIQUE,
 legal_name text NOT NULL, display_name text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','pending_approval','active','suspended','terminated')),
 data_region text NOT NULL DEFAULT 'EU', default_timezone text NOT NULL DEFAULT 'Europe/Dublin',
 branding jsonb NOT NULL DEFAULT '{}'::jsonb, settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 suspended_at timestamptz, terminated_at timestamptz
);

CREATE TABLE tenant.subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 plan_id uuid NOT NULL REFERENCES tenant.plans(id),
 status text NOT NULL CHECK (status IN ('trial','active','past_due','suspended','cancelled','ended')),
 starts_at timestamptz NOT NULL, ends_at timestamptz, overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant.departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 name text NOT NULL, code text, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id,name)
);

CREATE TABLE tenant.teams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 department_id uuid REFERENCES tenant.departments(id), name text NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id,department_id,name)
);

CREATE TABLE iam.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email citext UNIQUE, display_name text,
 user_type text NOT NULL CHECK (user_type IN ('cpf_staff','employer_user','candidate','service')),
 status text NOT NULL CHECK (status IN ('invited','active','locked','disabled','deleted')),
 external_subject text, mfa_enforced boolean NOT NULL DEFAULT false, last_login_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 scope text NOT NULL CHECK (scope IN ('platform','tenant','campaign','candidate_self')),
 is_system boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, description text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.role_permissions (
 role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
 PRIMARY KEY (role_id,permission_id)
);
CREATE TABLE iam.memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 user_id uuid NOT NULL REFERENCES iam.users(id), department_id uuid REFERENCES tenant.departments(id),
 team_id uuid REFERENCES tenant.teams(id),
 status text NOT NULL CHECK (status IN ('invited','active','suspended','revoked')),
 starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,user_id)
);
CREATE TABLE iam.membership_roles (
 membership_id uuid NOT NULL REFERENCES iam.memberships(id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES iam.roles(id),
 scope_type text NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('platform','tenant','department','team','campaign','submission')),
 scope_id uuid, granted_by uuid REFERENCES iam.users(id), granted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz, PRIMARY KEY (membership_id,role_id,scope_type,scope_id)
);
CREATE TABLE iam.sso_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 protocol text NOT NULL CHECK (protocol IN ('oidc','saml')), issuer text NOT NULL, client_id text,
 encrypted_secret bytea, config jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('draft','active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.privileged_access_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 user_id uuid NOT NULL REFERENCES iam.users(id), case_reference text NOT NULL,
 purpose text NOT NULL CHECK (purpose IN ('support','security','compliance','legal')),
 approved_by uuid NOT NULL REFERENCES iam.users(id), starts_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assessment.competency_frameworks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 code text NOT NULL, name text NOT NULL, owner_user_id uuid REFERENCES iam.users(id),
 status text NOT NULL CHECK (status IN ('draft','active','retired')), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,code)
);
CREATE TABLE assessment.competency_framework_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), framework_id uuid NOT NULL REFERENCES assessment.competency_frameworks(id),
 version_no integer NOT NULL, content jsonb NOT NULL, rationale text,
 approval_status text NOT NULL CHECK (approval_status IN ('draft','in_review','approved','rejected','retired')),
 effective_from timestamptz, effective_to timestamptz, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (framework_id,version_no)
);
CREATE TABLE assessment.competencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), framework_version_id uuid NOT NULL REFERENCES assessment.competency_framework_versions(id),
 code text NOT NULL, name text NOT NULL, description text NOT NULL,
 level_anchors jsonb NOT NULL DEFAULT '[]'::jsonb, display_order integer NOT NULL,
 UNIQUE (framework_version_id,code)
);
CREATE TABLE assessment.assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 code text NOT NULL, title text NOT NULL, target_role text NOT NULL, seniority text NOT NULL,
 owner_user_id uuid REFERENCES iam.users(id),
 lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('draft','internal_review','compliance_review','technical_validation','pilot','calibration','approved','active','suspended','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,code)
);
CREATE TABLE assessment.rubric_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 code text NOT NULL, version_no integer NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','approved','active','suspended','retired')),
 scoring_range jsonb NOT NULL, weighting_policy jsonb NOT NULL,
 effective_from timestamptz, effective_to timestamptz, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (tenant_id,code,version_no)
);
CREATE TABLE assessment.rubric_criteria (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rubric_version_id uuid NOT NULL REFERENCES assessment.rubric_versions(id),
 competency_id uuid REFERENCES assessment.competencies(id), code text NOT NULL, title text NOT NULL, description text NOT NULL,
 weight numeric(7,4) NOT NULL CHECK (weight>=0), min_score numeric(10,4) NOT NULL, max_score numeric(10,4) NOT NULL,
 minimum_evidence_count integer NOT NULL DEFAULT 1, ai_assistance_policy text NOT NULL DEFAULT 'allowed',
 display_order integer NOT NULL, UNIQUE (rubric_version_id,code), CHECK (max_score>=min_score)
);
CREATE TABLE assessment.rubric_anchors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), criterion_id uuid NOT NULL REFERENCES assessment.rubric_criteria(id) ON DELETE CASCADE,
 score_value numeric(10,4) NOT NULL, label text NOT NULL, description text NOT NULL,
 evidence_examples jsonb NOT NULL DEFAULT '[]'::jsonb, UNIQUE (criterion_id,score_value)
);
CREATE TABLE assessment.model_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, model_key text NOT NULL,
 display_name text NOT NULL, model_version text NOT NULL, intended_purpose text NOT NULL, limitations text NOT NULL,
 data_region text, status text NOT NULL CHECK (status IN ('draft','evaluating','approved','active','suspended','retired')),
 evaluation_summary jsonb NOT NULL DEFAULT '{}'::jsonb, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (provider,model_key,model_version)
);
CREATE TABLE assessment.prompt_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL, version_no integer NOT NULL, purpose text NOT NULL,
 system_prompt text NOT NULL, safety_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('draft','approved','active','suspended','retired')),
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (code,version_no)
);
CREATE TABLE assessment.plugin_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL, provider text NOT NULL, name text NOT NULL, version text NOT NULL,
 permissions jsonb NOT NULL DEFAULT '{}'::jsonb, security_review jsonb NOT NULL DEFAULT '{}'::jsonb,
 privacy_review jsonb NOT NULL DEFAULT '{}'::jsonb, accessibility_review jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('draft','review','approved','active','suspended','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (code,version)
);
CREATE TABLE assessment.assessment_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES assessment.assessments(id),
 version_no integer NOT NULL, competency_framework_version_id uuid NOT NULL REFERENCES assessment.competency_framework_versions(id),
 rubric_version_id uuid NOT NULL REFERENCES assessment.rubric_versions(id), default_model_id uuid REFERENCES assessment.model_registry(id),
 default_prompt_version_id uuid REFERENCES assessment.prompt_versions(id), duration_seconds integer NOT NULL CHECK (duration_seconds>0),
 instructions jsonb NOT NULL, technical_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
 accessibility_config jsonb NOT NULL DEFAULT '{}'::jsonb, monitoring_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('draft','approved','active','suspended','retired')),
 effective_from timestamptz, effective_to timestamptz, revalidate_by date, content_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (assessment_id,version_no)
);
CREATE TABLE assessment.assessment_sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id),
 section_type text NOT NULL CHECK (section_type IN ('behavioural','knowledge','practical','ai_collaboration','reflection')),
 title text NOT NULL, instructions jsonb NOT NULL, duration_seconds integer, display_order integer NOT NULL,
 config jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE (assessment_version_id,display_order)
);
CREATE TABLE assessment.assessment_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section_id uuid NOT NULL REFERENCES assessment.assessment_sections(id),
 item_type text NOT NULL, title text NOT NULL, prompt jsonb NOT NULL,
 expected_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb, config jsonb NOT NULL DEFAULT '{}'::jsonb,
 display_order integer NOT NULL, content_hash text NOT NULL, UNIQUE (section_id,display_order)
);
CREATE TABLE assessment.assessment_tool_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id),
 plugin_id uuid REFERENCES assessment.plugin_registry(id), model_id uuid REFERENCES assessment.model_registry(id),
 prompt_version_id uuid REFERENCES assessment.prompt_versions(id),
 tool_type text NOT NULL CHECK (tool_type IN ('ai_model','plugin','internet','file_upload','file_download','clipboard','terminal','code_execution')),
 is_allowed boolean NOT NULL, limits jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assessment.assessment_validations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id),
 validation_type text NOT NULL CHECK (validation_type IN ('job_relevance','accessibility','privacy','security','fairness','technical','pilot','calibration')),
 status text NOT NULL CHECK (status IN ('pending','passed','passed_with_conditions','failed','expired')),
 evidence_uri text, summary text, reviewer_user_id uuid REFERENCES iam.users(id), reviewed_at timestamptz,
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hiring.reviewer_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 user_id uuid NOT NULL REFERENCES iam.users(id), expertise jsonb NOT NULL DEFAULT '[]'::jsonb,
 training_status text NOT NULL DEFAULT 'not_started', calibration_status text NOT NULL DEFAULT 'not_calibrated',
 conflict_declaration_required boolean NOT NULL DEFAULT true, max_active_reviews integer,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id,user_id)
);
CREATE TABLE hiring.candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 external_reference text, status text NOT NULL CHECK (status IN ('active','withdrawn','restricted','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,external_reference)
);
CREATE TABLE hiring.candidate_pii (
 candidate_id uuid PRIMARY KEY REFERENCES hiring.candidates(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenant.organizations(id), encrypted_full_name bytea NOT NULL,
 email_hash text NOT NULL, encrypted_email bytea NOT NULL, encrypted_phone bytea, encrypted_address bytea,
 pii_key_version text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hiring.campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 department_id uuid REFERENCES tenant.departments(id), team_id uuid REFERENCES tenant.teams(id),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), code text NOT NULL, title text NOT NULL,
 role_name text NOT NULL, seniority text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','active','paused','closed','archived')),
 current_version_no integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id,code)
);
CREATE TABLE hiring.campaign_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES hiring.campaigns(id),
 tenant_id uuid NOT NULL REFERENCES tenant.organizations(id), version_no integer NOT NULL, job_description text NOT NULL,
 competency_framework_version_id uuid NOT NULL REFERENCES assessment.competency_framework_versions(id),
 assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id), review_policy jsonb NOT NULL,
 invitation_policy jsonb NOT NULL DEFAULT '{}'::jsonb, scoring_policy jsonb NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','active','superseded')),
 created_by uuid NOT NULL REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (campaign_id,version_no)
);
CREATE TABLE hiring.applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 campaign_id uuid NOT NULL REFERENCES hiring.campaigns(id), candidate_id uuid NOT NULL REFERENCES hiring.candidates(id),
 status text NOT NULL CHECK (status IN ('created','invited','started','submitted','in_review','reviewed','progressed','not_progressed','withdrawn','cancelled')),
 source text NOT NULL DEFAULT 'manual', source_reference text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (campaign_id,candidate_id)
);
CREATE TABLE hiring.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id), token_hash text NOT NULL UNIQUE,
 status text NOT NULL CHECK (status IN ('created','sent','delivered','opened','accepted','expired','revoked','completed')),
 max_attempts integer NOT NULL DEFAULT 1, valid_from timestamptz, expires_at timestamptz NOT NULL,
 sent_at timestamptz, revoked_at timestamptz, created_by uuid NOT NULL REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hiring.accommodations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id), request_summary text NOT NULL, encrypted_details bytea,
 operational_adjustments jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('requested','under_review','approved','partially_approved','declined','applied','closed')),
 reviewed_by uuid REFERENCES iam.users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hiring.notice_acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id),
 notice_type text NOT NULL CHECK (notice_type IN ('privacy','monitoring','ai_use','assessment_rules','accessibility')),
 notice_version text NOT NULL, acknowledged_at timestamptz NOT NULL, ip_hash text, user_agent_hash text,
 UNIQUE (application_id,notice_type,notice_version)
);
CREATE TABLE hiring.campaign_reviewers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 campaign_id uuid NOT NULL REFERENCES hiring.campaigns(id), reviewer_profile_id uuid NOT NULL REFERENCES hiring.reviewer_profiles(id),
 role text NOT NULL CHECK (role IN ('primary','secondary','adjudicator','qa')),
 conflict_status text NOT NULL DEFAULT 'pending' CHECK (conflict_status IN ('pending','clear','declared','waived')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (campaign_id,reviewer_profile_id,role)
);

CREATE TABLE runtime.attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id), invitation_id uuid NOT NULL REFERENCES hiring.invitations(id),
 attempt_no integer NOT NULL,
 status text NOT NULL CHECK (status IN ('created','precheck','ready','in_progress','paused','submitted','invalidated','abandoned','cancelled')),
 started_at timestamptz, submitted_at timestamptz, invalidated_at timestamptz, remaining_seconds integer,
 row_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (application_id,attempt_no)
);
CREATE TABLE runtime.attempt_version_bindings (
 attempt_id uuid PRIMARY KEY REFERENCES runtime.attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenant.organizations(id), campaign_version_id uuid NOT NULL REFERENCES hiring.campaign_versions(id),
 assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id), rubric_version_id uuid NOT NULL REFERENCES assessment.rubric_versions(id),
 competency_framework_version_id uuid NOT NULL REFERENCES assessment.competency_framework_versions(id),
 model_id uuid REFERENCES assessment.model_registry(id), prompt_version_id uuid REFERENCES assessment.prompt_versions(id),
 plugin_policy_snapshot jsonb NOT NULL, monitoring_policy_snapshot jsonb NOT NULL, scoring_policy_snapshot jsonb NOT NULL,
 binding_hash text NOT NULL, bound_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE runtime.precheck_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), status text NOT NULL CHECK (status IN ('running','passed','failed','cancelled')),
 checks jsonb NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz,
 does_not_consume_attempt boolean NOT NULL DEFAULT true
);
CREATE TABLE runtime.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), session_token_hash text NOT NULL UNIQUE,
 status text NOT NULL CHECK (status IN ('starting','active','disconnected','recovering','ended','terminated')),
 device_fingerprint_hash text, proctor_app_version text, started_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL, ended_at timestamptz, termination_reason text
);
CREATE TABLE runtime.workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), workspace_type text NOT NULL,
 status text NOT NULL CHECK (status IN ('provisioning','ready','active','frozen','archived','destroyed')),
 sandbox_reference text, config_snapshot jsonb NOT NULL, provisioned_at timestamptz, destroyed_at timestamptz,
 UNIQUE (attempt_id,workspace_type)
);
CREATE TABLE runtime.responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), assessment_item_id uuid NOT NULL REFERENCES assessment.assessment_items(id),
 response_json jsonb NOT NULL DEFAULT '{}'::jsonb, state text NOT NULL CHECK (state IN ('draft','final')),
 row_version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (attempt_id,assessment_item_id)
);
CREATE TABLE runtime.autosaves (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), response_id uuid REFERENCES runtime.responses(id),
 client_sequence bigint NOT NULL, content_hash text NOT NULL, delta jsonb NOT NULL,
 server_received_at timestamptz NOT NULL DEFAULT now(), UNIQUE (attempt_id,client_sequence)
);
CREATE TABLE runtime.artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), assessment_item_id uuid REFERENCES assessment.assessment_items(id),
 artifact_type text NOT NULL, object_uri text NOT NULL, sha256 text NOT NULL, media_type text,
 size_bytes bigint NOT NULL CHECK (size_bytes>=0),
 malware_scan_status text NOT NULL DEFAULT 'pending' CHECK (malware_scan_status IN ('pending','clean','infected','error')),
 source text NOT NULL CHECK (source IN ('candidate','workspace','plugin','system')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE runtime.submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL UNIQUE REFERENCES runtime.attempts(id), manifest jsonb NOT NULL, manifest_hash text NOT NULL,
 status text NOT NULL CHECK (status IN ('finalising','submitted','quarantined','accepted','superseded')),
 submitted_at timestamptz NOT NULL, confirmation_code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence.ai_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), assessment_item_id uuid REFERENCES assessment.assessment_items(id),
 model_id uuid NOT NULL REFERENCES assessment.model_registry(id), prompt_version_id uuid NOT NULL REFERENCES assessment.prompt_versions(id),
 status text NOT NULL CHECK (status IN ('active','closed','blocked','error')),
 started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);
CREATE TABLE evidence.ai_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 conversation_id uuid NOT NULL REFERENCES evidence.ai_conversations(id), sequence_no integer NOT NULL,
 role text NOT NULL CHECK (role IN ('system','candidate','assistant','tool')), content jsonb NOT NULL,
 token_metadata jsonb NOT NULL DEFAULT '{}'::jsonb, safety_events jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (conversation_id,sequence_no)
);
CREATE TABLE evidence.tool_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 conversation_id uuid REFERENCES evidence.ai_conversations(id), attempt_id uuid NOT NULL REFERENCES runtime.attempts(id),
 tool_name text NOT NULL, request_json jsonb NOT NULL, response_json jsonb,
 status text NOT NULL CHECK (status IN ('requested','approved','running','succeeded','failed','blocked')),
 started_at timestamptz, completed_at timestamptz, error_code text
);
CREATE TABLE evidence.plugin_executions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), plugin_id uuid NOT NULL REFERENCES assessment.plugin_registry(id),
 assessment_item_id uuid REFERENCES assessment.assessment_items(id), action text NOT NULL, input_json jsonb NOT NULL,
 output_json jsonb, status text NOT NULL CHECK (status IN ('requested','allowed','running','succeeded','failed','blocked')),
 started_at timestamptz NOT NULL, completed_at timestamptz, failure_incident_id uuid
);
CREATE TABLE evidence.evidence_objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), evidence_type text NOT NULL, source_table text NOT NULL,
 source_id uuid NOT NULL, object_uri text, sha256 text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE evidence.integrity_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), event_type text NOT NULL, detection_source text NOT NULL,
 occurred_at timestamptz NOT NULL, confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
 technical_evidence jsonb NOT NULL, alternative_explanations jsonb NOT NULL DEFAULT '[]'::jsonb,
 system_limitations jsonb NOT NULL DEFAULT '[]'::jsonb, candidate_context text,
 status text NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed','under_review','resolved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE evidence.technical_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), incident_type text NOT NULL,
 source text NOT NULL CHECK (source IN ('candidate','system','plugin','ai_provider','support')),
 severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')), description text NOT NULL,
 telemetry jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL CHECK (status IN ('open','investigating','resolved','closed')),
 occurred_at timestamptz NOT NULL, resolved_at timestamptz, remedy text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE review.reviewer_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 submission_id uuid NOT NULL REFERENCES runtime.submissions(id), reviewer_profile_id uuid NOT NULL REFERENCES hiring.reviewer_profiles(id),
 assignment_type text NOT NULL CHECK (assignment_type IN ('primary','secondary','adjudication','qa','integrity')),
 blind_group text, status text NOT NULL CHECK (status IN ('assigned','accepted','in_progress','submitted','reassigned','cancelled')),
 assigned_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz, submitted_at timestamptz,
 UNIQUE (submission_id,reviewer_profile_id,assignment_type)
);
CREATE TABLE review.scorecards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 assignment_id uuid NOT NULL UNIQUE REFERENCES review.reviewer_assignments(id), rubric_version_id uuid NOT NULL REFERENCES assessment.rubric_versions(id),
 status text NOT NULL CHECK (status IN ('draft','submitted','locked','superseded')),
 overall_confidence numeric(5,4) CHECK (overall_confidence BETWEEN 0 AND 1), summary text, submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review.criterion_scores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 scorecard_id uuid NOT NULL REFERENCES review.scorecards(id), criterion_id uuid NOT NULL REFERENCES assessment.rubric_criteria(id),
 human_score numeric(10,4), ai_observation_id uuid,
 ai_observation_disposition text CHECK (ai_observation_disposition IN ('useful','edited','rejected','reported')),
 confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1), insufficient_evidence boolean NOT NULL DEFAULT false,
 evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb, reviewer_comment text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (scorecard_id,criterion_id)
);
CREATE TABLE review.review_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 scorecard_id uuid NOT NULL REFERENCES review.scorecards(id), author_user_id uuid NOT NULL REFERENCES iam.users(id),
 comment_type text NOT NULL CHECK (comment_type IN ('evidence','clarification','defect','compliance','general')),
 body text NOT NULL, evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review.aggregate_scores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 submission_id uuid NOT NULL REFERENCES runtime.submissions(id), scoring_policy_hash text NOT NULL,
 status text NOT NULL CHECK (status IN ('provisional','final','superseded')), total_score numeric(12,4), performance_band text,
 confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1), component_scores jsonb NOT NULL,
 reviewer_agreement jsonb NOT NULL DEFAULT '{}'::jsonb, calculated_at timestamptz NOT NULL DEFAULT now(), version_no integer NOT NULL,
 UNIQUE (submission_id,version_no)
);
CREATE TABLE review.score_overrides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 criterion_score_id uuid REFERENCES review.criterion_scores(id), aggregate_score_id uuid REFERENCES review.aggregate_scores(id),
 original_value jsonb NOT NULL, revised_value jsonb NOT NULL, reason text NOT NULL,
 evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb, overridden_by uuid NOT NULL REFERENCES iam.users(id),
 secondary_approval_required boolean NOT NULL DEFAULT false, approved_by uuid REFERENCES iam.users(id),
 approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review.integrity_resolutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 integrity_event_id uuid NOT NULL REFERENCES evidence.integrity_events(id), assignment_id uuid REFERENCES review.reviewer_assignments(id),
 resolution text NOT NULL CHECK (resolution IN ('explained','technical_issue','inconclusive','immaterial','requires_clarification','material_integrity_concern')),
 rationale text NOT NULL, evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
 resolved_by uuid NOT NULL REFERENCES iam.users(id), resolved_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (integrity_event_id,assignment_id)
);
CREATE TABLE review.comparison_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 campaign_id uuid NOT NULL REFERENCES hiring.campaigns(id), methodology jsonb NOT NULL, weights jsonb NOT NULL,
 comparison_enabled boolean NOT NULL DEFAULT true, comparison_metrics jsonb NOT NULL, generated_by uuid NOT NULL REFERENCES iam.users(id),
 generated_at timestamptz NOT NULL DEFAULT now(), version_no integer NOT NULL, UNIQUE (campaign_id,version_no)
);
CREATE TABLE review.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 submission_id uuid NOT NULL REFERENCES runtime.submissions(id), aggregate_score_id uuid NOT NULL REFERENCES review.aggregate_scores(id),
 report_version integer NOT NULL, status text NOT NULL CHECK (status IN ('draft','approved','superseded','withdrawn')),
 report_json jsonb NOT NULL, object_uri text, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 generated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (submission_id,report_version)
);
CREATE TABLE review.progression_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id), report_id uuid REFERENCES review.reports(id),
 decision text NOT NULL CHECK (decision IN ('progress','hold','live_verification','reattempt','not_progress','withdrawn')),
 reason text NOT NULL, evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
 decided_by uuid NOT NULL REFERENCES iam.users(id), decided_at timestamptz, issued_at timestamptz,
 decision_origin text NOT NULL DEFAULT 'human' CHECK (decision_origin='human'),
 human_confirmed boolean NOT NULL DEFAULT true CHECK (human_confirmed=true),
 second_approval_required boolean NOT NULL DEFAULT false, second_approved_by uuid REFERENCES iam.users(id),
 second_approved_at timestamptz, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','issued','superseded','withdrawn'))
);

CREATE TABLE governance.retention_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id), data_category text NOT NULL,
 retention_days integer NOT NULL CHECK (retention_days>=0), legal_basis text NOT NULL, deletion_method text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','approved','active','retired')), effective_from date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (tenant_id,data_category,effective_from)
);
CREATE TABLE governance.legal_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 scope_type text NOT NULL, scope_id uuid NOT NULL, authority text NOT NULL, reason text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz, released_at timestamptz,
 created_by uuid NOT NULL REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.data_subject_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 candidate_id uuid NOT NULL REFERENCES hiring.candidates(id),
 request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion','restriction','objection','portability','human_review','contest_integrity','complaint')),
 status text NOT NULL CHECK (status IN ('received','identity_verification','in_progress','fulfilled','partially_fulfilled','rejected','closed')),
 details text NOT NULL, due_at timestamptz NOT NULL, owner_user_id uuid REFERENCES iam.users(id), response_summary text,
 received_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE governance.deletion_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 scope_type text NOT NULL, scope_id uuid NOT NULL, policy_id uuid REFERENCES governance.retention_policies(id),
 status text NOT NULL CHECK (status IN ('planned','blocked_by_hold','running','completed','failed','partially_completed')),
 planned_at timestamptz NOT NULL, started_at timestamptz, completed_at timestamptz, result jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE governance.risks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 risk_code text NOT NULL, category text NOT NULL, description text NOT NULL,
 likelihood integer NOT NULL CHECK (likelihood BETWEEN 1 AND 5), severity integer NOT NULL CHECK (severity BETWEEN 1 AND 5),
 controls jsonb NOT NULL DEFAULT '[]'::jsonb, residual_risk integer CHECK (residual_risk BETWEEN 1 AND 25),
 owner_user_id uuid REFERENCES iam.users(id), status text NOT NULL CHECK (status IN ('open','accepted','mitigating','closed')),
 review_date date, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (tenant_id,risk_code)
);
CREATE TABLE governance.corrective_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id), source_type text NOT NULL,
 source_id uuid NOT NULL, title text NOT NULL, description text NOT NULL, owner_user_id uuid NOT NULL REFERENCES iam.users(id),
 priority text NOT NULL CHECK (priority IN ('low','medium','high','critical')),
 status text NOT NULL CHECK (status IN ('open','in_progress','blocked','completed','verified','cancelled')),
 due_at timestamptz, completed_at timestamptz, verification_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.system_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id), incident_code text NOT NULL UNIQUE,
 incident_type text NOT NULL, severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
 status text NOT NULL CHECK (status IN ('open','contained','investigating','recovering','resolved','closed')),
 started_at timestamptz NOT NULL, contained_at timestamptz, resolved_at timestamptz, summary text NOT NULL,
 affected_components jsonb NOT NULL DEFAULT '[]'::jsonb, affected_tenants jsonb NOT NULL DEFAULT '[]'::jsonb,
 regulatory_assessment jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE governance.assessment_defects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_version_id uuid NOT NULL REFERENCES assessment.assessment_versions(id),
 defect_type text NOT NULL, severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
 description text NOT NULL, status text NOT NULL CHECK (status IN ('reported','triaged','impact_analysis','remediating','resolved','closed')),
 affected_attempt_count integer NOT NULL DEFAULT 0, impact_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
 remedy_policy jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE governance.model_evaluation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), model_id uuid NOT NULL REFERENCES assessment.model_registry(id),
 prompt_version_id uuid REFERENCES assessment.prompt_versions(id), evaluation_type text NOT NULL, dataset_reference text NOT NULL,
 metrics jsonb NOT NULL, limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL CHECK (status IN ('running','passed','failed','review_required')), executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.fairness_metric_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 assessment_version_id uuid REFERENCES assessment.assessment_versions(id), campaign_id uuid REFERENCES hiring.campaigns(id),
 metric_window tstzrange NOT NULL, methodology jsonb NOT NULL, metrics jsonb NOT NULL,
 threshold_breaches jsonb NOT NULL DEFAULT '[]'::jsonb, sensitive_data_segregated boolean NOT NULL DEFAULT true,
 status text NOT NULL CHECK (status IN ('completed','review_required','corrective_action_opened')),
 generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integration.connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 connection_type text NOT NULL CHECK (connection_type IN ('ats','hris','idp','email','calendar','storage','bi','webhook')),
 provider text NOT NULL, encrypted_credentials bytea, config jsonb NOT NULL DEFAULT '{}'::jsonb,
 scopes jsonb NOT NULL DEFAULT '[]'::jsonb, status text NOT NULL CHECK (status IN ('draft','active','degraded','suspended','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration.sync_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 connection_id uuid NOT NULL REFERENCES integration.connections(id), direction text NOT NULL CHECK (direction IN ('inbound','outbound','bidirectional')),
 idempotency_key text NOT NULL, status text NOT NULL CHECK (status IN ('queued','running','succeeded','partial','failed','cancelled')),
 counters jsonb NOT NULL DEFAULT '{}'::jsonb, errors jsonb NOT NULL DEFAULT '[]'::jsonb,
 started_at timestamptz, completed_at timestamptz, UNIQUE (connection_id,idempotency_key)
);
CREATE TABLE integration.outbound_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid REFERENCES hiring.applications(id), template_code text NOT NULL, template_version text NOT NULL,
 recipient_hash text NOT NULL, provider_message_id text,
 status text NOT NULL CHECK (status IN ('queued','sent','delivered','failed','bounced','suppressed')),
 payload jsonb NOT NULL, queued_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, delivered_at timestamptz
);

-- Version 2.0 account, microfeature, deployer and high-risk AI governance additions.
ALTER TABLE iam.users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE tenant.organization_domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 domain citext NOT NULL, verification_token_hash text, verified_at timestamptz,
 is_primary boolean NOT NULL DEFAULT false, sso_discovery_enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id,domain)
);
CREATE TABLE tenant.feature_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 flag_key text NOT NULL, environment text NOT NULL, role_code text, cohort jsonb NOT NULL DEFAULT '{}'::jsonb,
 enabled boolean NOT NULL DEFAULT false, owner_user_id uuid NOT NULL REFERENCES iam.users(id),
 reason text NOT NULL, starts_at timestamptz, expires_at timestamptz, approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,flag_key,environment,role_code)
);

CREATE TABLE iam.user_profiles (
 user_id uuid PRIMARY KEY REFERENCES iam.users(id) ON DELETE CASCADE,
 preferred_name text, legal_name_correction_status text NOT NULL DEFAULT 'none' CHECK (legal_name_correction_status IN ('none','requested','verified','rejected')),
 locale text NOT NULL DEFAULT 'en-IE', timezone text NOT NULL DEFAULT 'Europe/Dublin', date_format text NOT NULL DEFAULT 'locale',
 theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark','high_contrast')),
 density text NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable','compact')),
 reduced_motion boolean NOT NULL DEFAULT false, accessibility_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.auth_methods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 method_type text NOT NULL CHECK (method_type IN ('password','totp','webauthn','sso','recovery')),
 label text, credential_reference text, public_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('pending','active','suspended','revoked')),
 enrolled_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz,
 UNIQUE NULLS NOT DISTINCT (user_id,method_type,credential_reference)
);
CREATE TABLE iam.password_reset_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, requested_ip_hash text, expires_at timestamptz NOT NULL,
 used_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at > created_at)
);
CREATE TABLE iam.email_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 old_email_hash text NOT NULL, new_email citext NOT NULL, old_channel_token_hash text, new_channel_token_hash text,
 old_confirmed_at timestamptz, new_confirmed_at timestamptz, expires_at timestamptz NOT NULL,
 status text NOT NULL CHECK (status IN ('pending','confirmed','expired','cancelled','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE iam.user_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 refresh_token_hash text NOT NULL UNIQUE, device_label text, device_fingerprint_hash text,
 ip_hash text, user_agent_hash text, created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 revoked_at timestamptz, revocation_reason text
);
CREATE TABLE iam.recovery_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 code_hash text NOT NULL UNIQUE, generated_at timestamptz NOT NULL DEFAULT now(), used_at timestamptz, revoked_at timestamptz
);
CREATE TABLE iam.account_security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 event_type text NOT NULL, outcome text NOT NULL, ip_hash text, user_agent_hash text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.notification_preferences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK (channel IN ('email','sms','in_app','push')),
 category text NOT NULL, enabled boolean NOT NULL DEFAULT true, mandatory boolean NOT NULL DEFAULT false,
 digest_frequency text NOT NULL DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate','daily','weekly','never')),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id,channel,category)
);
CREATE TABLE iam.onboarding_progress (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
 role_code text NOT NULL, step_code text NOT NULL, material_version text,
 status text NOT NULL CHECK (status IN ('not_started','in_progress','completed','dismissed','expired')),
 completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id,role_code,step_code,material_version)
);
CREATE TABLE iam.staff_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 email_hash text NOT NULL, encrypted_email bytea NOT NULL, role_codes jsonb NOT NULL,
 token_hash text NOT NULL UNIQUE, invited_by uuid NOT NULL REFERENCES iam.users(id),
 status text NOT NULL CHECK (status IN ('created','sent','accepted','expired','revoked','failed')),
 expires_at timestamptz NOT NULL, accepted_user_id uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz, revoked_at timestamptz
);
CREATE TABLE iam.api_credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 owner_user_id uuid REFERENCES iam.users(id), name text NOT NULL, credential_prefix text NOT NULL,
 secret_hash text NOT NULL UNIQUE, scopes jsonb NOT NULL, status text NOT NULL CHECK (status IN ('active','suspended','revoked','expired')),
 expires_at timestamptz, last_used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);

CREATE TABLE hiring.candidate_import_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 campaign_id uuid NOT NULL REFERENCES hiring.campaigns(id), created_by uuid NOT NULL REFERENCES iam.users(id),
 idempotency_key text NOT NULL, source_object_uri text, status text NOT NULL CHECK (status IN ('uploaded','validating','preview_ready','committing','completed','partial','cancelled','failed')),
 counts jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE (tenant_id,idempotency_key)
);
CREATE TABLE hiring.candidate_import_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 import_job_id uuid NOT NULL REFERENCES hiring.candidate_import_jobs(id) ON DELETE CASCADE,
 row_number integer NOT NULL CHECK (row_number > 0), encrypted_input bytea NOT NULL, validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
 action text NOT NULL DEFAULT 'include' CHECK (action IN ('include','exclude','merge','keep_separate')),
 candidate_id uuid REFERENCES hiring.candidates(id), application_id uuid REFERENCES hiring.applications(id),
 status text NOT NULL CHECK (status IN ('valid','invalid','excluded','committed','failed')),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (import_job_id,row_number)
);
CREATE TABLE hiring.candidate_merge_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 retained_candidate_id uuid NOT NULL REFERENCES hiring.candidates(id), merged_candidate_id uuid NOT NULL REFERENCES hiring.candidates(id),
 preview jsonb NOT NULL, reason text NOT NULL, merged_by uuid NOT NULL REFERENCES iam.users(id),
 merged_at timestamptz NOT NULL DEFAULT now(), reversed_by uuid REFERENCES iam.users(id), reversed_at timestamptz,
 CHECK (retained_candidate_id <> merged_candidate_id)
);
CREATE TABLE hiring.assessment_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 application_id uuid NOT NULL REFERENCES hiring.applications(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 candidate_timezone text NOT NULL, status text NOT NULL CHECK (status IN ('reserved','confirmed','rescheduled','cancelled','expired','completed')),
 reschedule_count integer NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0), created_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (end_at > start_at)
);
CREATE TABLE hiring.decision_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 decision_id uuid NOT NULL REFERENCES review.progression_decisions(id), required_role text NOT NULL,
 status text NOT NULL CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
 requested_by uuid NOT NULL REFERENCES iam.users(id), decided_by uuid REFERENCES iam.users(id),
 rationale text, requested_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz,
 UNIQUE (decision_id,required_role)
);

CREATE TABLE runtime.item_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), assessment_item_id uuid NOT NULL REFERENCES assessment.assessment_items(id),
 flagged boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (attempt_id,assessment_item_id)
);
CREATE TABLE runtime.session_breaks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), break_type text NOT NULL CHECK (break_type IN ('scheduled','accommodation','emergency','technical')),
 requested_by uuid REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 started_at timestamptz NOT NULL, ended_at timestamptz, timer_policy jsonb NOT NULL, reason text
);
CREATE TABLE runtime.recovery_checkpoints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), client_sequence bigint NOT NULL,
 encrypted_payload bytea, payload_hash text NOT NULL, server_revision bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 UNIQUE (attempt_id,client_sequence)
);
CREATE TABLE runtime.restricted_media_objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 attempt_id uuid NOT NULL REFERENCES runtime.attempts(id), media_type text NOT NULL CHECK (media_type IN ('camera','microphone','screen')),
 object_uri text NOT NULL, sha256 text NOT NULL, captured_from timestamptz NOT NULL, captured_to timestamptz NOT NULL,
 purpose text NOT NULL, retention_until timestamptz NOT NULL, access_policy jsonb NOT NULL,
 deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK (captured_to >= captured_from)
);

CREATE TABLE evidence.reviewer_ai_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 submission_id uuid NOT NULL REFERENCES runtime.submissions(id), criterion_id uuid REFERENCES assessment.rubric_criteria(id),
 model_id uuid NOT NULL REFERENCES assessment.model_registry(id), prompt_version_id uuid NOT NULL REFERENCES assessment.prompt_versions(id),
 observation_text text NOT NULL, evidence_links jsonb NOT NULL, limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
 output_schema_version text NOT NULL, status text NOT NULL CHECK (status IN ('generated','blocked','reported','withdrawn')),
 generated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(evidence_links) = 'array')
);

CREATE TABLE review.reviewer_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 reviewer_profile_id uuid NOT NULL REFERENCES hiring.reviewer_profiles(id), available_from timestamptz NOT NULL,
 available_to timestamptz NOT NULL, capacity integer NOT NULL CHECK (capacity >= 0),
 status text NOT NULL CHECK (status IN ('available','unavailable','tentative')), note text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK (available_to > available_from)
);
CREATE TABLE review.reviewer_training_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 reviewer_profile_id uuid NOT NULL REFERENCES hiring.reviewer_profiles(id), training_type text NOT NULL,
 material_version text NOT NULL, status text NOT NULL CHECK (status IN ('assigned','in_progress','passed','failed','expired','waived')),
 score numeric(7,4), completed_at timestamptz, expires_at timestamptz, evidence_uri text,
 approved_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (reviewer_profile_id,training_type,material_version)
);
CREATE TABLE review.evidence_annotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 assignment_id uuid NOT NULL REFERENCES review.reviewer_assignments(id), evidence_object_id uuid NOT NULL REFERENCES evidence.evidence_objects(id),
 annotation_type text NOT NULL CHECK (annotation_type IN ('bookmark','note','question','issue')),
 visibility text NOT NULL CHECK (visibility IN ('private','review_team','adjudicator')),
 body text, evidence_version_hash text NOT NULL, created_by uuid NOT NULL REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review.scorecard_drafts (
 scorecard_id uuid PRIMARY KEY REFERENCES review.scorecards(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenant.organizations(id), draft_json jsonb NOT NULL,
 row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0), last_saved_by uuid NOT NULL REFERENCES iam.users(id),
 last_saved_at timestamptz NOT NULL DEFAULT now(), client_sequence bigint NOT NULL DEFAULT 0
);
CREATE TABLE review.clarification_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 assignment_id uuid NOT NULL REFERENCES review.reviewer_assignments(id), request_type text NOT NULL CHECK (request_type IN ('candidate','technical','secondary_review','adjudication','assessment_defect')),
 question text NOT NULL, evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL CHECK (status IN ('draft','sent','answered','resolved','cancelled','expired')),
 requested_by uuid NOT NULL REFERENCES iam.users(id), assigned_to uuid REFERENCES iam.users(id), due_at timestamptz,
 response text, created_at timestamptz NOT NULL DEFAULT now(), answered_at timestamptz, resolved_at timestamptz
);
CREATE TABLE review.review_amendments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 scorecard_id uuid NOT NULL REFERENCES review.scorecards(id), prior_scorecard_hash text NOT NULL,
 amendment_json jsonb NOT NULL, reason text NOT NULL, requested_by uuid NOT NULL REFERENCES iam.users(id),
 approved_by uuid REFERENCES iam.users(id), status text NOT NULL CHECK (status IN ('requested','approved','rejected','applied')),
 created_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz
);

CREATE TABLE governance.legal_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), citation_code text NOT NULL, title text NOT NULL, source_url text NOT NULL,
 jurisdiction text NOT NULL, source_type text NOT NULL CHECK (source_type IN ('binding_law','official_guidance','standard','national_law','contract','internal_policy')),
 effective_from date, checked_at timestamptz NOT NULL, checked_by uuid NOT NULL REFERENCES iam.users(id),
 content_hash text, superseded_by uuid REFERENCES governance.legal_sources(id), UNIQUE (citation_code,checked_at)
);
CREATE TABLE governance.ai_system_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), system_code text NOT NULL UNIQUE, name text NOT NULL,
 provider_legal_name text NOT NULL, intended_purpose text NOT NULL, excluded_purposes jsonb NOT NULL DEFAULT '[]'::jsonb,
 foreseeable_misuse jsonb NOT NULL DEFAULT '[]'::jsonb, version text NOT NULL,
 lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('design','validation','pilot','active','suspended','retired')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.classification_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 version_no integer NOT NULL, ai_system_conclusion boolean NOT NULL, territorial_scope text NOT NULL,
 organization_roles jsonb NOT NULL, article_5_review jsonb NOT NULL, annex_iii_category text,
 high_risk_conclusion boolean NOT NULL, article_50_review jsonb NOT NULL, gpai_role_review jsonb NOT NULL,
 legal_snapshot_at date NOT NULL, confidence text NOT NULL CHECK (confidence IN ('high','medium','low')),
 status text NOT NULL CHECK (status IN ('draft','legal_review','approved','superseded')),
 prepared_by uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, UNIQUE (ai_system_id,version_no)
);
CREATE TABLE governance.risk_controls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 ai_system_id uuid REFERENCES governance.ai_system_records(id), risk_code text NOT NULL,
 affected_people jsonb NOT NULL, harm text NOT NULL, cause text NOT NULL,
 inherent_likelihood integer NOT NULL CHECK (inherent_likelihood BETWEEN 1 AND 5),
 inherent_severity integer NOT NULL CHECK (inherent_severity BETWEEN 1 AND 5),
 control_description text NOT NULL, test_reference text NOT NULL,
 residual_likelihood integer CHECK (residual_likelihood BETWEEN 1 AND 5), residual_severity integer CHECK (residual_severity BETWEEN 1 AND 5),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), review_due date, status text NOT NULL CHECK (status IN ('open','mitigating','accepted','closed','overdue')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,ai_system_id,risk_code)
);
CREATE TABLE governance.quality_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_code text NOT NULL, version_no integer NOT NULL,
 document_type text NOT NULL, title text NOT NULL, content_uri text NOT NULL, sha256 text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','in_review','approved','effective','superseded','retired')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 effective_from date, review_due date, created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz,
 UNIQUE (document_code,version_no)
);
CREATE TABLE governance.technical_document_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 version_no integer NOT NULL, release_version text NOT NULL, annex_iv_manifest jsonb NOT NULL,
 object_uri text NOT NULL, sha256 text NOT NULL, status text NOT NULL CHECK (status IN ('draft','review','approved','superseded')),
 prepared_by uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, UNIQUE (ai_system_id,version_no)
);
CREATE TABLE governance.data_use_register (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 purpose_code text NOT NULL, purpose text NOT NULL, data_subjects jsonb NOT NULL, data_fields jsonb NOT NULL,
 source text NOT NULL, cpf_role text NOT NULL, employer_role text NOT NULL, lawful_basis text,
 article_9_or_10_condition text, recipients jsonb NOT NULL DEFAULT '[]'::jsonb, subprocessors jsonb NOT NULL DEFAULT '[]'::jsonb,
 storage_region text NOT NULL, transfer_mechanism text, retention_policy_id uuid REFERENCES governance.retention_policies(id),
 deletion_method text NOT NULL, rights jsonb NOT NULL, security_controls jsonb NOT NULL,
 model_use text NOT NULL, training_use text NOT NULL, human_access text NOT NULL,
 dpia_status text NOT NULL, owner_user_id uuid NOT NULL REFERENCES iam.users(id), status text NOT NULL CHECK (status IN ('draft','approved','active','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,purpose_code,status)
);
CREATE TABLE governance.processing_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 ropa_code text NOT NULL, processing_name text NOT NULL, controller_identity text NOT NULL, processor_identity text,
 joint_controller_arrangement text, purposes jsonb NOT NULL, categories jsonb NOT NULL,
 recipients jsonb NOT NULL, transfers jsonb NOT NULL, retention jsonb NOT NULL, safeguards jsonb NOT NULL,
 dpo_owner_user_id uuid REFERENCES iam.users(id), status text NOT NULL CHECK (status IN ('draft','approved','active','retired')),
 reviewed_at timestamptz, review_due date, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (tenant_id,ropa_code)
);
CREATE TABLE governance.impact_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 assessment_type text NOT NULL CHECK (assessment_type IN ('dpia','fria','lia','equality','accessibility','security')),
 scope_type text NOT NULL, scope_id uuid NOT NULL, version_no integer NOT NULL,
 necessity text NOT NULL, risks jsonb NOT NULL, measures jsonb NOT NULL, residual_risk text NOT NULL,
 consultation_required boolean NOT NULL DEFAULT false, consultation_status text,
 status text NOT NULL CHECK (status IN ('draft','consultation','approved','rejected','expired','superseded')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), dpo_opinion text, approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, review_due date,
 UNIQUE NULLS NOT DISTINCT (tenant_id,assessment_type,scope_type,scope_id,version_no)
);
CREATE TABLE governance.human_oversight_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 campaign_id uuid REFERENCES hiring.campaigns(id), reviewer_profile_id uuid REFERENCES hiring.reviewer_profiles(id),
 oversight_role text NOT NULL, authority_scope jsonb NOT NULL, competence_evidence jsonb NOT NULL,
 training_valid_until date, support_contact text NOT NULL, status text NOT NULL CHECK (status IN ('pending','active','expired','revoked')),
 assigned_by uuid NOT NULL REFERENCES iam.users(id), assigned_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE governance.oversight_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 assignment_id uuid NOT NULL REFERENCES governance.human_oversight_assignments(id),
 resource_type text NOT NULL, resource_id uuid NOT NULL,
 action text NOT NULL CHECK (action IN ('reviewed','disregarded','overrode','reversed','stopped','escalated','accepted_as_observation')),
 reason text NOT NULL, evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
 actor_user_id uuid NOT NULL REFERENCES iam.users(id), occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.deployer_instructions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 version_no integer NOT NULL, release_version text NOT NULL, intended_purpose text NOT NULL, input_requirements jsonb NOT NULL,
 accuracy_metrics jsonb NOT NULL, limitations jsonb NOT NULL, oversight_measures jsonb NOT NULL,
 monitoring_instructions jsonb NOT NULL, incident_instructions jsonb NOT NULL, maintenance_instructions jsonb NOT NULL,
 object_uri text NOT NULL, sha256 text NOT NULL, status text NOT NULL CHECK (status IN ('draft','approved','effective','superseded')),
 approved_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz,
 UNIQUE (ai_system_id,version_no)
);
CREATE TABLE governance.ai_literacy_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 user_id uuid NOT NULL REFERENCES iam.users(id), role_context text NOT NULL, training_code text NOT NULL,
 material_version text NOT NULL, competence_result text NOT NULL CHECK (competence_result IN ('assigned','passed','failed','expired','waived_with_reason')),
 completed_at timestamptz, expires_at timestamptz, evidence_uri text, approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (tenant_id,user_id,training_code,material_version)
);
CREATE TABLE governance.conformity_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 release_version text NOT NULL, procedure text NOT NULL CHECK (procedure IN ('annex_vi_internal_control','annex_vii_notified_body','product_legislation')),
 requirement_results jsonb NOT NULL, deviations jsonb NOT NULL DEFAULT '[]'::jsonb,
 decision text NOT NULL CHECK (decision IN ('pending','conformant','conformant_with_conditions','nonconformant','withdrawn')),
 assessed_by uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 assessed_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, valid_until date,
 UNIQUE (ai_system_id,release_version)
);
CREATE TABLE governance.eu_declarations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conformity_assessment_id uuid NOT NULL REFERENCES governance.conformity_assessments(id),
 declaration_number text NOT NULL UNIQUE, declaration_version integer NOT NULL, content_uri text NOT NULL, sha256 text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','signed','withdrawn','superseded')),
 signed_by uuid REFERENCES iam.users(id), signed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.eu_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 registration_reference text, registration_payload jsonb NOT NULL, status text NOT NULL CHECK (status IN ('draft','submitted','registered','update_required','withdrawn','rejected')),
 submitted_by uuid REFERENCES iam.users(id), submitted_at timestamptz, confirmed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE governance.ce_marking_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 release_version text NOT NULL, declaration_id uuid NOT NULL REFERENCES governance.eu_declarations(id),
 marking_location text NOT NULL, status text NOT NULL CHECK (status IN ('blocked','approved','displayed','withdrawn')),
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, evidence_uri text,
 UNIQUE (ai_system_id,release_version)
);
CREATE TABLE governance.post_market_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 version_no integer NOT NULL, methodology jsonb NOT NULL, signal_catalogue jsonb NOT NULL,
 thresholds jsonb NOT NULL, review_cadence interval NOT NULL, status text NOT NULL CHECK (status IN ('draft','approved','active','suspended','superseded')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, UNIQUE (ai_system_id,version_no)
);
CREATE TABLE governance.post_market_signals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 post_market_plan_id uuid NOT NULL REFERENCES governance.post_market_plans(id),
 signal_type text NOT NULL, metric_window tstzrange NOT NULL, value jsonb NOT NULL, threshold_status text NOT NULL CHECK (threshold_status IN ('normal','warning','breach','unknown')),
 source_reference text NOT NULL, review_status text NOT NULL CHECK (review_status IN ('unreviewed','reviewing','accepted','corrective_action','suspended')),
 reviewer_user_id uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE TABLE governance.serious_incident_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id), system_incident_id uuid REFERENCES governance.system_incidents(id),
 assessment text NOT NULL, serious_incident boolean NOT NULL, affected_people jsonb NOT NULL,
 provider_notified_at timestamptz, deployer_notified_at timestamptz, authority_notified_at timestamptz,
 authority_reference text, status text NOT NULL CHECK (status IN ('assessing','reportable','reported','not_reportable_with_reason','follow_up','closed')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);
CREATE TABLE governance.vendor_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vendor_code text NOT NULL, service_code text NOT NULL, evidence_version integer NOT NULL,
 legal_entity text NOT NULL, ai_act_role text NOT NULL, gdpr_role text NOT NULL,
 data_locations jsonb NOT NULL, subprocessors jsonb NOT NULL, transfer_mechanism text,
 training_use text NOT NULL, retention text NOT NULL, deletion text NOT NULL,
 security_evidence jsonb NOT NULL, model_documentation jsonb NOT NULL, limitations jsonb NOT NULL,
 change_notice text NOT NULL, incident_notice text NOT NULL, audit_rights text NOT NULL, exit_plan text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','review','approved','conditional','expired','rejected')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, review_due date,
 UNIQUE (vendor_code,service_code,evidence_version)
);
CREATE TABLE governance.change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 change_code text NOT NULL, change_type text NOT NULL, scope jsonb NOT NULL, description text NOT NULL,
 intended_purpose_impact text NOT NULL, data_impact text NOT NULL, rights_impact text NOT NULL,
 substantial_modification_risk text NOT NULL CHECK (substantial_modification_risk IN ('none','low','possible','likely','confirmed')),
 required_reviews jsonb NOT NULL, required_revalidation jsonb NOT NULL, rollback_plan text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','triage','review','approved','rejected','implemented','verified','rolled_back')),
 requested_by uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, implemented_at timestamptz,
 UNIQUE NULLS NOT DISTINCT (tenant_id,change_code)
);
CREATE TABLE governance.dataset_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dataset_code text NOT NULL, version text NOT NULL,
 dataset_role text NOT NULL CHECK (dataset_role IN ('training','validation','testing','red_team','fairness','calibration')),
 provenance jsonb NOT NULL, lawful_access text NOT NULL, purpose text NOT NULL,
 data_subjects jsonb NOT NULL, representativeness jsonb NOT NULL, quality_checks jsonb NOT NULL,
 bias_analysis jsonb NOT NULL, gaps jsonb NOT NULL, licence_terms text NOT NULL,
 storage_region text NOT NULL, retention_until date, status text NOT NULL CHECK (status IN ('draft','approved','restricted','expired','withdrawn')),
 owner_user_id uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (dataset_code,version,dataset_role)
);
CREATE TABLE governance.performance_thresholds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_system_id uuid NOT NULL REFERENCES governance.ai_system_records(id),
 model_id uuid REFERENCES assessment.model_registry(id), use_case text NOT NULL, metric_code text NOT NULL,
 metric_definition text NOT NULL, threshold_operator text NOT NULL, threshold_value numeric(18,6) NOT NULL,
 subgroup_policy jsonb NOT NULL, evaluation_dataset_id uuid REFERENCES governance.dataset_registry(id),
 effective_from timestamptz NOT NULL, effective_to timestamptz,
 status text NOT NULL CHECK (status IN ('draft','approved','active','retired')),
 approved_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT (ai_system_id,model_id,use_case,metric_code,effective_from)
);
CREATE TABLE governance.complaints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 candidate_id uuid REFERENCES hiring.candidates(id), complaint_type text NOT NULL,
 channel text NOT NULL, description text NOT NULL, confidentiality_level text NOT NULL,
 status text NOT NULL CHECK (status IN ('received','triage','investigating','awaiting_information','resolved','referred','closed')),
 owner_user_id uuid REFERENCES iam.users(id), due_at timestamptz, outcome text, remedy text,
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);

CREATE TABLE integration.notification_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 template_code text NOT NULL, version_no integer NOT NULL, locale text NOT NULL,
 subject_template text NOT NULL, body_template text NOT NULL, allowed_variables jsonb NOT NULL,
 accessibility_review jsonb NOT NULL, status text NOT NULL CHECK (status IN ('draft','review','approved','active','retired')),
 created_by uuid NOT NULL REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz,
 UNIQUE NULLS NOT DISTINCT (tenant_id,template_code,version_no,locale)
);
CREATE TABLE integration.webhook_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 name text NOT NULL, endpoint_url text NOT NULL, signing_secret_encrypted bytea NOT NULL,
 event_types jsonb NOT NULL, status text NOT NULL CHECK (status IN ('draft','active','paused','revoked')),
 created_by uuid NOT NULL REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration.webhook_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenant.organizations(id),
 subscription_id uuid NOT NULL REFERENCES integration.webhook_subscriptions(id), event_id uuid NOT NULL,
 idempotency_key text NOT NULL, attempt_no integer NOT NULL CHECK (attempt_no > 0),
 status text NOT NULL CHECK (status IN ('queued','sending','delivered','retrying','dead_letter','cancelled')),
 response_status integer, response_hash text, next_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz,
 UNIQUE (subscription_id,idempotency_key,attempt_no)
);

CREATE TABLE support.cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 requester_user_id uuid NOT NULL REFERENCES iam.users(id), candidate_id uuid REFERENCES hiring.candidates(id),
 attempt_id uuid REFERENCES runtime.attempts(id), case_reference text NOT NULL UNIQUE,
 category text NOT NULL, severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
 subject text NOT NULL, description text NOT NULL, purpose text NOT NULL,
 status text NOT NULL CHECK (status IN ('draft','open','awaiting_user','awaiting_internal','escalated','resolved','closed','reopened')),
 assigned_to uuid REFERENCES iam.users(id), sla_due_at timestamptz, resolution text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE support.case_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 case_id uuid NOT NULL REFERENCES support.cases(id) ON DELETE CASCADE,
 author_user_id uuid NOT NULL REFERENCES iam.users(id), visibility text NOT NULL CHECK (visibility IN ('requester','internal','restricted')),
 body text NOT NULL, attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), edited_at timestamptz
);

CREATE TABLE audit.outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL, event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1,
 payload jsonb NOT NULL, data_classification text NOT NULL, correlation_id uuid NOT NULL, causation_id uuid,
 status text NOT NULL CHECK (status IN ('pending','publishing','published','failed','dead_letter')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0), available_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);

ALTER TABLE review.criterion_scores
  ADD CONSTRAINT fk_criterion_scores_ai_observation
  FOREIGN KEY (ai_observation_id) REFERENCES evidence.reviewer_ai_observations(id);

ALTER TABLE review.progression_decisions
  ADD CONSTRAINT ck_progression_decision_human_approval
  CHECK (second_approved_by IS NULL OR second_approved_by <> decided_by);

ALTER TABLE hiring.decision_approvals
  ADD CONSTRAINT ck_decision_approval_separation
  CHECK (decided_by IS NULL OR decided_by <> requested_by);

CREATE OR REPLACE FUNCTION review.enforce_human_decision_actor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_type text;
BEGIN
  SELECT user_type INTO actor_type FROM iam.users WHERE id=NEW.decided_by;
  IF actor_type IS DISTINCT FROM 'employer_user' THEN
    RAISE EXCEPTION 'progression decision owner must be an authenticated employer human';
  END IF;
  IF NEW.status='issued' AND (NEW.issued_at IS NULL OR NEW.decided_at IS NULL) THEN
    RAISE EXCEPTION 'issued progression decision requires human decision and issue timestamps';
  END IF;
  IF NEW.status='issued' AND NEW.second_approval_required AND
     (NEW.second_approved_by IS NULL OR NEW.second_approved_at IS NULL) THEN
    RAISE EXCEPTION 'issued progression decision requires distinct second approval';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_human_decision_actor
BEFORE INSERT OR UPDATE ON review.progression_decisions
FOR EACH ROW EXECUTE FUNCTION review.enforce_human_decision_actor();

CREATE OR REPLACE FUNCTION hiring.enforce_issued_human_application_decision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('progressed','not_progressed') AND OLD.status IS DISTINCT FROM NEW.status AND NOT EXISTS (
    SELECT 1 FROM review.progression_decisions d
     WHERE d.application_id=NEW.id AND d.tenant_id=NEW.tenant_id
       AND d.status='issued' AND d.decision_origin='human' AND d.human_confirmed=true
       AND ((NEW.status='progressed' AND d.decision='progress') OR
            (NEW.status='not_progressed' AND d.decision='not_progress'))
  ) THEN
    RAISE EXCEPTION 'application outcome requires a matching issued human progression decision';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_application_human_decision
BEFORE UPDATE OF status ON hiring.applications
FOR EACH ROW EXECUTE FUNCTION hiring.enforce_issued_human_application_decision();

CREATE INDEX idx_user_sessions_user_active ON iam.user_sessions(user_id,expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX idx_security_events_user_time ON iam.account_security_events(user_id,occurred_at DESC);
CREATE INDEX idx_import_rows_job_status ON hiring.candidate_import_rows(import_job_id,status,row_number);
CREATE INDEX idx_bookings_application_start ON hiring.assessment_bookings(application_id,start_at DESC);
CREATE INDEX idx_ai_observations_submission ON evidence.reviewer_ai_observations(submission_id,generated_at);
CREATE INDEX idx_review_availability_profile_time ON review.reviewer_availability(reviewer_profile_id,available_from,available_to);
CREATE INDEX idx_support_cases_tenant_status ON support.cases(tenant_id,status,updated_at DESC);
CREATE INDEX idx_risk_controls_owner_status ON governance.risk_controls(owner_user_id,status,review_due);
CREATE INDEX idx_post_market_signals_plan_window ON governance.post_market_signals(post_market_plan_id,metric_window);
CREATE INDEX idx_outbox_pending ON audit.outbox_events(status,available_at) WHERE status IN ('pending','failed');

CREATE TABLE audit.events (
 id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenant.organizations(id),
 occurred_at timestamptz NOT NULL DEFAULT now(), actor_type text NOT NULL, actor_id uuid, session_id uuid,
 action text NOT NULL, resource_type text NOT NULL, resource_id uuid, purpose text, outcome text NOT NULL,
 ip_hash text, user_agent_hash text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 previous_hash text, event_hash text NOT NULL, PRIMARY KEY (id,occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE TABLE audit.events_default PARTITION OF audit.events DEFAULT;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
 'tenant.plans','tenant.organizations','tenant.subscriptions','tenant.departments','tenant.teams',
 'iam.users','iam.memberships','iam.sso_connections','assessment.assessments','hiring.reviewer_profiles',
 'hiring.candidates','hiring.candidate_pii','hiring.campaigns','hiring.applications','hiring.accommodations',
 'runtime.attempts','runtime.responses','review.scorecards','review.criterion_scores','integration.connections'
 ] LOOP
  EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION audit.set_updated_at()',t);
 END LOOP;
END $$;

CREATE INDEX idx_memberships_tenant_user ON iam.memberships(tenant_id,user_id) WHERE status='active';
CREATE INDEX idx_campaigns_tenant_status ON hiring.campaigns(tenant_id,status,created_at DESC);
CREATE INDEX idx_applications_campaign_status ON hiring.applications(campaign_id,status,updated_at DESC);
CREATE INDEX idx_invitations_application_status ON hiring.invitations(application_id,status,expires_at);
CREATE INDEX idx_attempts_application_status ON runtime.attempts(application_id,status,attempt_no DESC);
CREATE INDEX idx_sessions_attempt_status ON runtime.sessions(attempt_id,status,last_seen_at DESC);
CREATE INDEX idx_autosaves_attempt_seq ON runtime.autosaves(attempt_id,client_sequence DESC);
CREATE INDEX idx_ai_messages_conversation_seq ON evidence.ai_messages(conversation_id,sequence_no);
CREATE INDEX idx_integrity_attempt_time ON evidence.integrity_events(attempt_id,occurred_at);
CREATE INDEX idx_incident_attempt_time ON evidence.technical_incidents(attempt_id,occurred_at);
CREATE INDEX idx_assignments_reviewer_status ON review.reviewer_assignments(reviewer_profile_id,status,due_at);
CREATE INDEX idx_scores_submission_status ON review.aggregate_scores(submission_id,status,version_no DESC);
CREATE INDEX idx_audit_tenant_time ON audit.events(tenant_id,occurred_at DESC);
CREATE INDEX idx_dsr_tenant_status_due ON governance.data_subject_requests(tenant_id,status,due_at);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
 'tenant.subscriptions','tenant.departments','tenant.teams','iam.memberships','iam.sso_connections','iam.privileged_access_grants',
 'hiring.reviewer_profiles','hiring.candidates','hiring.candidate_pii','hiring.campaigns','hiring.campaign_versions','hiring.applications',
 'hiring.invitations','hiring.accommodations','hiring.notice_acknowledgements','hiring.campaign_reviewers',
 'runtime.attempts','runtime.attempt_version_bindings','runtime.precheck_runs','runtime.sessions','runtime.workspaces','runtime.responses',
 'runtime.autosaves','runtime.artifacts','runtime.submissions','evidence.ai_conversations','evidence.ai_messages','evidence.tool_calls',
 'evidence.plugin_executions','evidence.evidence_objects','evidence.integrity_events','evidence.technical_incidents',
 'review.reviewer_assignments','review.scorecards','review.criterion_scores','review.review_comments','review.aggregate_scores',
 'review.score_overrides','review.integrity_resolutions','review.comparison_snapshots','review.reports','review.progression_decisions',
 'governance.legal_holds','governance.data_subject_requests','governance.deletion_jobs',
 'integration.connections','integration.sync_runs','integration.outbound_messages'
 ] LOOP
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (tenant_id=iam.current_tenant_id()) WITH CHECK (tenant_id=iam.current_tenant_id())',t);
 END LOOP;
END $$;

-- V2 defence-in-depth RLS for every table carrying a direct tenant_id.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['assessment.assessments','assessment.competency_frameworks','assessment.rubric_versions','audit.outbox_events','evidence.ai_conversations','evidence.ai_messages','evidence.evidence_objects','evidence.integrity_events','evidence.plugin_executions','evidence.reviewer_ai_observations','evidence.technical_incidents','evidence.tool_calls','governance.ai_literacy_records','governance.change_requests','governance.complaints','governance.corrective_actions','governance.data_subject_requests','governance.data_use_register','governance.deletion_jobs','governance.fairness_metric_runs','governance.human_oversight_assignments','governance.impact_assessments','governance.legal_holds','governance.oversight_actions','governance.post_market_signals','governance.processing_activities','governance.retention_policies','governance.risk_controls','governance.risks','governance.serious_incident_reports','governance.system_incidents','hiring.accommodations','hiring.applications','hiring.assessment_bookings','hiring.campaign_reviewers','hiring.campaign_versions','hiring.campaigns','hiring.candidate_import_jobs','hiring.candidate_import_rows','hiring.candidate_merge_events','hiring.candidate_pii','hiring.candidates','hiring.decision_approvals','hiring.invitations','hiring.notice_acknowledgements','hiring.reviewer_profiles','iam.api_credentials','iam.memberships','iam.privileged_access_grants','iam.sso_connections','iam.staff_invitations','integration.connections','integration.notification_templates','integration.outbound_messages','integration.sync_runs','integration.webhook_deliveries','integration.webhook_subscriptions','review.aggregate_scores','review.clarification_requests','review.comparison_snapshots','review.criterion_scores','review.evidence_annotations','review.integrity_resolutions','review.progression_decisions','review.reports','review.review_amendments','review.review_comments','review.reviewer_assignments','review.reviewer_availability','review.reviewer_training_records','review.score_overrides','review.scorecard_drafts','review.scorecards','runtime.artifacts','runtime.attempt_version_bindings','runtime.attempts','runtime.autosaves','runtime.item_flags','runtime.precheck_runs','runtime.recovery_checkpoints','runtime.responses','runtime.restricted_media_objects','runtime.session_breaks','runtime.sessions','runtime.submissions','runtime.workspaces','support.case_messages','support.cases','tenant.departments','tenant.feature_flags','tenant.organization_domains','tenant.subscriptions','tenant.teams'] LOOP
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS v2_tenant_isolation ON %s',t);
  EXECUTE format('CREATE POLICY v2_tenant_isolation ON %s USING (tenant_id=iam.current_tenant_id()) WITH CHECK (tenant_id=iam.current_tenant_id())',t);
 END LOOP;
END $$;

-- Self-service policies supplement service-layer ABAC; privileged service roles are separate.
ALTER TABLE iam.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.user_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY user_profile_self ON iam.user_profiles USING (user_id=iam.current_user_id()) WITH CHECK (user_id=iam.current_user_id());
ALTER TABLE iam.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.user_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY user_session_self ON iam.user_sessions USING (user_id=iam.current_user_id()) WITH CHECK (user_id=iam.current_user_id());
ALTER TABLE iam.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.notification_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_preference_self ON iam.notification_preferences USING (user_id=iam.current_user_id()) WITH CHECK (user_id=iam.current_user_id());

COMMIT;
