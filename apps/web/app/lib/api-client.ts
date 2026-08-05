import type {
  Collection,
  NoticeView,
  PreferencesView,
  ProfileView,
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
};
