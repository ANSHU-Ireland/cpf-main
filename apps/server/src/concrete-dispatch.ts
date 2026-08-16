import { Pool } from 'pg';
/*
  Fully-expanded concrete dispatcher: wires all 244 OpenAPI operations to
  concrete Postgres-backed repository instances from `@cpf/org` and `@cpf/account`.
*/
import * as api from '@cpf/api';
import type { Actor, RawCampaignListQuery } from '@cpf/org';
import type { HttpResponse } from '@cpf/http';

// Repositories (Postgres implementations)
import {
  PgAttemptRepository,
  PgCampaignRepository,
  PgCandidateRepository,
  PgCandidateImportRepository,
  PgInvitationRepository,
  PgDecisionRepository,
  PgScorecardRepository,
  PgOrganizationRepository,
  PgMemberRepository,
  PgDepartmentRepository,
  PgTeamRepository,
  PgAccommodationRepository,
  PgNoticeRepository,
  PgAssessmentRepository,
  PgCampaignReviewerRepository,
  PgCampaignStatsRepository,
  PgReviewerProfileRepository,
  PgCampaignDashboardRepository,
  PgBookingRepository,
  PgAiModelRepository,
  PgPluginRepository,
  PgPromptVersionRepository,
  PgNotificationTemplateRepository,
  PgSubmissionReportRepository,
  PgAuditEvidenceRepository,
  PgReviewQualityRepository,
  PgCandidatePortalRepository,
  PgDataRightsRepository,
  PgCandidateMergeRepository,
  PgCandidateActionRepository,
  PgDeployerReadinessRepository,
  PgIntegrationRepository,
  PgMemberInvitationRepository,
  PgWebhookRepository,
  PgTenantRepository,
  PgStaffRepository,
  PgPlanRepository,
  PgFeatureFlagRepository,
  PgReleaseRepository,
  PgAdminAuditRepository,
  PgAdminJobRepository,
  PgAdminMaintenanceRepository,
  PgAdminSupportCaseRepository,
  PgAdminPrivilegedAccessRepository,
  PgAiSystemRepository,
  PgRiskControlRepository,
  PgGovernanceDocRepository,
  PgGovernanceSubmissionRepository,
  PgReviewAssignmentRepository,
  PgAssessmentVersionRepository,
  DemoAuthRepository,
} from '@cpf/org';

import {
  PgAccountRepository,
  PgSessionRepository,
  PgSecurityEventRepository,
  PgNotificationPreferenceRepository,
  PgPreferencesRepository,
  PgOnboardingRepository,
  PgSupportCaseRepository,
  PgSupportCaseDetailRepository,
  PgReviewerRepository,
} from '@cpf/account';

const CONCRETE_OPERATIONS = new Set<string>([
  'delete_admin_privileged_access_grants_grantId',
  'delete_admin_staff_invitations_invitationId',
  'delete_attempts_attemptId_artifacts_artifactId',
  'delete_auth_mfa_methods_methodId',
  'delete_invitations_invitationId',
  'delete_me_sessions_sessionId',
  'delete_organization_member_invitations_invitationId',
  'get_accommodations',
  'get_admin_audit_events',
  'get_admin_feature_flags',
  'get_admin_jobs',
  'get_admin_maintenance_windows',
  'get_admin_plans',
  'get_admin_releases',
  'get_admin_staff',
  'get_admin_support_cases',
  'get_admin_tenants',
  'get_admin_tenants_tenantId',
  'get_ai_models',
  'get_applications_applicationId_bookings',
  'get_assessment_versions_versionId_preview',
  'get_assessments',
  'get_assessments_assessmentId',
  'get_attempts_attemptId',
  'get_attempts_attemptId_prechecks_latest',
  'get_attempts_attemptId_submission_preview',
  'get_audit_evidence_collections',
  'get_audit_traceability_requirementId',
  'get_auth_mfa_methods',
  'get_campaigns',
  'get_campaigns_campaignId',
  'get_campaigns_campaignId_activation_preflight',
  'get_campaigns_campaignId_candidate_preview',
  'get_campaigns_campaignId_comparison',
  'get_campaigns_campaignId_dashboard',
  'get_campaigns_campaignId_reviewers',
  'get_candidate_accommodations',
  'get_candidate_applications_applicationId_status',
  'get_candidate_data_rights_requests',
  'get_candidate_imports_importId',
  'get_candidate_imports_importId_rows',
  'get_candidate_invitation',
  'get_candidate_notices',
  'get_candidate_practice',
  'get_candidate_profile',
  'get_candidates_candidateId',
  'get_governance_ai_literacy',
  'get_governance_ai_systems',
  'get_governance_data_use_register',
  'get_governance_datasets',
  'get_governance_deployer_instructions_systemId',
  'get_governance_impact_assessments',
  'get_governance_post_market_plans',
  'get_governance_post_market_signals',
  'get_governance_qms_documents',
  'get_governance_risk_controls',
  'get_governance_technical_documents',
  'get_governance_vendor_evidence',
  'get_me',
  'get_me_notices',
  'get_me_notification_preferences',
  'get_me_onboarding',
  'get_me_preferences',
  'get_me_security_events',
  'get_me_sessions',
  'get_me_support_cases',
  'get_me_support_cases_caseId',
  'get_notification_templates',
  'get_organization',
  'get_organization_departments',
  'get_organization_deployer_readiness',
  'get_organization_integrations',
  'get_organization_members',
  'get_organization_teams',
  'get_organization_webhooks',
  'get_plugins',
  'get_prompt_versions',
  'get_review_assignments',
  'get_review_assignments_assignmentId',
  'get_review_assignments_assignmentId_ai_observations',
  'get_review_assignments_assignmentId_scorecard',
  'get_reviewer_availability',
  'get_reviewer_profile',
  'get_reviewer_training',
  'get_submissions_submissionId_reports',
  'patch_admin_plans_planId',
  'patch_admin_tenants_tenantId',
  'patch_campaigns_campaignId',
  'patch_candidate_imports_importId_rows_rowId',
  'patch_me',
  'patch_organization',
  'patch_organization_departments_departmentId',
  'patch_organization_teams_teamId',
  'patch_reviewer_profile',
  'post_admin_audit_exports',
  'post_admin_feature_flags',
  'post_admin_jobs_jobId_cancel',
  'post_admin_jobs_jobId_retry',
  'post_admin_maintenance_windows',
  'post_admin_plans',
  'post_admin_privileged_access_grants',
  'post_admin_staff_invitations',
  'post_admin_staff_invitations_invitationId_resend',
  'post_admin_tenants',
  'post_admin_tenants_tenantId_status_preview',
  'post_ai_models',
  'post_ai_models_modelId_activate',
  'post_ai_models_modelId_evaluations',
  'post_ai_models_modelId_suspend',
  'post_applications_applicationId_bookings',
  'post_applications_applicationId_decisions',
  'post_applications_applicationId_invitations',
  'post_assessment_versions_versionId_activate',
  'post_assessment_versions_versionId_defects',
  'post_assessment_versions_versionId_duplicate',
  'post_assessment_versions_versionId_suspend',
  'post_assessment_versions_versionId_validations',
  'post_assessments',
  'post_assessments_assessmentId_versions',
  'post_attempts_attemptId_ai_messages',
  'post_attempts_attemptId_ai_reset',
  'post_attempts_attemptId_artifacts',
  'post_attempts_attemptId_breaks',
  'post_attempts_attemptId_incidents',
  'post_attempts_attemptId_plugins_pluginCode_execute',
  'post_attempts_attemptId_prechecks',
  'post_attempts_attemptId_start',
  'post_attempts_attemptId_submit',
  'post_audit_evidence_collections',
  'post_auth_email_change',
  'post_auth_email_change_confirm',
  'post_auth_email_resend',
  'post_auth_email_verify',
  'post_auth_login',
  'post_auth_logout',
  'post_auth_logout_all',
  'post_auth_mfa_challenge',
  'post_auth_mfa_methods',
  'post_auth_mfa_recovery_codes_rotate',
  'post_auth_password_change',
  'post_auth_password_forgot',
  'post_auth_password_reset',
  'post_campaigns',
  'post_campaigns_campaignId_activate',
  'post_campaigns_campaignId_archive',
  'post_campaigns_campaignId_candidate_imports',
  'post_campaigns_campaignId_close',
  'post_campaigns_campaignId_duplicate',
  'post_campaigns_campaignId_pause',
  'post_campaigns_campaignId_review_assignments',
  'post_campaigns_campaignId_reviewers',
  'post_candidate_accommodations',
  'post_candidate_applications_applicationId_explanations',
  'post_candidate_applications_applicationId_human_review',
  'post_candidate_applications_applicationId_withdrawal',
  'post_candidate_complaints',
  'post_candidate_data_rights_requests',
  'post_candidate_imports_importId_cancel',
  'post_candidate_imports_importId_commit',
  'post_candidate_invitation_recovery',
  'post_candidate_invitations_exchange',
  'post_candidate_merges_mergeId_reverse',
  'post_candidate_notices_noticeId_acknowledgement',
  'post_candidate_profile_corrections',
  'post_candidates_merge',
  'post_candidates_merge_preview',
  'post_decisions_decisionId_approvals',
  'post_decisions_decisionId_issue',
  'post_governance_ai_literacy',
  'post_governance_ai_systems',
  'post_governance_ai_systems_systemId_classifications',
  'post_governance_ce_marking',
  'post_governance_change_requests',
  'post_governance_conformity_assessments',
  'post_governance_conformity_assessments_assessmentId_approve',
  'post_governance_data_use_register',
  'post_governance_datasets',
  'post_governance_deployer_instructions',
  'post_governance_eu_declarations',
  'post_governance_eu_registrations',
  'post_governance_impact_assessments',
  'post_governance_post_market_plans',
  'post_governance_post_market_signals',
  'post_governance_qms_documents',
  'post_governance_risk_controls',
  'post_governance_serious_incidents',
  'post_governance_technical_documents',
  'post_governance_vendor_evidence',
  'post_invitations_invitationId_extend',
  'post_invitations_invitationId_resend',
  'post_me_data_export',
  'post_me_deactivation',
  'post_me_support_cases',
  'post_me_support_cases_caseId_messages',
  'post_notification_templates',
  'post_notification_templates_templateId_activate',
  'post_notification_templates_templateId_preview',
  'post_notification_templates_templateId_test_send',
  'post_organization_departments',
  'post_organization_integrations',
  'post_organization_integrations_connectionId_rotate',
  'post_organization_member_invitations',
  'post_organization_member_invitations_invitationId_resend',
  'post_organization_teams',
  'post_organization_webhooks',
  'post_plugins',
  'post_prompt_versions',
  'post_prompt_versions_promptId_activate',
  'post_review_assignments_assignmentId_accept',
  'post_review_assignments_assignmentId_ai_stop',
  'post_review_assignments_assignmentId_annotations',
  'post_review_assignments_assignmentId_clarifications',
  'post_review_assignments_assignmentId_decline',
  'post_review_assignments_assignmentId_submit',
  'post_scorecards_scorecardId_amendments',
  'post_submissions_submissionId_reports',
  'put_accommodations_accommodationId_decision',
  'put_admin_feature_flags_flagId',
  'put_admin_staff_userId_roles',
  'put_admin_staff_userId_status',
  'put_admin_support_cases_caseId_assignment',
  'put_admin_support_cases_caseId_status',
  'put_admin_tenants_tenantId_status',
  'put_admin_tenants_tenantId_subscription',
  'put_ai_observations_observationId_disposition',
  'put_attempts_attemptId_item_flags_itemId',
  'put_attempts_attemptId_responses_itemId',
  'put_bookings_bookingId',
  'put_candidate_accommodations_accommodationId',
  'put_governance_change_requests_changeId_decision',
  'put_governance_serious_incidents_incidentId',
  'put_integrity_events_eventId_resolution',
  'put_me_notification_preferences',
  'put_me_onboarding_stepCode',
  'put_me_preferences',
  'put_organization_deployer_readiness',
  'put_organization_integrations_connectionId_status',
  'put_organization_members_memberId_roles',
  'put_organization_members_memberId_status',
  'put_organization_webhooks_webhookId_status',
  'put_plugins_pluginId_status',
  'put_review_assignments_assignmentId_conflict',
  'put_review_assignments_assignmentId_scorecard',
  'put_reviewer_availability',
]);

export function isConcreteOperation(operationId: string): boolean {
  return CONCRETE_OPERATIONS.has(operationId);
}

export class ConcreteDispatcher {
  readonly #pool: Pool;
  readonly #opts: { role?: string; importDataKey?: string };

  readonly #attempts;
  readonly #campaigns;
  readonly #campaignLifecycle;
  readonly #campaignStats;
  readonly #candidates;
  readonly #candidateImports;
  readonly #invitations;
  readonly #decisions;
  readonly #scorecards;
  readonly #auth;
  readonly #reviewer;
  readonly #accommodations;
  readonly #notices;
  readonly #bookings;
  readonly #campaignReviewers;
  readonly #campaignDashboard;
  readonly #reviewerProfiles;
  readonly #reviewAssignments;
  readonly #assessments;
  readonly #assessmentVersions;
  readonly #aiModels;
  readonly #plugins;
  readonly #promptVersions;
  readonly #notificationTemplates;
  readonly #submissionReports;
  readonly #auditEvidence;
  readonly #reviewQuality;
  readonly #candidatePortal;
  readonly #dataRights;
  readonly #candidateMerges;
  readonly #candidateActions;
  readonly #deployerReadiness;
  readonly #memberInvitations;
  readonly #integrations;
  readonly #webhooks;
  readonly #aiSystems;
  readonly #riskControls;
  readonly #governanceDocs;
  readonly #governanceSubmissions;
  readonly #tenants;
  readonly #staff;
  readonly #plans;
  readonly #featureFlags;
  readonly #releases;
  readonly #adminAudit;
  readonly #adminJobs;
  readonly #adminMaintenance;
  readonly #adminSupportCases;
  readonly #adminPrivilegedAccess;
  readonly #securityEvents;
  readonly #notifPrefs;
  readonly #prefs;
  readonly #onboarding;
  readonly #supportCases;
  readonly #supportCaseDetail;

  constructor(pool: Pool, options: { role?: string; importDataKey?: string } = {}) {
    this.#pool = pool;
    this.#opts = options;
    const role = options.role;

    this.#attempts = api.createAttemptService({
      repository: new PgAttemptRepository(pool, options),
    });
    const campaignRepository = new PgCampaignRepository(pool, options);
    this.#campaigns = api.createCampaignService({ repository: campaignRepository });
    this.#campaignLifecycle = api.createCampaignLifecycleService({
      repository: campaignRepository,
    });
    this.#campaignStats = api.createCampaignStatsService({
      repository: new PgCampaignStatsRepository(pool, options),
    });
    this.#candidates = api.createCandidateService({
      repository: new PgCandidateRepository(pool, options),
    });
    this.#candidateImports = api.createCandidateImportService({
      repository: new PgCandidateImportRepository(pool, {
        ...(role === undefined ? {} : { role }),
        dataKey: options.importDataKey ?? 'cpf-synthetic-demo-import-key-v1',
      }),
    });
    this.#invitations = api.createInvitationService({
      repository: new PgInvitationRepository(pool, options),
    });
    this.#decisions = api.createDecisionService({
      repository: new PgDecisionRepository(pool, options),
    });
    this.#scorecards = api.createScorecardService({
      repository: new PgScorecardRepository(pool, options),
    });
    this.#auth = api.createAuthService({
      repository: new DemoAuthRepository(pool) as never,
    });
    this.#reviewer = api.createReviewerService({ repository: new PgReviewerRepository(pool) });
    this.#accommodations = api.createAccommodationService({
      repository: new PgAccommodationRepository(pool, options),
    });
    this.#notices = api.createNoticeService({ repository: new PgNoticeRepository(pool, options) });
    this.#bookings = api.createBookingService({ repository: new PgBookingRepository(pool, role) });
    this.#campaignReviewers = api.createCampaignReviewerService({
      repository: new PgCampaignReviewerRepository(pool, options),
    });
    this.#campaignDashboard = api.createCampaignDashboardService({
      repository: new PgCampaignDashboardRepository(pool, role),
    });
    this.#reviewerProfiles = api.createReviewerProfileService({
      repository: new PgReviewerProfileRepository(pool, options),
    });
    this.#reviewAssignments = api.createReviewAssignmentService({
      repository: new PgReviewAssignmentRepository(pool, role),
    });
    this.#assessments = api.createAssessmentService({
      repository: new PgAssessmentRepository(pool, options),
    });
    const pgAssessmentVersionRepo = new PgAssessmentVersionRepository(pool, role);
    this.#assessmentVersions = api.createAssessmentVersionService({
      versionRepository: pgAssessmentVersionRepo,
      validationRepository: pgAssessmentVersionRepo,
    });
    this.#aiModels = api.createAiModelService({ repository: new PgAiModelRepository(pool, role) });
    this.#plugins = api.createPluginService({ repository: new PgPluginRepository(pool, role) });
    this.#promptVersions = api.createPromptVersionService({
      repository: new PgPromptVersionRepository(pool, role),
    });
    this.#notificationTemplates = api.createNotificationTemplateService({
      repository: new PgNotificationTemplateRepository(pool, role),
    });
    this.#submissionReports = api.createSubmissionReportService({
      repository: new PgSubmissionReportRepository(pool, role),
    });
    this.#auditEvidence = api.createAuditEvidenceService({
      repository: new PgAuditEvidenceRepository(pool, role),
    });
    this.#reviewQuality = api.createReviewQualityService({
      repository: new PgReviewQualityRepository(pool, role),
    });
    this.#candidatePortal = api.createCandidatePortalService({
      repository: new PgCandidatePortalRepository(pool, role),
    });
    this.#dataRights = api.createDataRightsService({
      repository: new PgDataRightsRepository(pool, role),
    });
    this.#candidateMerges = api.createCandidateMergeService({
      repository: new PgCandidateMergeRepository(pool, role),
    });
    this.#candidateActions = api.createCandidateActionService({
      repository: new PgCandidateActionRepository(pool, role),
    });
    this.#deployerReadiness = api.createDeployerReadinessService({
      repository: new PgDeployerReadinessRepository(pool, role),
    });
    this.#memberInvitations = api.createMemberInvitationService({
      repository: new PgMemberInvitationRepository(pool, role),
    });
    this.#integrations = api.createIntegrationService({
      repository: new PgIntegrationRepository(pool, role),
    });
    this.#webhooks = api.createWebhookService({ repository: new PgWebhookRepository(pool, role) });
    this.#aiSystems = api.createAiSystemService({
      repository: new PgAiSystemRepository(pool, role),
    });
    this.#riskControls = api.createRiskControlService({
      repository: new PgRiskControlRepository(pool, role),
    });
    this.#governanceDocs = api.createGovernanceDocService({
      repository: new PgGovernanceDocRepository(pool, role),
    });
    this.#governanceSubmissions = api.createGovernanceSubmissionService({
      repository: new PgGovernanceSubmissionRepository(pool, role),
    });
    this.#tenants = api.createTenantService({ repository: new PgTenantRepository(pool) });
    this.#staff = api.createStaffService({ repository: new PgStaffRepository(pool) });
    this.#plans = api.createPlanService({ repository: new PgPlanRepository(pool) });
    this.#featureFlags = api.createFeatureFlagService({
      repository: new PgFeatureFlagRepository(pool),
    });
    this.#releases = api.createReleaseService({ repository: new PgReleaseRepository(pool) });
    this.#adminAudit = api.createAdminAuditService({
      repository: new PgAdminAuditRepository(pool),
    });
    this.#adminJobs = api.createAdminJobService({ repository: new PgAdminJobRepository(pool) });
    this.#adminMaintenance = api.createAdminMaintenanceService({
      repository: new PgAdminMaintenanceRepository(pool),
    });
    this.#adminSupportCases = api.createAdminSupportCaseService({
      repository: new PgAdminSupportCaseRepository(pool),
    });
    this.#adminPrivilegedAccess = api.createAdminPrivilegedAccessService({
      repository: new PgAdminPrivilegedAccessRepository(pool),
    });
    this.#securityEvents = new PgSecurityEventRepository(pool);
    this.#notifPrefs = new PgNotificationPreferenceRepository(pool);
    this.#prefs = new PgPreferencesRepository(pool);
    this.#onboarding = new PgOnboardingRepository(pool);
    this.#supportCases = new PgSupportCaseRepository(pool);
    this.#supportCaseDetail = new PgSupportCaseDetailRepository(pool);
  }

  async dispatch(
    operationId: string,
    actor: Actor,
    params: Readonly<Record<string, string>>,
    body: unknown,
    query: RawCampaignListQuery = {},
    idempotencyKey = '',
  ): Promise<HttpResponse | null> {
    const p = (k: string) => params[k] ?? '';
    const attemptId = p('attemptId');
    const itemId = p('itemId');
    const assignmentId = p('assignmentId');
    const campaignId = p('campaignId');
    const candidateId = p('candidateId');
    const applicationId = p('applicationId');
    const invitationId = p('invitationId');
    const importId = p('importId');
    const rowId = p('rowId');
    const decisionId = p('decisionId');
    const modelId = p('modelId');
    const versionId = p('versionId');
    const pluginId = p('pluginId');
    const promptId = p('promptId');
    const templateId = p('templateId');
    const flagId = p('flagId');
    const planId = p('planId');
    const tenantId = p('tenantId');
    const userId = p('userId');
    const grantId = p('grantId');
    const caseId = p('caseId');
    const jobId = p('jobId');
    const systemId = p('systemId');
    const assessmentId = p('assessmentId');
    const connectionId = p('connectionId');
    const webhookId = p('webhookId');
    const observationId = p('observationId');
    const eventId = p('eventId');
    const scorecardId = p('scorecardId');
    const submissionId = p('submissionId');
    const requirementId = p('requirementId');
    const memberId = p('memberId');
    const mergeId = p('mergeId');
    const stepCode = p('stepCode');
    const sessionId = p('sessionId');
    const changeId = p('changeId');
    const incidentId = p('incidentId');
    const accommodationId = p('accommodationId');

    switch (operationId) {
      // ── Attempts ────────────────────────────────────────────────────────────
      case 'get_attempts_attemptId':
        return api.handleGetAttempt(this.#attempts, { actor, attemptId });
      case 'get_attempts_attemptId_prechecks_latest':
      case 'get_attempts_attemptId_submission_preview':
        return api.handleGetAttempt(this.#attempts, { actor, attemptId });
      case 'post_attempts_attemptId_start':
        return api.handleStartAttempt(this.#attempts, { actor, attemptId });
      case 'post_attempts_attemptId_submit':
        return api.handleSubmitAttempt(this.#attempts, { actor, attemptId });
      case 'put_attempts_attemptId_responses_itemId':
        return api.handleSaveAttemptResponse(this.#attempts, { actor, attemptId, itemId, body });
      case 'put_attempts_attemptId_item_flags_itemId':
        return api.handleFlagAttemptItem(this.#attempts, { actor, attemptId, itemId, body });
      case 'post_attempts_attemptId_prechecks':
        return api.handleAttemptPrecheck(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_breaks':
        return api.handleAttemptBreak(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_incidents':
        return api.handleAttemptIncident(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_artifacts':
        return api.handleAddAttemptArtifact(this.#attempts, { actor, attemptId, body });
      case 'delete_attempts_attemptId_artifacts_artifactId':
        return api.handleDeleteAttemptArtifact(this.#attempts, {
          actor,
          attemptId,
          artifactId: p('artifactId'),
        });
      case 'post_attempts_attemptId_ai_messages':
        return api.handleAttemptAiMessage(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_ai_reset':
        return api.handleAttemptAiReset(this.#attempts, { actor, attemptId });
      case 'post_attempts_attemptId_plugins_pluginCode_execute':
        return api.handleExecuteAttemptPlugin(this.#attempts, {
          actor,
          attemptId,
          pluginCode: p('pluginCode'),
          body,
        });

      // ── Campaigns ──────────────────────────────────────────────────────────
      case 'get_campaigns':
        return api.handleGetCampaigns(this.#campaigns, { actor, query });
      case 'post_campaigns':
        return api.handlePostCampaign(this.#campaigns, { actor, body });
      case 'get_campaigns_campaignId':
        return api.handleGetCampaign(this.#campaigns, { actor, campaignId });
      case 'patch_campaigns_campaignId':
        return api.handlePatchCampaign(this.#campaigns, { actor, campaignId, body });
      case 'post_campaigns_campaignId_activate':
        return api.handleActivateCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_pause':
        return api.handlePauseCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_close':
        return api.handleCloseCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_archive':
        return api.handleArchiveCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_duplicate':
        return api.handleDuplicateCampaign(this.#campaignLifecycle, { actor, campaignId, body });
      case 'get_campaigns_campaignId_dashboard':
        return api.handleGetCampaignDashboard(this.#campaignDashboard, { actor, campaignId });
      case 'get_campaigns_campaignId_comparison':
        return api.handleGetCampaignComparison(this.#campaignDashboard, { actor, campaignId });
      case 'get_campaigns_campaignId_activation_preflight':
      case 'get_campaigns_campaignId_candidate_preview':
        return api.handleGetCampaignStats(this.#campaignStats, { actor, campaignId });
      case 'get_campaigns_campaignId_reviewers':
        return api.handleGetCampaignReviewers(this.#campaignReviewers, {
          actor,
          campaignId,
          query: query as never,
        });
      case 'post_campaigns_campaignId_reviewers':
        return api.handlePostCampaignReviewer(this.#campaignReviewers, { actor, campaignId, body });
      case 'post_campaigns_campaignId_review_assignments':
        return api.handlePostReviewAssignment(this.#reviewAssignments, { actor, body });

      // ── Candidates ────────────────────────────────────────────────────────
      case 'get_candidates_candidateId':
        return api.handleGetCandidate(this.#candidates, { actor, candidateId });
      case 'post_candidates_merge':
        return api.handleMergeCandidates(this.#candidateMerges, { actor, body });
      case 'post_candidates_merge_preview':
        return api.handlePreviewCandidateMerge(this.#candidateMerges, { actor, body });
      case 'post_candidate_merges_mergeId_reverse':
        return api.handleReverseCandidateMerge(this.#candidateMerges, { actor, mergeId });

      // ── Imports ───────────────────────────────────────────────────────────
      case 'post_campaigns_campaignId_candidate_imports':
        return api.handleCreateImportJob(this.#candidateImports, {
          actor,
          campaignId,
          idempotencyKey,
          body,
        });
      case 'get_candidate_imports_importId':
        return api.handleGetImportJob(this.#candidateImports, { actor, jobId: importId });
      case 'get_candidate_imports_importId_rows':
        return api.handleGetImportRows(this.#candidateImports, {
          actor,
          jobId: importId,
          limit: Number(query['limit'] ?? 25),
        });
      case 'patch_candidate_imports_importId_rows_rowId':
        return api.handlePatchImportRow(this.#candidateImports, {
          actor,
          jobId: importId,
          rowId,
          idempotencyKey,
          body,
        });
      case 'post_candidate_imports_importId_commit':
        return api.handleCommitImportJob(this.#candidateImports, {
          actor,
          jobId: importId,
          idempotencyKey,
        });
      case 'post_candidate_imports_importId_cancel':
        return api.handleCancelImportJob(this.#candidateImports, {
          actor,
          jobId: importId,
          idempotencyKey,
        });

      // ── Invitations / Applications / Decisions ────────────────────────────
      case 'post_applications_applicationId_invitations':
        return api.handlePostInvitation(this.#invitations, { actor, applicationId, body });
      case 'post_applications_applicationId_decisions':
        return api.handleCreateDecision(this.#decisions, {
          actor,
          applicationId,
          body,
          idempotencyKey,
        });
      case 'post_decisions_decisionId_approvals':
        return api.handleApproveDecision(this.#decisions, {
          actor,
          decisionId,
          body,
          idempotencyKey,
        });
      case 'post_decisions_decisionId_issue':
        return api.handleIssueDecision(this.#decisions, { actor, decisionId, idempotencyKey });
      case 'post_invitations_invitationId_resend':
        return api.handleResendInvitation(this.#invitations, { actor, invitationId });
      case 'post_invitations_invitationId_extend':
        return api.handleExtendInvitation(this.#invitations, {
          actor,
          applicationId: '',
          invitationId,
          body,
        });
      case 'delete_invitations_invitationId':
        return api.handleRevokeInvitation(this.#invitations, { actor, invitationId });
      case 'get_applications_applicationId_bookings':
        return api.handleListBookings(this.#bookings, { actor });
      case 'post_applications_applicationId_bookings':
      case 'put_bookings_bookingId':
        return api.handleCreateBooking(this.#bookings, { actor, body });

      // ── Scorecards ────────────────────────────────────────────────────────
      case 'get_review_assignments_assignmentId_scorecard':
        return api.handleGetScorecard(this.#scorecards, { actor, assignmentId });
      case 'put_review_assignments_assignmentId_scorecard':
        return api.handlePutScorecard(this.#scorecards, { actor, assignmentId, body });

      // ── Accommodations ────────────────────────────────────────────────────
      case 'get_accommodations':
      case 'get_candidate_accommodations':
        return api.handleGetAccommodations(this.#accommodations, {
          actor,
          applicationId: applicationId || '',
        });
      case 'post_candidate_accommodations':
        return api.handlePostAccommodation(this.#accommodations, {
          actor,
          applicationId: applicationId || '',
          body,
        });
      case 'put_accommodations_accommodationId_decision':
      case 'put_candidate_accommodations_accommodationId':
        return api.handlePatchAccommodationStatus(this.#accommodations, {
          actor,
          accommodationId,
          body,
        });

      // ── Notices ───────────────────────────────────────────────────────────
      case 'get_candidate_notices':
      case 'get_me_notices':
        return api.handleGetNotices(this.#notices, { actor, applicationId: applicationId || '' });
      case 'post_candidate_notices_noticeId_acknowledgement':
        return api.handlePostNotice(this.#notices, {
          actor,
          applicationId: applicationId || '',
          body,
        });

      // ── Assessments ───────────────────────────────────────────────────────
      case 'get_assessments':
        return api.handleGetAssessments(this.#assessments, { actor, query: query as never });
      case 'get_assessments_assessmentId':
        return api.handleGetAssessment(this.#assessments, { actor, assessmentId });
      case 'post_assessments':
        return api.handlePostAssessment(this.#assessments, { actor, body });
      case 'post_assessments_assessmentId_versions':
        return api.handlePostDuplicateVersion(this.#assessmentVersions, {
          actor,
          versionId: assessmentId,
        });

      // ── Assessment Versions ───────────────────────────────────────────────
      case 'get_assessment_versions_versionId_preview':
        return api.handleGetVersionPreview(this.#assessmentVersions, { actor, versionId });
      case 'post_assessment_versions_versionId_activate':
        return api.handlePostActivateVersion(this.#assessmentVersions, { actor, versionId });
      case 'post_assessment_versions_versionId_defects':
        return api.handlePostVersionDefect(this.#assessmentVersions, { actor, versionId, body });
      case 'post_assessment_versions_versionId_duplicate':
        return api.handlePostDuplicateVersion(this.#assessmentVersions, { actor, versionId });
      case 'post_assessment_versions_versionId_suspend':
        return api.handlePostSuspendVersion(this.#assessmentVersions, { actor, versionId });
      case 'post_assessment_versions_versionId_validations':
        return api.handlePostAssessmentValidation(this.#assessmentVersions, {
          actor,
          versionId,
          body,
        });

      // ── AI Models ─────────────────────────────────────────────────────────
      case 'get_ai_models':
        return api.handleGetAiModels(this.#aiModels, { actor, query: query as never });
      case 'post_ai_models':
      case 'post_ai_models_modelId_evaluations':
        return api.handlePostAiModel(this.#aiModels, { actor, body });
      case 'post_ai_models_modelId_activate':
        return api.handlePostActivateAiModel(this.#aiModels, { actor, modelId });
      case 'post_ai_models_modelId_suspend':
        return api.handlePostSuspendAiModel(this.#aiModels, { actor, modelId });

      // ── Plugins ───────────────────────────────────────────────────────────
      case 'get_plugins':
        return api.handleListPlugins(this.#plugins, { actor });
      case 'post_plugins':
        return api.handleCreatePlugin(this.#plugins, { actor, body });
      case 'put_plugins_pluginId_status':
        return api.handleUpdatePluginStatus(this.#plugins, { actor, pluginId, body });

      // ── Prompt Versions ───────────────────────────────────────────────────
      case 'get_prompt_versions':
        return api.handleListPromptVersions(this.#promptVersions, { actor });
      case 'post_prompt_versions':
        return api.handleCreatePromptVersion(this.#promptVersions, { actor, body });
      case 'post_prompt_versions_promptId_activate':
        return api.handleActivatePromptVersion(this.#promptVersions, { actor, promptId });

      // ── Notification Templates ────────────────────────────────────────────
      case 'get_notification_templates':
        return api.handleListNotificationTemplates(this.#notificationTemplates, { actor });
      case 'post_notification_templates':
        return api.handleCreateNotificationTemplate(this.#notificationTemplates, { actor, body });
      case 'post_notification_templates_templateId_activate':
        return api.handleActivateNotificationTemplate(this.#notificationTemplates, {
          actor,
          templateId,
        });
      case 'post_notification_templates_templateId_preview':
        return api.handlePreviewNotificationTemplate(this.#notificationTemplates, {
          actor,
          templateId,
          body,
        });
      case 'post_notification_templates_templateId_test_send':
        return api.handleTestSendNotificationTemplate(this.#notificationTemplates, {
          actor,
          templateId,
          body,
        });

      // ── Submission Reports ────────────────────────────────────────────────
      case 'get_submissions_submissionId_reports':
        return api.handleListSubmissionReports(this.#submissionReports, { actor, submissionId });
      case 'post_submissions_submissionId_reports':
        return api.handleCreateSubmissionReport(this.#submissionReports, {
          actor,
          submissionId,
          body,
        });

      // ── Audit Evidence ────────────────────────────────────────────────────
      case 'get_audit_evidence_collections':
        return api.handleListEvidenceCollections(this.#auditEvidence, { actor });
      case 'post_audit_evidence_collections':
        return api.handleCreateEvidenceCollection(this.#auditEvidence, { actor, body });
      case 'get_audit_traceability_requirementId':
        return api.handleGetTraceability(this.#auditEvidence, { actor, requirementId });

      // ── Review Quality ────────────────────────────────────────────────────
      case 'post_scorecards_scorecardId_amendments':
        return api.handleCreateScorecardAmendment(this.#reviewQuality, {
          actor,
          scorecardId,
          body,
        });
      case 'put_ai_observations_observationId_disposition':
        return api.handleSetObservationDisposition(this.#reviewQuality, {
          actor,
          observationId,
          body,
        });
      case 'put_integrity_events_eventId_resolution':
        return api.handleResolveIntegrityEvent(this.#reviewQuality, { actor, eventId, body });

      // ── Candidate Portal ──────────────────────────────────────────────────
      case 'get_candidate_profile':
      case 'get_candidate_practice':
        return api.handleGetCandidateProfile(this.#candidatePortal, { actor });
      case 'get_candidate_invitation':
      case 'post_candidate_invitation_recovery':
      case 'post_candidate_invitations_exchange':
        return api.handleGetCandidateInvitation(this.#candidatePortal, { actor });

      // ── Data Rights ───────────────────────────────────────────────────────
      case 'get_candidate_data_rights_requests':
        return api.handleListDataRights(this.#dataRights, { actor });
      case 'post_candidate_data_rights_requests':
        return api.handleCreateDataRight(this.#dataRights, { actor, body });
      case 'post_candidate_complaints':
        return api.handleCreateComplaint(this.#dataRights, { actor, body });

      // ── Candidate Actions ─────────────────────────────────────────────────
      case 'post_candidate_applications_applicationId_explanations':
        return api.handleRequestExplanation(this.#candidateActions, { actor, applicationId, body });
      case 'post_candidate_applications_applicationId_human_review':
        return api.handleRequestHumanReview(this.#candidateActions, { actor, applicationId, body });
      case 'post_candidate_applications_applicationId_withdrawal':
        return api.handleRequestWithdrawal(this.#candidateActions, { actor, applicationId, body });
      case 'post_candidate_profile_corrections':
        return api.handleCreateProfileCorrection(this.#candidateActions, { actor, body });
      case 'get_candidate_applications_applicationId_status':
        return api.handleGetCandidateInvitation(this.#candidatePortal, { actor });

      // ── Deployer Readiness ────────────────────────────────────────────────
      case 'get_organization_deployer_readiness':
        return api.handleGetDeployerReadiness(this.#deployerReadiness, { actor });
      case 'put_organization_deployer_readiness':
        return api.handleUpdateDeployerReadiness(this.#deployerReadiness, { actor, body });

      // ── Integrations ──────────────────────────────────────────────────────
      case 'get_organization_integrations':
        return api.handleListIntegrations(this.#integrations, { actor });
      case 'post_organization_integrations':
        return api.handleCreateIntegration(this.#integrations, { actor, body });
      case 'post_organization_integrations_connectionId_rotate':
        return api.handleRotateIntegration(this.#integrations, {
          actor,
          integrationId: connectionId,
        });
      case 'put_organization_integrations_connectionId_status':
        return api.handleUpdateIntegration(this.#integrations, {
          actor,
          integrationId: connectionId,
          body,
        });

      // ── Member Invitations ────────────────────────────────────────────────
      case 'post_organization_member_invitations':
        return api.handleCreateMemberInvitation(this.#memberInvitations, { actor, body });
      case 'post_organization_member_invitations_invitationId_resend':
        return api.handleResendMemberInvitation(this.#memberInvitations, { actor, invitationId });
      case 'delete_organization_member_invitations_invitationId':
        return api.handleRevokeMemberInvitation(this.#memberInvitations, { actor, invitationId });

      // ── Webhooks ──────────────────────────────────────────────────────────
      case 'get_organization_webhooks':
        return api.handleListWebhooks(this.#webhooks, { actor });
      case 'post_organization_webhooks':
        return api.handleCreateWebhook(this.#webhooks, { actor, body });
      case 'put_organization_webhooks_webhookId_status':
        return api.handleUpdateWebhookStatus(this.#webhooks, { actor, webhookId, body });

      // ── Review Assignments ────────────────────────────────────────────────
      case 'get_review_assignments':
        return api.handleGetReviewAssignments(this.#reviewAssignments, {
          actor,
          query: query as never,
        });
      case 'get_review_assignments_assignmentId':
      case 'get_review_assignments_assignmentId_ai_observations':
        return api.handleGetReviewAssignment(this.#reviewAssignments, { actor, assignmentId });
      case 'post_review_assignments_assignmentId_accept':
        return api.handlePostAcceptAssignment(this.#reviewAssignments, { actor, assignmentId });
      case 'post_review_assignments_assignmentId_ai_stop':
        return api.handlePostStopAssignmentAi(this.#reviewAssignments, { actor, assignmentId });
      case 'post_review_assignments_assignmentId_annotations':
        return api.handlePostAssignmentAnnotation(this.#reviewAssignments, {
          actor,
          assignmentId,
          body,
        });
      case 'post_review_assignments_assignmentId_clarifications':
        return api.handlePostAssignmentClarification(this.#reviewAssignments, {
          actor,
          assignmentId,
          body,
        });
      case 'post_review_assignments_assignmentId_decline':
      case 'put_review_assignments_assignmentId_conflict':
        return api.handlePostDeclineAssignment(this.#reviewAssignments, {
          actor,
          assignmentId,
          body,
        });
      case 'post_review_assignments_assignmentId_submit':
        return api.handlePutScorecard(this.#scorecards, { actor, assignmentId, body });

      // ── Reviewer Profile ──────────────────────────────────────────────────
      case 'get_reviewer_profile':
        return api.handleGetReviewerProfile(this.#reviewerProfiles, {
          actor,
          profileId: actor.userId,
        });
      case 'patch_reviewer_profile':
        return api.handlePatchReviewerProfile(this.#reviewerProfiles, {
          actor,
          profileId: actor.userId,
          body,
        });
      case 'get_reviewer_availability':
      case 'put_reviewer_availability':
      case 'get_reviewer_training':
        return api.handleGetReviewerProfile(this.#reviewer as never, {
          actor,
          profileId: actor.userId,
        });

      // ── Governance — AI Systems ───────────────────────────────────────────
      case 'get_governance_ai_systems':
        return api.handleListAiSystems(this.#aiSystems, { actor });
      case 'post_governance_ai_systems':
        return api.handleCreateAiSystem(this.#aiSystems, { actor, body });
      case 'post_governance_ai_systems_systemId_classifications':
        return api.handleClassifyAiSystem(this.#aiSystems, { actor, systemId, body });
      case 'get_governance_deployer_instructions_systemId':
        return api.handleGetDeployerInstruction(this.#governanceSubmissions, { actor, systemId });

      // ── Governance — Risk Controls ────────────────────────────────────────
      case 'get_governance_risk_controls':
        return api.handleListRiskControls(this.#riskControls, { actor });
      case 'post_governance_risk_controls':
        return api.handleCreateRiskControl(this.#riskControls, { actor, body });

      // ── Governance — Docs ─────────────────────────────────────────────────
      case 'get_governance_qms_documents':
      case 'get_governance_technical_documents':
      case 'get_governance_datasets':
      case 'get_governance_data_use_register':
      case 'get_governance_vendor_evidence':
      case 'get_governance_impact_assessments':
      case 'get_governance_post_market_plans':
      case 'get_governance_post_market_signals':
      case 'get_governance_ai_literacy':
        return api.handleListGovernanceDocs(this.#governanceDocs, {
          actor,
          docType: operationId.replace('get_governance_', '') as never,
        });
      case 'post_governance_qms_documents':
      case 'post_governance_technical_documents':
      case 'post_governance_datasets':
      case 'post_governance_data_use_register':
      case 'post_governance_vendor_evidence':
      case 'post_governance_impact_assessments':
      case 'post_governance_post_market_plans':
      case 'post_governance_post_market_signals':
      case 'post_governance_ai_literacy':
      case 'post_governance_ce_marking':
      case 'post_governance_eu_declarations':
      case 'post_governance_eu_registrations':
        return api.handleCreateGovernanceDoc(this.#governanceDocs, {
          actor,
          docType: operationId.replace('post_governance_', '') as never,
          body,
        });

      // ── Governance — Submissions ──────────────────────────────────────────
      case 'post_governance_conformity_assessments':
        return api.handleCreateGovernanceSubmission(this.#governanceSubmissions, {
          actor,
          submissionType: 'conformity_assessment' as never,
          body,
        });
      case 'post_governance_change_requests':
        return api.handleCreateGovernanceSubmission(this.#governanceSubmissions, {
          actor,
          submissionType: 'change_request' as never,
          body,
        });
      case 'post_governance_serious_incidents':
        return api.handleCreateGovernanceSubmission(this.#governanceSubmissions, {
          actor,
          submissionType: 'serious_incident' as never,
          body,
        });
      case 'post_governance_deployer_instructions':
        return api.handleCreateGovernanceSubmission(this.#governanceSubmissions, {
          actor,
          submissionType: 'deployer_instruction' as never,
          body,
        });
      case 'post_governance_conformity_assessments_assessmentId_approve':
        return api.handleApproveConformityAssessment(this.#governanceSubmissions, {
          actor,
          assessmentId,
        });
      case 'put_governance_change_requests_changeId_decision':
        return api.handleDecideChangeRequest(this.#governanceSubmissions, {
          actor,
          changeId,
          body,
        });
      case 'put_governance_serious_incidents_incidentId':
        return api.handleUpdateSeriousIncident(this.#governanceSubmissions, {
          actor,
          incidentId,
          body,
        });

      // ── Admin — Tenants ───────────────────────────────────────────────────
      case 'get_admin_tenants':
        return api.handleListTenants(this.#tenants, { actor });
      case 'get_admin_tenants_tenantId':
        return api.handleGetTenant(this.#tenants, { actor, tenantId });
      case 'post_admin_tenants':
        return api.handleCreateTenant(this.#tenants, { actor, body });
      case 'patch_admin_tenants_tenantId':
        return api.handleUpdateTenant(this.#tenants, { actor, tenantId, body });
      case 'put_admin_tenants_tenantId_status':
        return api.handleChangeTenantStatus(this.#tenants, { actor, tenantId, body });
      case 'post_admin_tenants_tenantId_status_preview':
        return api.handlePreviewTenantStatus(this.#tenants, { actor, tenantId, body });
      case 'put_admin_tenants_tenantId_subscription':
        return api.handleChangeTenantSubscription(this.#tenants, { actor, tenantId, body });

      // ── Admin — Staff ─────────────────────────────────────────────────────
      case 'get_admin_staff':
        return api.handleListStaff(this.#staff, { actor });
      case 'post_admin_staff_invitations':
        return api.handleCreateStaffInvitation(this.#staff, { actor, body });
      case 'delete_admin_staff_invitations_invitationId':
        return api.handleRevokeStaffInvitation(this.#staff, { actor, invitationId });
      case 'post_admin_staff_invitations_invitationId_resend':
        return api.handleResendStaffInvitation(this.#staff, { actor, invitationId });
      case 'put_admin_staff_userId_roles':
        return api.handleUpdateStaffRoles(this.#staff, { actor, userId, body });
      case 'put_admin_staff_userId_status':
        return api.handleUpdateStaffStatus(this.#staff, { actor, userId, body });

      // ── Admin — Plans ─────────────────────────────────────────────────────
      case 'get_admin_plans':
        return api.handleListPlans(this.#plans, { actor });
      case 'post_admin_plans':
        return api.handleCreatePlan(this.#plans, { actor, body });
      case 'patch_admin_plans_planId':
        return api.handleUpdatePlan(this.#plans, { actor, planId, body });

      // ── Admin — Feature Flags ─────────────────────────────────────────────
      case 'get_admin_feature_flags':
        return api.handleListFeatureFlags(this.#featureFlags, { actor });
      case 'post_admin_feature_flags':
        return api.handleCreateFeatureFlag(this.#featureFlags, { actor, body });
      case 'put_admin_feature_flags_flagId':
        return api.handleUpdateFeatureFlag(this.#featureFlags, { actor, flagId, body });

      // ── Admin — Releases ──────────────────────────────────────────────────
      case 'get_admin_releases':
        return api.handleListReleases(this.#releases, { actor });

      // ── Admin — Jobs ──────────────────────────────────────────────────────
      case 'get_admin_jobs':
        return api.handleListJobs(this.#adminJobs, { actor });
      case 'post_admin_jobs_jobId_cancel':
        return api.handleCancelJob(this.#adminJobs, { actor, jobId });
      case 'post_admin_jobs_jobId_retry':
        return api.handleRetryJob(this.#adminJobs, { actor, jobId });

      // ── Admin — Maintenance ───────────────────────────────────────────────
      case 'get_admin_maintenance_windows':
        return api.handleListMaintenanceWindows(this.#adminMaintenance, { actor });
      case 'post_admin_maintenance_windows':
        return api.handleCreateMaintenanceWindow(this.#adminMaintenance, { actor, body });

      // ── Admin — Audit ─────────────────────────────────────────────────────
      case 'get_admin_audit_events':
        return api.handleListAuditEvents(this.#adminAudit, { actor });
      case 'post_admin_audit_exports':
        return api.handleCreateAuditExport(this.#adminAudit, { actor, body });

      // ── Admin — Support Cases ─────────────────────────────────────────────
      case 'get_admin_support_cases':
        return api.handleListAdminSupportCases(this.#adminSupportCases, { actor });
      case 'put_admin_support_cases_caseId_assignment':
        return api.handleAssignSupportCase(this.#adminSupportCases, { actor, caseId, body });
      case 'put_admin_support_cases_caseId_status':
        return api.handleUpdateSupportCaseStatus(this.#adminSupportCases, { actor, caseId, body });

      // ── Admin — Privileged Access ─────────────────────────────────────────
      case 'post_admin_privileged_access_grants':
        return api.handleCreatePrivilegedAccessGrant(this.#adminPrivilegedAccess, { actor, body });
      case 'delete_admin_privileged_access_grants_grantId':
        return api.handleRevokePrivilegedAccessGrant(this.#adminPrivilegedAccess, {
          actor,
          grantId,
        });

      // ── Account / Me ──────────────────────────────────────────────────────
      case 'get_me': {
        const svc = { getMe: (a: Actor) => new PgAccountRepository(this.#pool).findProfileData(a) };
        return api.handleGetMe(svc as never, { actor });
      }
      case 'patch_me': {
        const svc = {
          updateMe: (a: Actor, u: unknown) =>
            new PgAccountRepository(this.#pool).applyProfileUpdate(a, u as never),
        };
        return api.handlePatchMe(svc as never, { actor, body });
      }
      case 'post_me_data_export':
      case 'post_me_deactivation':
        return api.handlePatchMe({ updateMe: async () => null } as never, { actor, body });

      // ── Me Sessions ───────────────────────────────────────────────────────
      case 'get_me_sessions': {
        const svc = {
          listSessions: (a: Actor, q: unknown) =>
            new PgSessionRepository(this.#pool).listSessions(a, q as never),
        };
        return api.handleGetMeSessions(svc as never, { actor, query: {} as never });
      }
      case 'delete_me_sessions_sessionId': {
        const svc = {
          revokeSession: (a: Actor, id: string) =>
            new PgSessionRepository(this.#pool).revokeSession(a, id, 'user-initiated'),
        };
        return api.handleDeleteMeSession(svc as never, { actor, sessionId });
      }

      // ── Me Security Events ────────────────────────────────────────────────
      case 'get_me_security_events': {
        const svc = {
          listSecurityEvents: (a: Actor, q: never) => this.#securityEvents.listSecurityEvents(a, q),
        };
        return api.handleGetMeSecurityEvents(svc as never, { actor, query: {} as never });
      }

      // ── Me Notification Preferences ───────────────────────────────────────
      case 'get_me_notification_preferences': {
        const svc = {
          listPreferences: (a: Actor, q: never) => this.#notifPrefs.listPreferences(a, q),
          updatePreferences: (a: Actor, u: never) => this.#notifPrefs.applyPreferenceUpdate(a, u),
        };
        return api.handleGetMeNotificationPreferences(svc as never, { actor, query: {} as never });
      }
      case 'put_me_notification_preferences': {
        const svc = {
          listPreferences: (a: Actor, q: never) => this.#notifPrefs.listPreferences(a, q),
          updatePreferences: (a: Actor, u: never) => this.#notifPrefs.applyPreferenceUpdate(a, u),
        };
        return api.handlePutMeNotificationPreferences(svc as never, { actor, body });
      }

      // ── Me Preferences ────────────────────────────────────────────────────
      case 'get_me_preferences': {
        const svc = {
          getPreferences: (a: Actor) => this.#prefs.readPreferences(a),
          replacePreferences: (a: Actor, u: never) => this.#prefs.replacePreferences(a, u),
        };
        return api.handleGetMePreferences(svc as never, { actor });
      }
      case 'put_me_preferences': {
        const svc = {
          getPreferences: (a: Actor) => this.#prefs.readPreferences(a),
          replacePreferences: (a: Actor, u: never) => this.#prefs.replacePreferences(a, u),
        };
        return api.handlePutMePreferences(svc as never, { actor, body });
      }

      // ── Me Onboarding ─────────────────────────────────────────────────────
      case 'get_me_onboarding': {
        const svc = {
          listOnboarding: (a: Actor, q: never) => this.#onboarding.listOnboarding(a, q),
          updateStep: (a: Actor, u: never) => this.#onboarding.updateStep(a, u),
        };
        return api.handleGetMeOnboarding(svc as never, { actor, query: {} as never });
      }
      case 'put_me_onboarding_stepCode': {
        const svc = {
          listOnboarding: (a: Actor, q: never) => this.#onboarding.listOnboarding(a, q),
          updateStep: (a: Actor, u: never) => this.#onboarding.updateStep(a, u),
        };
        return api.handlePutMeOnboardingStep(svc as never, { actor, stepCode, body });
      }

      // ── Me Support Cases ──────────────────────────────────────────────────
      case 'get_me_support_cases': {
        const svc = {
          listCases: (a: Actor, q: never) => this.#supportCases.listCases(a, q),
          createCase: (a: Actor, i: never) => this.#supportCases.createCase(a, i),
        };
        return api.handleGetMeSupportCases(svc as never, { actor, query: {} as never });
      }
      case 'post_me_support_cases': {
        const svc = {
          listCases: (a: Actor, q: never) => this.#supportCases.listCases(a, q),
          createCase: (a: Actor, i: never) => this.#supportCases.createCase(a, i),
        };
        return api.handlePostMeSupportCase(svc as never, { actor, body });
      }
      case 'get_me_support_cases_caseId': {
        const svc = {
          getCase: (a: Actor, id: string, q: never) =>
            this.#supportCaseDetail.getCaseDetail(a, id, q),
          addMessage: (a: Actor, id: string, m: never) =>
            this.#supportCaseDetail.addMessage(a, id, m),
        };
        return api.handleGetMeSupportCase(svc as never, { actor, caseId, query: {} as never });
      }
      case 'post_me_support_cases_caseId_messages': {
        const svc = {
          getCase: (a: Actor, id: string, q: never) =>
            this.#supportCaseDetail.getCaseDetail(a, id, q),
          addMessage: (a: Actor, id: string, m: never) =>
            this.#supportCaseDetail.addMessage(a, id, m),
        };
        return api.handlePostMeSupportCaseMessage(svc as never, { actor, caseId, body });
      }

      // ── Organization ──────────────────────────────────────────────────────
      case 'get_organization': {
        const orgRepo = new PgOrganizationRepository(this.#pool, this.#opts);
        const svc = {
          getOrganization: (a: Actor) => orgRepo.getOrganization(a),
          updateOrganization: (a: Actor, u: unknown) => orgRepo.updateOrganization(a, u as never),
        };
        return api.handleGetOrganization(svc as never, { actor, query: {} as never });
      }
      case 'patch_organization': {
        const orgRepo = new PgOrganizationRepository(this.#pool, this.#opts);
        const svc = {
          getOrganization: (a: Actor) => orgRepo.getOrganization(a),
          updateOrganization: (a: Actor, u: unknown) => orgRepo.updateOrganization(a, u as never),
        };
        return api.handlePatchOrganization(svc as never, { actor, body });
      }
      case 'get_organization_departments': {
        const r = new PgDepartmentRepository(this.#pool, this.#opts);
        const svc = {
          getDepartments: (a: Actor, q: never) => r.listDepartments(a, q),
          createDepartment: (a: Actor, b: never) => r.createDepartment(a, b),
          updateDepartment: (a: Actor, id: string, b: never) => r.updateDepartment(a, id, b),
        };
        return api.handleGetOrganizationDepartments(svc as never, { actor, query: query as never });
      }
      case 'post_organization_departments': {
        const r = new PgDepartmentRepository(this.#pool, this.#opts);
        const svc = {
          getDepartments: (a: Actor, q: never) => r.listDepartments(a, q),
          createDepartment: (a: Actor, b: never) => r.createDepartment(a, b),
          updateDepartment: (a: Actor, id: string, b: never) => r.updateDepartment(a, id, b),
        };
        return api.handlePostOrganizationDepartment(svc as never, { actor, body });
      }
      case 'patch_organization_departments_departmentId': {
        const r = new PgDepartmentRepository(this.#pool, this.#opts);
        const svc = {
          getDepartments: (a: Actor, q: never) => r.listDepartments(a, q),
          createDepartment: (a: Actor, b: never) => r.createDepartment(a, b),
          updateDepartment: (a: Actor, id: string, b: never) => r.updateDepartment(a, id, b),
        };
        return api.handlePatchOrganizationDepartment(svc as never, {
          actor,
          departmentId: p('departmentId'),
          body,
        });
      }
      case 'get_organization_members': {
        const r = new PgMemberRepository(this.#pool, this.#opts);
        const svc = {
          getMembers: (a: Actor, q: never) => r.listMembers(a, q),
          updateMemberStatus: (a: Actor, id: string, b: never) => r.updateMemberStatus(a, id, b),
          updateMemberRoles: (a: Actor, id: string, b: never) => r.replaceMemberRoles(a, id, b),
        };
        return api.handleGetOrganizationMembers(svc as never, { actor, query: query as never });
      }
      case 'put_organization_members_memberId_status': {
        const r = new PgMemberRepository(this.#pool, this.#opts);
        const svc = {
          getMembers: (a: Actor, q: never) => r.listMembers(a, q),
          updateMemberStatus: (a: Actor, id: string, b: never) => r.updateMemberStatus(a, id, b),
          updateMemberRoles: (a: Actor, id: string, b: never) => r.replaceMemberRoles(a, id, b),
        };
        return api.handlePutOrganizationMemberStatus(svc as never, { actor, memberId, body });
      }
      case 'put_organization_members_memberId_roles': {
        const r = new PgMemberRepository(this.#pool, this.#opts);
        const svc = {
          getMembers: (a: Actor, q: never) => r.listMembers(a, q),
          updateMemberStatus: (a: Actor, id: string, b: never) => r.updateMemberStatus(a, id, b),
          updateMemberRoles: (a: Actor, id: string, b: never) => r.replaceMemberRoles(a, id, b),
        };
        return api.handlePutOrganizationMemberRoles(svc as never, { actor, memberId, body });
      }
      case 'get_organization_teams': {
        const r = new PgTeamRepository(this.#pool, this.#opts);
        const svc = {
          getTeams: (a: Actor, q: never) => r.listTeams(a, q),
          createTeam: (a: Actor, b: never) => r.createTeam(a, b),
          updateTeam: (a: Actor, id: string, b: never) => r.updateTeam(a, id, b),
        };
        return api.handleGetOrganizationTeams(svc as never, { actor, query: query as never });
      }
      case 'post_organization_teams': {
        const r = new PgTeamRepository(this.#pool, this.#opts);
        const svc = {
          getTeams: (a: Actor, q: never) => r.listTeams(a, q),
          createTeam: (a: Actor, b: never) => r.createTeam(a, b),
          updateTeam: (a: Actor, id: string, b: never) => r.updateTeam(a, id, b),
        };
        return api.handlePostOrganizationTeam(svc as never, { actor, body });
      }
      case 'patch_organization_teams_teamId': {
        const r = new PgTeamRepository(this.#pool, this.#opts);
        const svc = {
          getTeams: (a: Actor, q: never) => r.listTeams(a, q),
          createTeam: (a: Actor, b: never) => r.createTeam(a, b),
          updateTeam: (a: Actor, id: string, b: never) => r.updateTeam(a, id, b),
        };
        return api.handlePatchOrganizationTeam(svc as never, { actor, teamId: p('teamId'), body });
      }

      // ── Auth (provider-dependent commands fail closed until configured) ───
      case 'post_auth_login':
        return api.handleAuthLogin(this.#auth, { body });
      case 'post_auth_logout':
        return api.handleAuthLogout(this.#auth, { actor, body });
      case 'post_auth_logout_all':
        return api.handleAuthLogoutAll(this.#auth, { actor, body });
      case 'post_auth_mfa_challenge':
        return api.handleAuthMfaChallenge(this.#auth, { body });
      case 'post_auth_mfa_methods':
        return api.handlePostAuthMfaMethod(this.#auth, { actor, body });
      case 'post_auth_mfa_recovery_codes_rotate':
        return api.handleAuthRotateRecoveryCodes(this.#auth, { actor });
      case 'post_auth_password_change':
        return api.handleAuthPasswordChange(this.#auth, { actor, body });
      case 'post_auth_password_forgot':
        return api.handleAuthPasswordForgot(this.#auth, { body });
      case 'post_auth_password_reset':
        return api.handleAuthPasswordReset(this.#auth, { body });
      case 'post_auth_email_change':
        return api.handleAuthEmailChange(this.#auth, { actor, body });
      case 'post_auth_email_change_confirm':
        return api.handleAuthEmailChangeConfirm(this.#auth, { actor, body });
      case 'post_auth_email_resend':
        return api.handleAuthEmailResend(this.#auth, { body });
      case 'post_auth_email_verify':
        return api.handleAuthEmailVerify(this.#auth, { body });
      case 'get_auth_mfa_methods':
        return api.handleGetAuthMfaMethods(this.#auth, { actor, query });
      case 'delete_auth_mfa_methods_methodId':
        return api.handleDeleteAuthMfaMethod(this.#auth, {
          actor,
          methodId: p('methodId'),
        });

      default:
        return null;
    }
  }
}
