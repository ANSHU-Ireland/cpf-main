BEGIN;

GRANT USAGE ON SCHEMA governance, integration TO cpf_app;

-- Campaign activation preflight reads the active immutable campaign version.
GRANT SELECT ON
  assessment.assessment_validations,
  governance.data_use_register,
  governance.human_oversight_assignments,
  governance.impact_assessments,
  governance.retention_policies,
  hiring.campaign_reviewers,
  hiring.campaign_versions,
  hiring.reviewer_profiles,
  integration.notification_templates,
  review.reviewer_availability
TO cpf_app;

-- Attempt submission persists a single immutable submission receipt.
GRANT INSERT ON runtime.submissions TO cpf_app;

COMMIT;
