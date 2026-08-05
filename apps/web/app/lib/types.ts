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

/* ── Candidate journey (Wave 4) ───────────────────────────────────────────────────────────── */

export type ApplicationStatus =
  | 'invited'
  | 'scheduled'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'decision_available'
  | 'withdrawn';

/** A human employer decision. Never carries an AI-derived score, rank or recommendation. */
export interface ApplicationDecisionView {
  readonly outcome: string;
  readonly rationale: string;
  readonly decidedBy: string;
  readonly issuedAt: string;
}

export interface CandidateApplicationView {
  readonly id: string;
  readonly employerName: string;
  readonly role: string;
  readonly assessmentTitle: string;
  readonly status: ApplicationStatus;
  readonly invitedAt: string;
  readonly dueAt: string | null;
  readonly decision: ApplicationDecisionView | null;
}

export type AccommodationStatus = 'requested' | 'in_review' | 'approved' | 'declined';

/**
 * Special-category accommodation request. The clinical/detailed basis is never surfaced back to the
 * candidate view beyond their own summary, and never to reviewers — only an approved operational
 * `adjustment` string may be exposed where authorised (invariant §10).
 */
export interface AccommodationView {
  readonly id: string;
  readonly category: string;
  readonly summary: string;
  readonly status: AccommodationStatus;
  readonly submittedAt: string;
  readonly adjustment: string | null;
}

export interface ScheduleSlotView {
  readonly id: string;
  readonly assessmentTitle: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly mode: 'supervised_desktop' | 'remote';
  readonly selected: boolean;
}

export type DataRightsType = 'export' | 'rectification' | 'erasure' | 'restriction';
export type DataRightsStatus = 'received' | 'in_progress' | 'completed' | 'refused';

export interface DataRightsRequestView {
  readonly id: string;
  readonly type: DataRightsType;
  readonly status: DataRightsStatus;
  readonly submittedAt: string;
  readonly note: string | null;
}

export type ComplaintStatus = 'open' | 'acknowledged' | 'resolved';

export interface ComplaintView {
  readonly id: string;
  readonly subject: string;
  readonly status: ComplaintStatus;
  readonly submittedAt: string;
}
