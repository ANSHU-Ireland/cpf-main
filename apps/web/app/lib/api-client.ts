import type {
  AccommodationView,
  CandidateApplicationView,
  Collection,
  ComplaintView,
  DataRightsRequestView,
  DataRightsType,
  NoticeView,
  PreferencesView,
  ProfileView,
  ScheduleSlotView,
  SecurityEventView,
  SessionView,
} from './types';
import type {
  AiMessageView,
  ArtifactView,
  AttemptControlsView,
  AttemptView,
  PluginRunView,
} from './types';
import type {
  AssignmentView,
  ClarificationView,
  CriterionView,
  EvidenceItemView,
  IntegrityFlagView,
  ObservationsView,
  ReviewSubmissionView,
  ReviewResponseKind,
  ReviewerAvailabilityView,
  ReviewerProfileView,
  TrainingModuleView,
} from './types';
import type {
  AccommodationRequestView,
  AssignmentBoardItemView,
  CampaignOpsView,
  CampaignView,
  CandidateRecordView,
  ComparisonRowView,
  DecisionApprovalView,
  DecisionDraftView,
  DecisionOutcome,
  DepartmentView,
  EmployerCandidateView,
  EmployerDashboardView,
  EmployerOrgProfileView,
  ImportResultView,
  ImportRowActionView,
  IntegrationView,
  InvitationView,
  MemberView,
  PreflightCheckView,
  ReadinessItemView,
  ReportView,
  ReviewerAdminView,
  ScheduleWindowView,
  StructureView,
  TeamView,
  TemplateView,
} from './types';
import type {
  AccessGrantView,
  AdminDashboardView,
  AdminSupportCaseView,
  AuditEventView,
  FeatureFlagView,
  JobView,
  ReleaseView,
  SubscriptionView,
  TenantDetailView,
  TenantStaffView,
  TenantStatus,
  TenantView,
} from './types';
import type {
  AiEvaluationView,
  AiModelDetailView,
  AiModelStatus,
  AiModelView,
  AssessmentDetailView,
  AssessmentPreviewView,
  AssessmentStatus,
  AssessmentValidationView,
  AssessmentVersionStatus,
  AssessmentVersionView,
  AssessmentView,
  DefectSeverity,
  DefectView,
  PluginView,
  PromptVersionView,
  RiskTier,
} from './types';
import type {
  AiLiteracyView,
  AiSystemView,
  ChangeRequestView,
  ClassificationView,
  ConformityAssessmentView,
  DatasetView,
  DataUseView,
  DeployerInstructionsView,
  EvidenceCollectionView,
  ImpactAssessmentView,
  IncidentSeverity,
  MarketAccessType,
  MarketAccessView,
  OversightPlanView,
  PostMarketPlanView,
  QmsProcedureView,
  RiskView,
  SeriousIncidentView,
  SignalDashboardView,
  SignalPriority,
  SignalType,
  SignalView,
  TechnicalDocView,
  TraceabilityView,
  VendorEvidenceView,
} from './types';
import type {
  ApplicationDetail,
  CandidateProfile,
  CheckStatus,
  IntegrationDelivery,
  JitAccessSession,
  KillSwitchStatus,
  Notice,
  NotificationPreference,
  OperationsDashboard,
  PracticeModule,
  ReviewableDecision,
  SecurityIncident,
  SupportCase,
  SupportCaseDetail,
  SupportTicket,
  SystemCheck,
} from './types';

/** Normalised transport error carrying the HTTP status so screens can branch on 401/403/etc. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Network unavailable. Check your connection and try again.');
  }
  if (!response.ok) {
    const fallback = `Request failed (${String(response.status)}).`;
    let message = fallback;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? fallback;
    } catch {
      /* non-JSON error body; keep fallback */
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const apiClient = {
  getProfile: (): Promise<ProfileView> => request<ProfileView>('/api/account/profile'),
  getPreferences: (): Promise<PreferencesView> =>
    request<PreferencesView>('/api/account/preferences'),
  updatePreferences: (patch: Partial<PreferencesView>): Promise<PreferencesView> =>
    request<PreferencesView>('/api/account/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  getSessions: (): Promise<Collection<SessionView>> =>
    request<Collection<SessionView>>('/api/account/sessions'),
  revokeSession: (id: string): Promise<void> =>
    request<void>(`/api/account/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getSecurityEvents: (): Promise<Collection<SecurityEventView>> =>
    request<Collection<SecurityEventView>>('/api/account/security-events'),
  getNotices: (): Promise<Collection<NoticeView>> =>
    request<Collection<NoticeView>>('/api/account/notices'),
  acknowledgeNotice: (id: string): Promise<NoticeView> =>
    request<NoticeView>(`/api/account/notices/${encodeURIComponent(id)}`, { method: 'POST' }),
  signIn: (email: string, password: string): Promise<{ mfaRequired: boolean }> =>
    request<{ mfaRequired: boolean }>('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // ── Candidate journey ──
  getApplications: (): Promise<Collection<CandidateApplicationView>> =>
    request<Collection<CandidateApplicationView>>('/api/candidate/applications'),
  applicationAction: (
    id: string,
    action: 'withdraw' | 'explanation' | 'human_review',
    reason: string,
  ): Promise<CandidateApplicationView> =>
    request<CandidateApplicationView>(
      `/api/candidate/applications/${encodeURIComponent(id)}/actions`,
      { method: 'POST', body: JSON.stringify({ action, reason }) },
    ),
  getAccommodations: (): Promise<Collection<AccommodationView>> =>
    request<Collection<AccommodationView>>('/api/candidate/accommodations'),
  createAccommodation: (category: string, summary: string): Promise<AccommodationView> =>
    request<AccommodationView>('/api/candidate/accommodations', {
      method: 'POST',
      body: JSON.stringify({ category, summary }),
    }),
  getSchedule: (): Promise<Collection<ScheduleSlotView>> =>
    request<Collection<ScheduleSlotView>>('/api/candidate/schedule'),
  selectSlot: (
    applicationId: string,
    startAt: string,
    endAt: string,
    timezone: string,
  ): Promise<Collection<ScheduleSlotView>> =>
    request<Collection<ScheduleSlotView>>('/api/candidate/schedule', {
      method: 'POST',
      body: JSON.stringify({ applicationId, startAt, endAt, timezone }),
    }),
  getDataRights: (): Promise<Collection<DataRightsRequestView>> =>
    request<Collection<DataRightsRequestView>>('/api/candidate/data-rights'),
  createDataRightsRequest: (type: DataRightsType, note: string): Promise<DataRightsRequestView> =>
    request<DataRightsRequestView>('/api/candidate/data-rights', {
      method: 'POST',
      body: JSON.stringify({ type, note }),
    }),
  getComplaints: (): Promise<Collection<ComplaintView>> =>
    request<Collection<ComplaintView>>('/api/candidate/complaints'),
  createComplaint: (subject: string, detail: string): Promise<ComplaintView> =>
    request<ComplaintView>('/api/candidate/complaints', {
      method: 'POST',
      body: JSON.stringify({ subject, detail }),
    }),

  // ── Assessment runtime ──
  getAttempt: (id: string): Promise<AttemptView> =>
    request<AttemptView>(`/api/candidate/attempt/${encodeURIComponent(id)}`),
  startAttempt: (id: string): Promise<AttemptView> =>
    request<AttemptView>(`/api/candidate/attempt/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
    }),
  saveTask: (id: string, taskId: string, response: string): Promise<AttemptView> =>
    request<AttemptView>(`/api/candidate/attempt/${encodeURIComponent(id)}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ taskId, response }),
    }),
  submitAttempt: (id: string): Promise<AttemptView> =>
    request<AttemptView>(`/api/candidate/attempt/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    }),
  getAiMessages: (id: string): Promise<Collection<AiMessageView>> =>
    request<Collection<AiMessageView>>(`/api/candidate/attempt/${encodeURIComponent(id)}/ai`),
  sendAiMessage: (id: string, body: string): Promise<Collection<AiMessageView>> =>
    request<Collection<AiMessageView>>(`/api/candidate/attempt/${encodeURIComponent(id)}/ai`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  getPluginRuns: (id: string): Promise<Collection<PluginRunView>> =>
    request<Collection<PluginRunView>>(`/api/candidate/attempt/${encodeURIComponent(id)}/plugin`),
  runPlugin: (id: string, name: string, input: string): Promise<PluginRunView> =>
    request<PluginRunView>(`/api/candidate/attempt/${encodeURIComponent(id)}/plugin`, {
      method: 'POST',
      body: JSON.stringify({ name, input }),
    }),
  getArtifacts: (id: string): Promise<Collection<ArtifactView>> =>
    request<Collection<ArtifactView>>(`/api/candidate/attempt/${encodeURIComponent(id)}/artifacts`),
  uploadArtifact: (id: string, name: string, sizeLabel: string): Promise<ArtifactView> =>
    request<ArtifactView>(`/api/candidate/attempt/${encodeURIComponent(id)}/artifacts`, {
      method: 'POST',
      body: JSON.stringify({ name, sizeLabel }),
    }),
  getControls: (id: string): Promise<AttemptControlsView> =>
    request<AttemptControlsView>(`/api/candidate/attempt/${encodeURIComponent(id)}/controls`),
  controlsAction: (
    id: string,
    action: 'flag' | 'break' | 'end_break',
    taskId?: string,
  ): Promise<AttemptControlsView> =>
    request<AttemptControlsView>(`/api/candidate/attempt/${encodeURIComponent(id)}/controls`, {
      method: 'POST',
      body: JSON.stringify({ action, taskId }),
    }),

  // ── Reviewer journey ──
  getAssignments: (): Promise<Collection<AssignmentView>> =>
    request<Collection<AssignmentView>>('/api/review/assignments'),
  getAssignment: (id: string): Promise<AssignmentView> =>
    request<AssignmentView>(`/api/review/assignments/${encodeURIComponent(id)}`),
  respondToAssignment: (
    id: string,
    kind: ReviewResponseKind,
    note: string,
  ): Promise<AssignmentView> =>
    request<AssignmentView>(`/api/review/assignments/${encodeURIComponent(id)}/respond`, {
      method: 'POST',
      body: JSON.stringify({ kind, note }),
    }),
  getReviewerProfile: (): Promise<ReviewerProfileView> =>
    request<ReviewerProfileView>('/api/review/profile'),
  updateReviewerProfile: (patch: Partial<ReviewerProfileView>): Promise<ReviewerProfileView> =>
    request<ReviewerProfileView>('/api/review/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  getAvailability: (): Promise<ReviewerAvailabilityView> =>
    request<ReviewerAvailabilityView>('/api/review/availability'),
  updateAvailability: (
    patch: Partial<ReviewerAvailabilityView>,
  ): Promise<ReviewerAvailabilityView> =>
    request<ReviewerAvailabilityView>('/api/review/availability', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  getTraining: (): Promise<Collection<TrainingModuleView>> =>
    request<Collection<TrainingModuleView>>('/api/review/training'),
  getEvidence: (id: string): Promise<Collection<EvidenceItemView>> =>
    request<Collection<EvidenceItemView>>(
      `/api/review/assignments/${encodeURIComponent(id)}/evidence`,
    ),
  markEvidenceReviewed: (id: string, evidenceId: string): Promise<EvidenceItemView> =>
    request<EvidenceItemView>(`/api/review/assignments/${encodeURIComponent(id)}/evidence`, {
      method: 'POST',
      body: JSON.stringify({ evidenceId }),
    }),
  getScorecard: (id: string): Promise<Collection<CriterionView>> =>
    request<Collection<CriterionView>>(
      `/api/review/assignments/${encodeURIComponent(id)}/scorecard`,
    ),
  saveCriterion: (
    id: string,
    criterionId: string,
    score: number,
    rationale: string,
    evidenceLink: string,
    insufficientEvidence: boolean,
  ): Promise<CriterionView> =>
    request<CriterionView>(`/api/review/assignments/${encodeURIComponent(id)}/scorecard`, {
      method: 'POST',
      body: JSON.stringify({
        criterionId,
        score,
        rationale,
        evidenceLink,
        insufficientEvidence,
      }),
    }),
  getObservations: (id: string): Promise<ObservationsView> =>
    request<ObservationsView>(`/api/review/assignments/${encodeURIComponent(id)}/observations`),
  revealObservations: (id: string): Promise<ObservationsView> =>
    request<ObservationsView>(`/api/review/assignments/${encodeURIComponent(id)}/observations`, {
      method: 'POST',
    }),
  getIntegrityFlags: (id: string): Promise<Collection<IntegrityFlagView>> =>
    request<Collection<IntegrityFlagView>>(
      `/api/review/assignments/${encodeURIComponent(id)}/integrity`,
    ),
  resolveIntegrityFlag: (
    id: string,
    flagId: string,
    status: 'dismissed' | 'upheld',
    resolution: string,
  ): Promise<IntegrityFlagView> =>
    request<IntegrityFlagView>(`/api/review/assignments/${encodeURIComponent(id)}/integrity`, {
      method: 'POST',
      body: JSON.stringify({ flagId, status, resolution }),
    }),
  getClarifications: (id: string): Promise<Collection<ClarificationView>> =>
    request<Collection<ClarificationView>>(
      `/api/review/assignments/${encodeURIComponent(id)}/clarification`,
    ),
  sendClarification: (
    id: string,
    topic: string,
    body: string,
    escalate: boolean,
  ): Promise<ClarificationView> =>
    request<ClarificationView>(`/api/review/assignments/${encodeURIComponent(id)}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ topic, body, escalate }),
    }),
  getReviewSubmission: (id: string): Promise<ReviewSubmissionView> =>
    request<ReviewSubmissionView>(`/api/review/assignments/${encodeURIComponent(id)}/submit`),
  submitReview: (id: string): Promise<ReviewSubmissionView> =>
    request<ReviewSubmissionView>(`/api/review/assignments/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    }),
  amendReview: (id: string, reason: string): Promise<ReviewSubmissionView> =>
    request<ReviewSubmissionView>(`/api/review/assignments/${encodeURIComponent(id)}/amend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // ── Employer admin journey ──
  getEmployerDashboard: (): Promise<EmployerDashboardView> =>
    request<EmployerDashboardView>('/api/employer/dashboard'),
  getEmployerOrg: (): Promise<EmployerOrgProfileView> =>
    request<EmployerOrgProfileView>('/api/employer/organization'),
  updateEmployerOrg: (patch: Partial<EmployerOrgProfileView>): Promise<EmployerOrgProfileView> =>
    request<EmployerOrgProfileView>('/api/employer/organization', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  getMembers: (): Promise<Collection<MemberView>> =>
    request<Collection<MemberView>>('/api/employer/members'),
  inviteMember: (email: string, role: string): Promise<MemberView> =>
    request<MemberView>('/api/employer/members', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  getStructure: (): Promise<StructureView> => request<StructureView>('/api/employer/structure'),
  addDepartment: (name: string): Promise<DepartmentView> =>
    request<DepartmentView>('/api/employer/structure', {
      method: 'POST',
      body: JSON.stringify({ kind: 'department', name }),
    }),
  addTeam: (name: string, departmentId: string): Promise<TeamView> =>
    request<TeamView>('/api/employer/structure', {
      method: 'POST',
      body: JSON.stringify({ kind: 'team', name, departmentId }),
    }),
  getCampaigns: (): Promise<Collection<CampaignView>> =>
    request<Collection<CampaignView>>('/api/employer/campaigns'),
  createCampaign: (name: string, roleTitle: string): Promise<CampaignView> =>
    request<CampaignView>('/api/employer/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name, roleTitle }),
    }),
  getCampaign: (id: string): Promise<CampaignView> =>
    request<CampaignView>(`/api/employer/campaigns/${encodeURIComponent(id)}`),
  setCampaignStatus: (id: string, status: CampaignView['status']): Promise<CampaignView> =>
    request<CampaignView>(`/api/employer/campaigns/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  getPreflight: (id: string): Promise<Collection<PreflightCheckView>> =>
    request<Collection<PreflightCheckView>>(
      `/api/employer/campaigns/${encodeURIComponent(id)}/preflight`,
    ),
  resolvePreflight: (id: string, checkId: string): Promise<PreflightCheckView> =>
    request<PreflightCheckView>(`/api/employer/campaigns/${encodeURIComponent(id)}/preflight`, {
      method: 'POST',
      body: JSON.stringify({ checkId }),
    }),
  getCampaignOps: (id: string): Promise<CampaignOpsView> =>
    request<CampaignOpsView>(`/api/employer/campaigns/${encodeURIComponent(id)}/dashboard`),
  getComparison: (id: string): Promise<Collection<ComparisonRowView>> =>
    request<Collection<ComparisonRowView>>(
      `/api/employer/campaigns/${encodeURIComponent(id)}/comparison`,
    ),
  getEmployerCandidates: (): Promise<Collection<EmployerCandidateView>> =>
    request<Collection<EmployerCandidateView>>('/api/employer/candidates'),
  addEmployerCandidate: (
    displayName: string,
    campaignName: string,
  ): Promise<EmployerCandidateView> =>
    request<EmployerCandidateView>('/api/employer/candidates', {
      method: 'POST',
      body: JSON.stringify({ displayName, campaignName }),
    }),
  getEmployerCandidate: (id: string): Promise<CandidateRecordView> =>
    request<CandidateRecordView>(`/api/employer/candidates/${encodeURIComponent(id)}`),
  mergeCandidate: (id: string, duplicateId: string): Promise<CandidateRecordView> =>
    request<CandidateRecordView>(`/api/employer/candidates/${encodeURIComponent(id)}/merge`, {
      method: 'POST',
      body: JSON.stringify({ duplicateId }),
    }),
  validateImport: (
    rowText: string,
    campaignId: string,
    fileName: string,
  ): Promise<ImportResultView> =>
    request<ImportResultView>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'validate', rowText, campaignId, fileName }),
    }),
  updateImportRow: (
    importId: string,
    rowId: string,
    action: ImportRowActionView,
    value?: string,
  ): Promise<ImportResultView> =>
    request<ImportResultView>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'update', importId, rowId, action, value }),
    }),
  commitImport: (importId: string): Promise<ImportResultView> =>
    request<ImportResultView>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'commit', importId }),
    }),
  cancelImport: (importId: string): Promise<void> =>
    request<void>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'cancel', importId }),
    }),
  getInvitations: (): Promise<Collection<InvitationView>> =>
    request<Collection<InvitationView>>('/api/employer/invitations'),
  sendInvitation: (email: string, campaignName: string): Promise<InvitationView> =>
    request<InvitationView>('/api/employer/invitations', {
      method: 'POST',
      body: JSON.stringify({ email, campaignName }),
    }),
  getScheduleWindows: (): Promise<Collection<ScheduleWindowView>> =>
    request<Collection<ScheduleWindowView>>('/api/employer/scheduling'),
  addScheduleWindow: (label: string, capacity: number): Promise<ScheduleWindowView> =>
    request<ScheduleWindowView>('/api/employer/scheduling', {
      method: 'POST',
      body: JSON.stringify({ label, capacity }),
    }),
  getEmployerAccommodations: (): Promise<Collection<AccommodationRequestView>> =>
    request<Collection<AccommodationRequestView>>('/api/employer/accommodations'),
  decideAccommodation: (
    id: string,
    status: 'approved' | 'declined' | 'more_info',
  ): Promise<AccommodationRequestView> =>
    request<AccommodationRequestView>('/api/employer/accommodations', {
      method: 'POST',
      body: JSON.stringify({ id, status }),
    }),
  getEmployerReviewers: (): Promise<Collection<ReviewerAdminView>> =>
    request<Collection<ReviewerAdminView>>('/api/employer/reviewers'),
  inviteReviewer: (name: string, discipline: string): Promise<ReviewerAdminView> =>
    request<ReviewerAdminView>('/api/employer/reviewers', {
      method: 'POST',
      body: JSON.stringify({ name, discipline }),
    }),
  getAssignmentBoard: (): Promise<Collection<AssignmentBoardItemView>> =>
    request<Collection<AssignmentBoardItemView>>('/api/employer/assignments'),
  assignReviewer: (id: string, reviewerName: string): Promise<AssignmentBoardItemView> =>
    request<AssignmentBoardItemView>('/api/employer/assignments', {
      method: 'POST',
      body: JSON.stringify({ id, reviewerName }),
    }),
  getDecision: (id: string): Promise<DecisionDraftView> =>
    request<DecisionDraftView>(`/api/employer/applications/${encodeURIComponent(id)}/decision`),
  saveDecision: (
    id: string,
    outcome: DecisionOutcome,
    rationale: string,
    evidenceLinks: readonly string[] = [],
  ): Promise<DecisionDraftView> =>
    request<DecisionDraftView>(`/api/employer/applications/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ outcome, rationale, evidenceLinks }),
    }),
  getApproval: (id: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`),
  approveDecision: (id: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    }),
  returnDecision: (id: string, rationale: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'return', rationale }),
    }),
  getReports: (): Promise<Collection<ReportView>> =>
    request<Collection<ReportView>>('/api/employer/reports'),
  generateReport: (name: string, kind: string): Promise<ReportView> =>
    request<ReportView>('/api/employer/reports', {
      method: 'POST',
      body: JSON.stringify({ name, kind }),
    }),
  getIntegrations: (): Promise<Collection<IntegrationView>> =>
    request<Collection<IntegrationView>>('/api/employer/integrations'),
  addIntegration: (name: string, kind: string, endpoint: string): Promise<IntegrationView> =>
    request<IntegrationView>('/api/employer/integrations', {
      method: 'POST',
      body: JSON.stringify({ name, kind, endpoint }),
    }),
  getTemplates: (): Promise<Collection<TemplateView>> =>
    request<Collection<TemplateView>>('/api/employer/templates'),
  createTemplate: (name: string, subject: string): Promise<TemplateView> =>
    request<TemplateView>('/api/employer/templates', {
      method: 'POST',
      body: JSON.stringify({ name, subject }),
    }),
  getReadiness: (): Promise<Collection<ReadinessItemView>> =>
    request<Collection<ReadinessItemView>>('/api/employer/readiness'),
  resolveReadiness: (itemId: string): Promise<ReadinessItemView> =>
    request<ReadinessItemView>('/api/employer/readiness', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  // ── Platform admin journey (CPF Super Admin) ──
  getAdminDashboard: (): Promise<AdminDashboardView> =>
    request<AdminDashboardView>('/api/admin/dashboard'),

  getTenants: (): Promise<Collection<TenantView>> =>
    request<Collection<TenantView>>('/api/admin/tenants'),
  createTenant: (name: string, slug: string, dataRegion: string): Promise<TenantView> =>
    request<TenantView>('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify({ name, slug, dataRegion }),
    }),
  getTenant: (id: string): Promise<TenantDetailView> =>
    request<TenantDetailView>(`/api/admin/tenants/${id}`),
  setTenantStatus: (id: string, status: TenantStatus): Promise<TenantDetailView> =>
    request<TenantDetailView>(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getTenantStaff: (id: string): Promise<Collection<TenantStaffView>> =>
    request<Collection<TenantStaffView>>(`/api/admin/tenants/${id}/staff`),
  inviteStaff: (id: string, email: string, role: string): Promise<TenantStaffView> =>
    request<TenantStaffView>(`/api/admin/tenants/${id}/staff`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  getSubscription: (id: string): Promise<SubscriptionView> =>
    request<SubscriptionView>(`/api/admin/tenants/${id}/subscription`),
  updateSubscription: (id: string, plan: string): Promise<SubscriptionView> =>
    request<SubscriptionView>(`/api/admin/tenants/${id}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    }),

  getFeatureFlags: (): Promise<Collection<FeatureFlagView>> =>
    request<Collection<FeatureFlagView>>('/api/admin/feature-flags'),
  createFeatureFlag: (key: string, description: string): Promise<FeatureFlagView> =>
    request<FeatureFlagView>('/api/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify({ key, description }),
    }),
  toggleFeatureFlag: (id: string): Promise<FeatureFlagView> =>
    request<FeatureFlagView>('/api/admin/feature-flags', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    }),

  getJobs: (): Promise<Collection<JobView>> => request<Collection<JobView>>('/api/admin/jobs'),
  actOnJob: (id: string, action: 'retry' | 'cancel'): Promise<JobView> =>
    request<JobView>('/api/admin/jobs', {
      method: 'POST',
      body: JSON.stringify({ id, action }),
    }),

  getAuditEvents: (): Promise<Collection<AuditEventView>> =>
    request<Collection<AuditEventView>>('/api/admin/audit'),

  getReleases: (): Promise<Collection<ReleaseView>> =>
    request<Collection<ReleaseView>>('/api/admin/releases'),
  scheduleRelease: (description: string, startsAt: string, endsAt: string): Promise<ReleaseView> =>
    request<ReleaseView>('/api/admin/releases', {
      method: 'POST',
      body: JSON.stringify({ description, startsAt, endsAt }),
    }),

  getSupportCases: (): Promise<Collection<AdminSupportCaseView>> =>
    request<Collection<AdminSupportCaseView>>('/api/admin/support'),
  assignSupportCase: (id: string, assignee: string): Promise<AdminSupportCaseView> =>
    request<AdminSupportCaseView>('/api/admin/support', {
      method: 'POST',
      body: JSON.stringify({ id, assignee }),
    }),

  getAccessGrants: (): Promise<Collection<AccessGrantView>> =>
    request<Collection<AccessGrantView>>('/api/admin/privileged-access'),
  requestAccessGrant: (scope: string, justification: string): Promise<AccessGrantView> =>
    request<AccessGrantView>('/api/admin/privileged-access', {
      method: 'POST',
      body: JSON.stringify({ scope, justification }),
    }),
  actOnAccessGrant: (id: string, action: 'approve' | 'revoke'): Promise<AccessGrantView> =>
    request<AccessGrantView>('/api/admin/privileged-access', {
      method: 'PATCH',
      body: JSON.stringify({ id, action }),
    }),

  // ── Assessment governance journey ──
  getAssessments: (): Promise<Collection<AssessmentView>> =>
    request<Collection<AssessmentView>>('/api/admin/assessments'),
  createAssessment: (
    name: string,
    roleFamily: string,
    seniority: string,
    riskTier: RiskTier,
  ): Promise<AssessmentView> =>
    request<AssessmentView>('/api/admin/assessments', {
      method: 'POST',
      body: JSON.stringify({ name, roleFamily, seniority, riskTier }),
    }),
  getAssessment: (id: string): Promise<AssessmentDetailView> =>
    request<AssessmentDetailView>(`/api/admin/assessments/${id}`),
  setAssessmentStatus: (id: string, status: AssessmentStatus): Promise<AssessmentDetailView> =>
    request<AssessmentDetailView>(`/api/admin/assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  saveAssessmentVersion: (
    id: string,
    label: string,
    rationale: string,
  ): Promise<AssessmentVersionView> =>
    request<AssessmentVersionView>(`/api/admin/assessments/${id}/version`, {
      method: 'POST',
      body: JSON.stringify({ label, rationale }),
    }),
  setVersionStatus: (
    id: string,
    versionId: string,
    status: AssessmentVersionStatus,
  ): Promise<AssessmentVersionView> =>
    request<AssessmentVersionView>(`/api/admin/assessments/${id}/version`, {
      method: 'PATCH',
      body: JSON.stringify({ versionId, status }),
    }),

  getAssessmentPreview: (id: string): Promise<AssessmentPreviewView> =>
    request<AssessmentPreviewView>(`/api/admin/assessments/${id}/preview`),

  getAssessmentValidation: (id: string): Promise<AssessmentValidationView> =>
    request<AssessmentValidationView>(`/api/admin/assessments/${id}/validation`),
  resolveValidation: (
    id: string,
    outcome: string,
    rationale: string,
  ): Promise<AssessmentValidationView> =>
    request<AssessmentValidationView>(`/api/admin/assessments/${id}/validation`, {
      method: 'POST',
      body: JSON.stringify({ outcome, rationale }),
    }),

  getDefects: (): Promise<Collection<DefectView>> =>
    request<Collection<DefectView>>('/api/admin/assessments/defects'),
  logDefect: (title: string, severity: DefectSeverity, scope: string): Promise<DefectView> =>
    request<DefectView>('/api/admin/assessments/defects', {
      method: 'POST',
      body: JSON.stringify({ title, severity, scope }),
    }),

  getAiModels: (): Promise<Collection<AiModelView>> =>
    request<Collection<AiModelView>>('/api/admin/ai-models'),
  registerAiModel: (
    name: string,
    provider: string,
    modelKey: string,
    modelVersion: string,
    useCase: string,
    limitations: string,
  ): Promise<AiModelView> =>
    request<AiModelView>('/api/admin/ai-models', {
      method: 'POST',
      body: JSON.stringify({ name, provider, modelKey, modelVersion, useCase, limitations }),
    }),
  getAiModel: (id: string): Promise<AiModelDetailView> =>
    request<AiModelDetailView>(`/api/admin/ai-models/${id}`),
  setAiModelStatus: (id: string, status: AiModelStatus): Promise<AiModelDetailView> =>
    request<AiModelDetailView>(`/api/admin/ai-models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getAiEvaluation: (id: string): Promise<AiEvaluationView> =>
    request<AiEvaluationView>(`/api/admin/ai-models/${id}/evaluation`),
  recordEvaluation: (id: string, outcome: string, rationale: string): Promise<AiEvaluationView> =>
    request<AiEvaluationView>(`/api/admin/ai-models/${id}/evaluation`, {
      method: 'POST',
      body: JSON.stringify({ outcome, rationale }),
    }),

  getPromptVersions: (): Promise<Collection<PromptVersionView>> =>
    request<Collection<PromptVersionView>>('/api/admin/prompts'),
  createPromptVersion: (
    promptCode: string,
    purpose: string,
    body: string,
  ): Promise<PromptVersionView> =>
    request<PromptVersionView>('/api/admin/prompts', {
      method: 'POST',
      body: JSON.stringify({ promptCode, purpose, body }),
    }),

  getPlugins: (): Promise<Collection<PluginView>> =>
    request<Collection<PluginView>>('/api/admin/plugins'),
  registerPlugin: (
    code: string,
    provider: string,
    name: string,
    version: string,
    capabilities: readonly string[],
    dataScope: string,
  ): Promise<PluginView> =>
    request<PluginView>('/api/admin/plugins', {
      method: 'POST',
      body: JSON.stringify({ code, provider, name, version, capabilities, dataScope }),
    }),

  // ── Governance & Audit methods (GOV-01..18, AUD-01..02) ─────────────────────────────────────

  // GOV-01: AI Systems
  getAiSystems: (): Promise<Collection<AiSystemView>> =>
    request<Collection<AiSystemView>>('/api/governance/ai-systems'),
  registerAiSystem: (
    systemCode: string,
    name: string,
    providerLegalName: string,
    intendedPurpose: string,
    version: string,
  ): Promise<AiSystemView> =>
    request<AiSystemView>('/api/governance/ai-systems', {
      method: 'POST',
      body: JSON.stringify({ systemCode, name, providerLegalName, intendedPurpose, version }),
    }),

  // GOV-02: AI Act Classification
  getClassification: (systemId: string): Promise<ClassificationView> =>
    request<ClassificationView>(`/api/governance/classifications/${systemId}`),
  recordClassification: (
    systemId: string,
    role: string,
    intendedPurpose: string,
    classification: string,
    reasoning: string,
  ): Promise<ClassificationView> =>
    request<ClassificationView>('/api/governance/classifications', {
      method: 'POST',
      body: JSON.stringify({ systemId, role, intendedPurpose, classification, reasoning }),
    }),

  // GOV-03: Risks
  getRisks: (): Promise<Collection<RiskView>> =>
    request<Collection<RiskView>>('/api/governance/risks'),
  updateRisk: (
    title: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    controls: string,
    residual: string,
  ): Promise<RiskView> =>
    request<RiskView>('/api/governance/risks', {
      method: 'POST',
      body: JSON.stringify({ title, riskLevel, controls, residual }),
    }),

  // GOV-04: Datasets
  getDatasets: (): Promise<Collection<DatasetView>> =>
    request<Collection<DatasetView>>('/api/governance/datasets'),
  registerDataset: (
    name: string,
    provenance: string,
    lawfulBasis: string,
    representativeness: string,
  ): Promise<DatasetView> =>
    request<DatasetView>('/api/governance/datasets', {
      method: 'POST',
      body: JSON.stringify({ name, provenance, lawfulBasis, representativeness }),
    }),

  // GOV-05: Technical Documentation
  getTechnicalDocs: (): Promise<Collection<TechnicalDocView>> =>
    request<Collection<TechnicalDocView>>('/api/governance/technical-docs'),
  createTechnicalDocVersion: (systemId: string, version: string): Promise<TechnicalDocView> =>
    request<TechnicalDocView>('/api/governance/technical-docs', {
      method: 'POST',
      body: JSON.stringify({ systemId, version }),
    }),

  // GOV-06: QMS Procedures
  getQmsProcedures: (): Promise<Collection<QmsProcedureView>> =>
    request<Collection<QmsProcedureView>>('/api/governance/qms'),
  addQmsProcedure: (title: string, policy: string): Promise<QmsProcedureView> =>
    request<QmsProcedureView>('/api/governance/qms', {
      method: 'POST',
      body: JSON.stringify({ title, policy }),
    }),

  // GOV-07: Data Use
  getDataUse: (): Promise<Collection<DataUseView>> =>
    request<Collection<DataUseView>>('/api/governance/data-use'),
  addDataUsePurpose: (
    purpose: string,
    lawfulBasis: string,
    categories: string,
    recipients: string,
    retention: string,
  ): Promise<DataUseView> =>
    request<DataUseView>('/api/governance/data-use', {
      method: 'POST',
      body: JSON.stringify({ purpose, lawfulBasis, categories, recipients, retention }),
    }),

  // GOV-08: Impact Assessment
  getImpactAssessment: (systemId: string): Promise<ImpactAssessmentView> =>
    request<ImpactAssessmentView>(`/api/governance/impact-assessments/${systemId}`),
  recordImpactAssessment: (
    systemId: string,
    assessmentType: 'DPIA' | 'FundamentalRights',
    outcome: string,
    rationale: string,
  ): Promise<ImpactAssessmentView> =>
    request<ImpactAssessmentView>('/api/governance/impact-assessments', {
      method: 'POST',
      body: JSON.stringify({ systemId, assessmentType, outcome, rationale }),
    }),

  // GOV-09: Oversight Plan
  getOversightPlan: (systemId: string): Promise<OversightPlanView> =>
    request<OversightPlanView>(`/api/governance/oversight/${systemId}`),
  approveOversightPlan: (
    systemId: string,
    authority: string,
    competency: string,
    stoppingRules: string,
    outcome: string,
    rationale: string,
  ): Promise<OversightPlanView> =>
    request<OversightPlanView>('/api/governance/oversight', {
      method: 'POST',
      body: JSON.stringify({ systemId, authority, competency, stoppingRules, outcome, rationale }),
    }),

  // GOV-10: Deployer Instructions
  getDeployerInstructions: (): Promise<Collection<DeployerInstructionsView>> =>
    request<Collection<DeployerInstructionsView>>('/api/governance/deployer-instructions'),
  publishDeployerInstructions: (
    systemId: string,
    version: string,
    limitations: string,
    oversight: string,
  ): Promise<DeployerInstructionsView> =>
    request<DeployerInstructionsView>('/api/governance/deployer-instructions', {
      method: 'POST',
      body: JSON.stringify({ systemId, version, limitations, oversight }),
    }),

  // GOV-11: AI Literacy
  getAiLiteracy: (): Promise<Collection<AiLiteracyView>> =>
    request<Collection<AiLiteracyView>>('/api/governance/ai-literacy'),
  assignTraining: (
    role: string,
    trainingModule: string,
    assignee: string,
  ): Promise<AiLiteracyView> =>
    request<AiLiteracyView>('/api/governance/ai-literacy', {
      method: 'POST',
      body: JSON.stringify({ role, trainingModule, assignee }),
    }),

  // GOV-12: Conformity Assessment
  getConformityAssessment: (systemId: string): Promise<ConformityAssessmentView> =>
    request<ConformityAssessmentView>(`/api/governance/conformity/${systemId}`),
  submitConformityAssessment: (
    systemId: string,
    requirements: string,
    tests: string,
    gaps: string,
    outcome: string,
    rationale: string,
  ): Promise<ConformityAssessmentView> =>
    request<ConformityAssessmentView>('/api/governance/conformity', {
      method: 'POST',
      body: JSON.stringify({ systemId, requirements, tests, gaps, outcome, rationale }),
    }),

  // GOV-13: Market Access
  getMarketAccess: (): Promise<Collection<MarketAccessView>> =>
    request<Collection<MarketAccessView>>('/api/governance/market-access'),
  recordMarketAccess: (
    systemId: string,
    accessType: MarketAccessType,
    evidence: string,
  ): Promise<MarketAccessView> =>
    request<MarketAccessView>('/api/governance/market-access', {
      method: 'POST',
      body: JSON.stringify({ systemId, accessType, evidence }),
    }),

  // GOV-14: Post-Market Plan
  getPostMarketPlan: (systemId: string): Promise<PostMarketPlanView> =>
    request<PostMarketPlanView>(`/api/governance/post-market/${systemId}`),
  approvePostMarketPlan: (
    systemId: string,
    metrics: string,
    thresholds: string,
    reviewCadence: string,
    outcome: string,
    rationale: string,
  ): Promise<PostMarketPlanView> =>
    request<PostMarketPlanView>('/api/governance/post-market', {
      method: 'POST',
      body: JSON.stringify({ systemId, metrics, thresholds, reviewCadence, outcome, rationale }),
    }),

  // GOV-15: Signals Dashboard
  getSignalsDashboard: (): Promise<SignalDashboardView> =>
    request<SignalDashboardView>('/api/governance/signals'),
  createSignal: (
    type: SignalType,
    priority: SignalPriority,
    description: string,
  ): Promise<SignalView> =>
    request<SignalView>('/api/governance/signals', {
      method: 'POST',
      body: JSON.stringify({ type, priority, description }),
    }),

  // GOV-16: Serious Incidents
  getIncidents: (): Promise<Collection<SeriousIncidentView>> =>
    request<Collection<SeriousIncidentView>>('/api/governance/incidents'),
  escalateIncident: (
    title: string,
    severity: IncidentSeverity,
    contained: boolean,
    notified: boolean,
  ): Promise<SeriousIncidentView> =>
    request<SeriousIncidentView>('/api/governance/incidents', {
      method: 'POST',
      body: JSON.stringify({ title, severity, contained, notified }),
    }),

  // GOV-17: Vendor Evidence
  getVendorEvidence: (): Promise<Collection<VendorEvidenceView>> =>
    request<Collection<VendorEvidenceView>>('/api/governance/vendors'),
  requestVendorEvidence: (vendor: string, obligation: string): Promise<VendorEvidenceView> =>
    request<VendorEvidenceView>('/api/governance/vendors', {
      method: 'POST',
      body: JSON.stringify({ vendor, obligation }),
    }),

  // GOV-18: Change Requests
  getChangeRequests: (): Promise<Collection<ChangeRequestView>> =>
    request<Collection<ChangeRequestView>>('/api/governance/changes'),
  submitChangeRequest: (
    title: string,
    significance: 'minor' | 'major' | 'substantial',
    affectedControls: string,
  ): Promise<ChangeRequestView> =>
    request<ChangeRequestView>('/api/governance/changes', {
      method: 'POST',
      body: JSON.stringify({ title, significance, affectedControls }),
    }),
  recordChangeDecision: (
    id: string,
    outcome: string,
    rationale: string,
  ): Promise<ChangeRequestView> =>
    request<ChangeRequestView>(`/api/governance/changes/${id}`, {
      method: 'POST',
      body: JSON.stringify({ outcome, rationale }),
    }),

  // AUD-01: Evidence Collections
  getEvidenceCollections: (): Promise<Collection<EvidenceCollectionView>> =>
    request<Collection<EvidenceCollectionView>>('/api/audit/evidence'),
  createEvidenceCollection: (title: string, purpose: string): Promise<EvidenceCollectionView> =>
    request<EvidenceCollectionView>('/api/audit/evidence', {
      method: 'POST',
      body: JSON.stringify({ title, purpose }),
    }),

  // AUD-02: Traceability
  getTraceability: (): Promise<Collection<TraceabilityView>> =>
    request<Collection<TraceabilityView>>('/api/audit/traceability'),

  // ACC-02: Notification preferences
  getNotificationPreferences: (): Promise<Collection<NotificationPreference>> =>
    request<Collection<NotificationPreference>>('/api/account/notifications'),
  updateNotificationPreferences: (
    updates: Array<{ channel: string; category: string; enabled: boolean }>,
  ): Promise<void> =>
    request<void>('/api/account/notifications', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }),

  // CAN-02: Candidate profile
  getCandidateProfile: (): Promise<CandidateProfile> =>
    request<CandidateProfile>('/api/candidate/profile'),
  submitProfileCorrection: (correction: {
    field: string;
    currentValue: string;
    correctedValue: string;
    reason: string;
  }): Promise<void> =>
    request<void>('/api/candidate/profile/corrections', {
      method: 'POST',
      body: JSON.stringify(correction),
    }),

  // CAN-03: Notices
  getCandidateNotices: (): Promise<{ notices: Notice[]; allAcknowledged: boolean }> =>
    request<{ notices: Notice[]; allAcknowledged: boolean }>('/api/candidate/notices'),
  acknowledgeCandidateNotice: (noticeId: string): Promise<void> =>
    request<void>(`/api/candidate/notices/${noticeId}`, {
      method: 'POST',
    }),

  // CAN-06: Practice centre
  getPracticeModules: (): Promise<{ modules: PracticeModule[] }> =>
    request<{ modules: PracticeModule[] }>('/api/candidate/practice'),

  // CAN-07: System pre-check
  getSystemChecks: (): Promise<{ checks: SystemCheck[]; overallStatus: CheckStatus }> =>
    request<{ checks: SystemCheck[]; overallStatus: CheckStatus }>('/api/candidate/precheck'),
  runSystemChecks: (): Promise<{ checks: SystemCheck[]; overallStatus: CheckStatus }> =>
    request<{ checks: SystemCheck[]; overallStatus: CheckStatus }>('/api/candidate/precheck', {
      method: 'POST',
    }),

  // CAN-09: Withdraw application
  getApplicationDetail: (id: string): Promise<ApplicationDetail> =>
    request<ApplicationDetail>(`/api/candidate/applications/${id}`),
  withdrawApplication: (id: string): Promise<void> =>
    request<void>(`/api/candidate/applications/${id}/withdraw`, {
      method: 'POST',
    }),

  // CAN-10: Review request
  getReviewableDecisions: (): Promise<{ decisions: ReviewableDecision[] }> =>
    request<{ decisions: ReviewableDecision[] }>('/api/candidate/review-requests'),
  requestHumanReview: (decisionId: string, grounds: string): Promise<void> =>
    request<void>('/api/candidate/review-requests', {
      method: 'POST',
      body: JSON.stringify({ decisionId, grounds }),
    }),

  // CAN-13: Candidate support
  getCandidateTickets: (): Promise<Collection<SupportTicket>> =>
    request<Collection<SupportTicket>>('/api/candidate/support'),
  createCandidateTicket: (ticket: {
    subject: string;
    category: string;
    description: string;
  }): Promise<SupportTicket> =>
    request<SupportTicket>('/api/candidate/support', {
      method: 'POST',
      body: JSON.stringify(ticket),
    }),

  // SUP-01: Support queue
  getSupportQueue: (): Promise<Collection<SupportCase>> =>
    request<Collection<SupportCase>>('/api/support/queue'),

  // SUP-02: Support case workspace
  getSupportCase: (id: string): Promise<SupportCaseDetail> =>
    request<SupportCaseDetail>(`/api/support/cases/${id}`),
  addSupportMessage: (caseId: string, content: string, internal: boolean): Promise<void> =>
    request<void>(`/api/support/cases/${caseId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, internal }),
    }),
  updateSupportCaseStatus: (caseId: string, status: string): Promise<void> =>
    request<void>(`/api/support/cases/${caseId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // SUP-03: JIT access
  getJitAccessSessions: (): Promise<{ sessions: JitAccessSession[] }> =>
    request<{ sessions: JitAccessSession[] }>('/api/support/jit-access'),
  requestJitAccess: (scope: string, justification: string): Promise<void> =>
    request<void>('/api/support/jit-access', {
      method: 'POST',
      body: JSON.stringify({ scope, justification }),
    }),
  revokeJitAccess: (sessionId: string): Promise<void> =>
    request<void>(`/api/support/jit-access/${sessionId}/revoke`, {
      method: 'POST',
    }),

  // OPS-01: Operations dashboard
  getOperationsDashboard: (): Promise<OperationsDashboard> =>
    request<OperationsDashboard>('/api/operations/dashboard'),
  acknowledgeOperationalAlert: (alertId: string): Promise<void> =>
    request<void>(`/api/operations/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    }),

  // OPS-02: Security incident
  getSecurityStatus: (): Promise<{ incidents: SecurityIncident[]; killSwitch: KillSwitchStatus }> =>
    request<{ incidents: SecurityIncident[]; killSwitch: KillSwitchStatus }>(
      '/api/operations/security',
    ),
  activateKillSwitch: (reason: string): Promise<void> =>
    request<void>('/api/operations/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deactivateKillSwitch: (): Promise<void> =>
    request<void>('/api/operations/kill-switch', {
      method: 'DELETE',
    }),
  escalateSecurityIncident: (incidentId: string): Promise<void> =>
    request<void>(`/api/operations/incidents/${incidentId}/escalate`, {
      method: 'POST',
    }),

  // OPS-03: Integration deliveries
  getIntegrationDeliveries: (): Promise<Collection<IntegrationDelivery>> =>
    request<Collection<IntegrationDelivery>>('/api/operations/deliveries'),
  retryIntegrationDelivery: (deliveryId: string): Promise<void> =>
    request<void>(`/api/operations/deliveries/${deliveryId}/retry`, {
      method: 'POST',
    }),
};
