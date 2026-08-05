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
};
