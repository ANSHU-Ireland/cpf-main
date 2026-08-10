BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
    CREATE ROLE cpf_app NOSUPERUSER;
  END IF;
END $$;

GRANT USAGE ON SCHEMA iam, assessment, hiring, runtime, evidence, review, audit TO cpf_app;

GRANT SELECT ON
  iam.users,
  iam.roles,
  iam.memberships,
  iam.membership_roles,
  iam.user_sessions
TO cpf_app;

GRANT SELECT ON
  assessment.assessments,
  assessment.assessment_versions,
  assessment.assessment_sections,
  assessment.assessment_items,
  assessment.plugin_registry,
  assessment.rubric_criteria
TO cpf_app;

GRANT SELECT, UPDATE ON
  runtime.attempts
TO cpf_app;

GRANT SELECT, INSERT, UPDATE ON
  hiring.campaigns,
  hiring.invitations,
  hiring.candidate_import_jobs,
  hiring.candidate_import_rows
TO cpf_app;

GRANT INSERT ON
  hiring.applications,
  hiring.candidates
TO cpf_app;

GRANT SELECT ON
  hiring.applications,
  hiring.candidates
TO cpf_app;

GRANT INSERT ON
  audit.events
TO cpf_app;

GRANT SELECT ON
  runtime.attempt_version_bindings,
  runtime.submissions
TO cpf_app;

GRANT SELECT, INSERT, UPDATE ON
  runtime.responses,
  runtime.item_flags
TO cpf_app;

GRANT SELECT, INSERT ON
  runtime.autosaves,
  runtime.precheck_runs,
  runtime.session_breaks
TO cpf_app;

GRANT SELECT, INSERT, DELETE ON
  runtime.artifacts
TO cpf_app;

GRANT SELECT, UPDATE ON
  evidence.ai_conversations
TO cpf_app;

GRANT SELECT, INSERT ON
  evidence.ai_messages,
  evidence.technical_incidents,
  evidence.plugin_executions
TO cpf_app;

GRANT SELECT, INSERT, UPDATE ON
  review.scorecards,
  review.criterion_scores,
  review.scorecard_drafts,
  review.progression_decisions
TO cpf_app;

GRANT SELECT, INSERT, UPDATE ON
  hiring.decision_approvals
TO cpf_app;

GRANT SELECT, INSERT ON
  integration.outbound_messages
TO cpf_app;

GRANT SELECT, INSERT, UPDATE ON
  audit.outbox_events
TO cpf_app;

COMMIT;
