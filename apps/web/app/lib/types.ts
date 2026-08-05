/**
 * View-model types shared by the client screens and the Next route handlers that serve synthetic
 * data. These are presentation projections; the authoritative domain DTOs live in the `@cpf/*`
 * packages and will replace the synthetic source when the API adapter is wired.
 */

export interface ProfileView {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly userType: string;
  readonly status: string;
  readonly tenant: {
    readonly tenantId: string;
    readonly tenantName: string;
    readonly membershipStatus: string;
    readonly roles: readonly string[];
  } | null;
}

export type ThemePreference = 'system' | 'light' | 'dark' | 'high_contrast';
export type DensityPreference = 'comfortable' | 'compact';

export interface PreferencesView {
  readonly theme: ThemePreference;
  readonly density: DensityPreference;
  readonly locale: string;
  readonly timezone: string;
  readonly reducedMotion: boolean;
}

export interface SessionView {
  readonly id: string;
  readonly device: string;
  readonly location: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly current: boolean;
}

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityEventView {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly severity: SecuritySeverity;
}

export interface NoticeView {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly publishedAt: string;
  readonly acknowledged: boolean;
}

export interface Collection<T> {
  readonly items: readonly T[];
  readonly total: number;
}
