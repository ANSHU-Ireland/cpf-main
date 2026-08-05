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
  selectSlot: (slotId: string): Promise<Collection<ScheduleSlotView>> =>
    request<Collection<ScheduleSlotView>>('/api/candidate/schedule', {
      method: 'POST',
      body: JSON.stringify({ slotId }),
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
  ): Promise<CriterionView> =>
    request<CriterionView>(`/api/review/assignments/${encodeURIComponent(id)}/scorecard`, {
      method: 'POST',
      body: JSON.stringify({ criterionId, score, rationale }),
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
  validateImport: (rowText: string): Promise<ImportResultView> =>
    request<ImportResultView>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'validate', rowText }),
    }),
  commitImport: (rowText: string): Promise<ImportResultView> =>
    request<ImportResultView>('/api/employer/candidates/import', {
      method: 'POST',
      body: JSON.stringify({ stage: 'commit', rowText }),
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
  ): Promise<DecisionDraftView> =>
    request<DecisionDraftView>(`/api/employer/applications/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ outcome, rationale }),
    }),
  getApproval: (id: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`),
  approveDecision: (id: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    }),
  returnDecision: (id: string): Promise<DecisionApprovalView> =>
    request<DecisionApprovalView>(`/api/employer/applications/${encodeURIComponent(id)}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'return' }),
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
  createTenant: (name: string, slug: string): Promise<TenantView> =>
    request<TenantView>('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
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
  updateSubscription: (id: string, plan: string, seatsLimit: number): Promise<SubscriptionView> =>
    request<SubscriptionView>(`/api/admin/tenants/${id}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ plan, seatsLimit }),
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
  scheduleRelease: (title: string, kind: 'maintenance' | 'release'): Promise<ReleaseView> =>
    request<ReleaseView>('/api/admin/releases', {
      method: 'POST',
      body: JSON.stringify({ title, kind }),
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
};
