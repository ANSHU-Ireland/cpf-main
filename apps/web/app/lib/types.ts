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

/* ── Assessment runtime (RUN-01 … RUN-13) ─────────────────────────────────────────────────── */

export type AttemptStatus =
  'ready' | 'in_progress' | 'paused' | 'submitting' | 'submitted' | 'expired' | 'voided';

export type TaskKind = 'document' | 'code' | 'sheet';
export type TaskStatus = 'not_started' | 'in_progress' | 'saved' | 'flagged';
export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

/** A single task within an attempt. `response` is the candidate's own work; provenance is tracked. */
export interface AttemptTaskView {
  readonly id: string;
  readonly sectionId: string;
  readonly kind: TaskKind;
  readonly title: string;
  readonly prompt: string;
  readonly status: TaskStatus;
  readonly response: string;
  readonly savedAt: string | null;
  readonly flagged: boolean;
}

export interface AttemptSectionView {
  readonly id: string;
  readonly title: string;
  readonly taskIds: readonly string[];
}

/**
 * A candidate attempt. The timer is server-authoritative: `deadlineAt` and `serverNow` are issued by
 * the server so the client renders remaining time without owning it. No score is ever present here.
 */
export interface AttemptView {
  readonly id: string;
  readonly assessmentTitle: string;
  readonly status: AttemptStatus;
  readonly deadlineAt: string;
  readonly serverNow: string;
  readonly autosave: AutosaveState;
  readonly sections: readonly AttemptSectionView[];
  readonly tasks: readonly AttemptTaskView[];
  readonly submittedAt: string | null;
  readonly receiptRef: string | null;
}

/** A governed AI collaboration message. Always labelled; never yields a score or recommendation. */
export interface AiMessageView {
  readonly id: string;
  readonly role: 'candidate' | 'assistant';
  readonly body: string;
  readonly at: string;
  readonly provenanceRef: string | null;
}

export type PluginRunStatus = 'idle' | 'running' | 'passed' | 'failed';

export interface PluginRunView {
  readonly id: string;
  readonly name: string;
  readonly input: string;
  readonly output: string;
  readonly status: PluginRunStatus;
  readonly ranAt: string;
}

export type ArtifactStatus = 'uploaded' | 'scanning' | 'clean' | 'rejected';

export interface ArtifactView {
  readonly id: string;
  readonly name: string;
  readonly sizeLabel: string;
  readonly status: ArtifactStatus;
  readonly uploadedAt: string;
}

export type BreakStatus = 'none' | 'requested' | 'active';

export interface AttemptControlsView {
  readonly flaggedTaskIds: readonly string[];
  readonly breakStatus: BreakStatus;
  readonly breaksRemaining: number;
}

// ── Reviewer journey ──
// Governing invariant: scoring is HUMAN-ONLY and EVIDENCE-FIRST. AI produces observations that are
// hidden until the reviewer has independently scored, and no AI score/rank/band is ever surfaced.

export type AssignmentStatus =
  'offered' | 'accepted' | 'declined' | 'in_review' | 'submitted' | 'amending';

export type ReviewResponseKind = 'accept' | 'decline' | 'conflict';

/** A reviewer's queue item / assignment. No score is present; reviewers author scores themselves. */
export interface AssignmentView {
  readonly id: string;
  readonly assessmentTitle: string;
  readonly candidateRef: string; // pseudonymous — reviewers never see identifying detail
  readonly status: AssignmentStatus;
  readonly dueAt: string;
  readonly criterionCount: number;
  readonly evidenceCount: number;
  readonly assignedAt: string;
}

export interface ReviewerProfileView {
  readonly displayName: string;
  readonly disciplines: readonly string[];
  readonly biography: string;
}

export type AvailabilityState = 'available' | 'limited' | 'unavailable';

export interface ReviewerAvailabilityView {
  readonly state: AvailabilityState;
  readonly weeklyCapacity: number;
  readonly note: string;
}

export type TrainingStatus = 'not_started' | 'in_progress' | 'complete' | 'expired';

export interface TrainingModuleView {
  readonly id: string;
  readonly title: string;
  readonly status: TrainingStatus;
  readonly required: boolean;
  readonly completedAt: string | null;
}

export type EvidenceItemStatus = 'unreviewed' | 'reviewed';

/** A single piece of candidate evidence. This is candidate work only — never AI-authored content. */
export interface EvidenceItemView {
  readonly id: string;
  readonly title: string;
  readonly kind: TaskKind;
  readonly excerpt: string;
  readonly status: EvidenceItemStatus;
}

export type CriterionState = 'draft' | 'saved' | 'submitted';

/**
 * A scoring criterion. `score`/`rationale` are authored by the reviewer. `aiObservation` is withheld
 * (`revealed=false`) until the reviewer reveals observations after independent scoring.
 */
export interface CriterionView {
  readonly id: string;
  readonly label: string;
  readonly descriptor: string;
  readonly maxScore: number;
  readonly score: number | null;
  readonly rationale: string;
  readonly state: CriterionState;
}

export type ObservationsRevealState = 'concealed' | 'revealed';

/** AI observations for an assignment. Concealed until the reviewer reveals them post-scoring. */
export interface ObservationsView {
  readonly revealState: ObservationsRevealState;
  readonly scoringComplete: boolean; // gate: reveal only permitted once independent scoring is done
  readonly items: readonly ObservationItemView[];
}

export interface ObservationItemView {
  readonly id: string;
  readonly criterionId: string;
  readonly body: string; // descriptive only — never a score, rank or recommendation
  readonly provenanceRef: string;
}

export type IntegrityFlagStatus = 'open' | 'dismissed' | 'upheld';

export interface IntegrityFlagView {
  readonly id: string;
  readonly summary: string;
  readonly status: IntegrityFlagStatus;
  readonly resolution: string;
}

export type ClarificationStatus = 'sent' | 'answered' | 'escalated';

export interface ClarificationView {
  readonly id: string;
  readonly topic: string;
  readonly body: string;
  readonly status: ClarificationStatus;
  readonly at: string;
}

/** Aggregated submission readiness for an assignment. Used by the submit + receipt screens. */
export interface ReviewSubmissionView {
  readonly assignmentId: string;
  readonly allCriteriaScored: boolean;
  readonly evidenceAllReviewed: boolean;
  readonly openIntegrityFlags: number;
  readonly submittedAt: string | null;
  readonly receiptRef: string | null;
}
