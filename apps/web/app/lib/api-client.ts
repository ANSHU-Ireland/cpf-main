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
};
