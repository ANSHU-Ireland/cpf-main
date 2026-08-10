/**
 * View-model types shared by the client screens and the Next route handlers that serve synthetic
 * data. These are presentation projections; the authoritative domain DTOs live in the `@cpf/*`
 * packages and will replace the synthetic source when the API adapter is wired.
 */

export type { BadgeTone } from '../components/StatusBadge';

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
  /** Optimistic-concurrency revision returned by the server. */
  readonly version: number;
  /** Short, display-safe projection of the authoritative response checksum. */
  readonly checksum: string;
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
  readonly version: number;
  readonly sourceLabel: string;
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
  readonly evidenceLink: string;
  readonly insufficientEvidence: boolean;
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

// ── Employer admin journey ──
// Governing invariants: decisions are human-only (draft + separate approval = segregation of duties);
// no AI score/rank/band is ever shown; accommodation clinical detail is segregated from operations;
// campaign activation and deployment are gated by explicit blocker/readiness checks.

export interface EmployerDashboardView {
  readonly orgName: string;
  readonly activeCampaigns: number;
  readonly openApplications: number;
  readonly pendingDecisions: number;
  readonly pendingAccommodations: number;
  readonly unassignedReviews: number;
  readonly readinessBlockers: number;
}

export interface EmployerOrgProfileView {
  readonly displayName: string;
  readonly legalName: string;
  readonly defaultTimezone: string;
  readonly supportEmail: string;
}

export type MemberStatus = 'active' | 'invited' | 'suspended';
export interface MemberView {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly status: MemberStatus;
}

export interface DepartmentView {
  readonly id: string;
  readonly name: string;
  readonly teamCount: number;
}
export interface TeamView {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string;
  readonly departmentName: string;
}
export interface StructureView {
  readonly departments: readonly DepartmentView[];
  readonly teams: readonly TeamView[];
}

export type CampaignStatus = 'draft' | 'blocked' | 'active' | 'paused' | 'closed' | 'archived';
export interface CampaignView {
  readonly id: string;
  readonly name: string;
  readonly roleTitle: string;
  readonly status: CampaignStatus;
  readonly candidateCount: number;
  readonly openBlockers: number;
  readonly createdAt: string;
}

export type PreflightSeverity = 'blocker' | 'warning' | 'ok';
export interface PreflightCheckView {
  readonly id: string;
  readonly label: string;
  readonly severity: PreflightSeverity;
  readonly detail: string;
  readonly resolved: boolean;
}

export interface CampaignExceptionView {
  readonly id: string;
  readonly summary: string;
  readonly kind: string;
}
export interface CampaignOpsView {
  readonly campaignId: string;
  readonly invited: number;
  readonly inProgress: number;
  readonly submitted: number;
  readonly underReview: number;
  readonly decided: number;
  readonly exceptions: readonly CampaignExceptionView[];
}

export type CandidateDirStatus = 'active' | 'invited' | 'withdrawn' | 'merged';
export interface EmployerCandidateView {
  readonly id: string;
  readonly reference: string;
  readonly displayName: string;
  readonly status: CandidateDirStatus;
  readonly campaignName: string;
  readonly applicationCount: number;
}

export interface CandidateApplicationRefView {
  readonly id: string;
  readonly campaignName: string;
  readonly status: string;
}
export interface CandidateRecordView {
  readonly id: string;
  readonly reference: string;
  readonly displayName: string;
  readonly status: CandidateDirStatus;
  readonly email: string;
  readonly applications: readonly CandidateApplicationRefView[];
  readonly accommodationsNote: string;
}

export interface ImportRowError {
  readonly row: number;
  readonly message: string;
}
export interface ImportResultView {
  readonly stage: 'validated' | 'committed';
  readonly totalRows: number;
  readonly validRows: number;
  readonly errors: readonly ImportRowError[];
}

export type InvitationStatus = 'draft' | 'sent' | 'accepted' | 'expired' | 'revoked';
export interface InvitationView {
  readonly id: string;
  readonly email: string;
  readonly campaignName: string;
  readonly status: InvitationStatus;
  readonly sentAt: string | null;
}

export type ScheduleWindowStatus = 'open' | 'full' | 'closed';
export interface ScheduleWindowView {
  readonly id: string;
  readonly label: string;
  readonly startsAt: string;
  readonly capacity: number;
  readonly booked: number;
  readonly status: ScheduleWindowStatus;
}

export type AccommodationDecisionStatus = 'pending' | 'approved' | 'declined' | 'more_info';
export interface AccommodationRequestView {
  readonly id: string;
  readonly candidateRef: string;
  readonly category: string;
  readonly adjustmentSummary: string;
  readonly status: AccommodationDecisionStatus;
  readonly decidedBy: string | null;
}

export type ReviewerAdminStatus = 'active' | 'invited' | 'training' | 'suspended';
export interface ReviewerAdminView {
  readonly id: string;
  readonly name: string;
  readonly disciplines: readonly string[];
  readonly status: ReviewerAdminStatus;
  readonly activeAssignments: number;
}

export type AssignmentBoardStatus = 'unassigned' | 'assigned' | 'in_review' | 'submitted';
export interface AssignmentBoardItemView {
  readonly id: string;
  readonly candidateRef: string;
  readonly campaignName: string;
  readonly reviewerName: string | null;
  readonly status: AssignmentBoardStatus;
}

export interface ComparisonRowView {
  readonly applicationId: string;
  readonly candidateRef: string;
  readonly reviewStatus: string;
  readonly criteriaScored: number;
  readonly criteriaTotal: number;
}

export type DecisionOutcome = 'advance' | 'hold' | 'reject';
export interface DecisionDraftView {
  readonly applicationId: string;
  readonly candidateRef: string;
  readonly campaignName: string;
  readonly outcome: DecisionOutcome | null;
  readonly rationale: string;
  readonly reviewComplete: boolean;
  readonly status: 'draft' | 'submitted';
}

export type ApprovalStatus =
  'awaiting_review' | 'awaiting_approval' | 'approved' | 'issued' | 'returned';
export interface DecisionApprovalView {
  readonly applicationId: string;
  readonly candidateRef: string;
  readonly outcome: DecisionOutcome | null;
  readonly rationale: string;
  readonly draftedBy: string;
  readonly status: ApprovalStatus;
  readonly approver: string | null;
  readonly issuedAt: string | null;
}

export type ReportStatus = 'queued' | 'running' | 'ready' | 'failed';
export interface ReportView {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly status: ReportStatus;
  readonly generatedAt: string | null;
}

export type IntegrationStatus = 'connected' | 'disabled' | 'error';
export interface IntegrationView {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly status: IntegrationStatus;
  readonly endpoint: string;
}

export interface TemplateView {
  readonly id: string;
  readonly name: string;
  readonly channel: 'email' | 'sms';
  readonly subject: string;
  readonly updatedAt: string;
}

export type ReadinessSeverity = 'blocker' | 'warning' | 'ready';
export interface ReadinessItemView {
  readonly id: string;
  readonly label: string;
  readonly severity: ReadinessSeverity;
  readonly detail: string;
  readonly resolved: boolean;
}

// ── Platform admin journey (CPF Super Admin) ──
// Invariants: strict privilege boundaries, no silent impersonation, time-bound justified access.

export interface AdminDashboardView {
  readonly tenants: number;
  readonly activeIncidents: number;
  readonly failedJobs: number;
  readonly openAccessGrants: number;
  readonly alerts: readonly {
    readonly id: string;
    readonly severity: string;
    readonly message: string;
  }[];
}

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'archived';
export interface TenantView {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: TenantStatus;
  readonly plan: string;
  readonly staffCount: number;
  readonly createdAt: string;
}

export interface TenantDetailView {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: TenantStatus;
  readonly plan: string;
  readonly region: string;
  readonly seatsUsed: number;
  readonly seatsLimit: number;
}

export type StaffStatus = 'active' | 'invited' | 'suspended';
export interface TenantStaffView {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: StaffStatus;
}

export interface SubscriptionView {
  readonly tenantId: string;
  readonly plan: string;
  readonly seatsLimit: number;
  readonly effectiveFrom: string;
  readonly renewsAt: string;
}

export interface FeatureFlagView {
  readonly id: string;
  readonly key: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly rollout: string;
}

export type JobStatus = 'queued' | 'running' | 'partial' | 'failed' | 'cancelled' | 'complete';
export interface JobView {
  readonly id: string;
  readonly name: string;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly queuedAt: string;
}

export interface AuditEventView {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly at: string;
}

export type ReleaseStatus = 'scheduled' | 'in_progress' | 'complete' | 'cancelled';
export interface ReleaseView {
  readonly id: string;
  readonly title: string;
  readonly kind: 'maintenance' | 'release';
  readonly status: ReleaseStatus;
  readonly window: string;
}

export type SupportCaseStatus = 'new' | 'assigned' | 'in_progress' | 'resolved';
export interface AdminSupportCaseView {
  readonly id: string;
  readonly subject: string;
  readonly tenantName: string;
  readonly priority: 'low' | 'normal' | 'high' | 'urgent';
  readonly status: SupportCaseStatus;
  readonly assignee: string | null;
}

export type AccessGrantStatus = 'requested' | 'approved' | 'active' | 'expired' | 'revoked';
export interface AccessGrantView {
  readonly id: string;
  readonly requester: string;
  readonly scope: string;
  readonly justification: string;
  readonly status: AccessGrantStatus;
  readonly expiresAt: string | null;
  readonly approver: string | null;
}

// ── Assessment governance journey (Assessment Admin / AI Governance / Plugin Admin) ──
// Invariants: immutable versions, human-approved activation, no AI output on these surfaces.

export type RiskTier = 'minimal' | 'limited' | 'high';
export type AssessmentStatus = 'draft' | 'in_review' | 'active' | 'suspended' | 'retired';
export interface AssessmentView {
  readonly id: string;
  readonly name: string;
  readonly roleFamily: string;
  readonly riskTier: RiskTier;
  readonly status: AssessmentStatus;
  readonly owner: string;
  readonly updatedAt: string;
}

export type AssessmentVersionStatus = 'draft' | 'validated' | 'active' | 'suspended';
export interface AssessmentVersionView {
  readonly id: string;
  readonly assessmentId: string;
  readonly label: string;
  readonly status: AssessmentVersionStatus;
  readonly effectiveDate: string;
  readonly rationale: string;
  readonly validationResolved: boolean;
}

export interface AssessmentDetailView {
  readonly id: string;
  readonly name: string;
  readonly status: AssessmentStatus;
  readonly owner: string;
  readonly reference: string;
  readonly riskTier: RiskTier;
  readonly versions: readonly AssessmentVersionView[];
}

export interface AssessmentPreviewSection {
  readonly title: string;
  readonly tasks: readonly string[];
}
export interface AssessmentPreviewView {
  readonly versionId: string;
  readonly assessmentName: string;
  readonly sections: readonly AssessmentPreviewSection[];
}

export type ValidationCheckStatus = 'pass' | 'fail' | 'pending';
export interface ValidationCheckView {
  readonly id: string;
  readonly label: string;
  readonly status: ValidationCheckStatus;
}
export interface AssessmentValidationView {
  readonly versionId: string;
  readonly checks: readonly ValidationCheckView[];
  readonly resolved: boolean;
  readonly outcome: string | null;
  readonly rationale: string | null;
}

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'open' | 'triaged' | 'resolved';
export interface DefectView {
  readonly id: string;
  readonly title: string;
  readonly severity: DefectSeverity;
  readonly status: DefectStatus;
  readonly scope: string;
  readonly owner: string;
}

export type AiModelStatus = 'registered' | 'in_evaluation' | 'approved' | 'active' | 'suspended';
export interface AiModelView {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly useCase: string;
  readonly status: AiModelStatus;
  readonly limitations: string;
}

export interface AiModelDetailView {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly useCase: string;
  readonly status: AiModelStatus;
  readonly limitations: string;
  readonly reference: string;
  readonly evaluationRecorded: boolean;
  readonly approvals: number;
  readonly approvalsRequired: number;
}

export interface EvaluationDimensionView {
  readonly id: string;
  readonly label: string;
  readonly status: ValidationCheckStatus;
}
export interface AiEvaluationView {
  readonly modelId: string;
  readonly dimensions: readonly EvaluationDimensionView[];
  readonly recorded: boolean;
  readonly outcome: string | null;
  readonly rationale: string | null;
}

export type PromptStatus = 'draft' | 'active' | 'rolled_back';
export interface PromptVersionView {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly status: PromptStatus;
  readonly immutable: boolean;
  readonly createdAt: string;
}

export type PluginStatus = 'registered' | 'approved' | 'suspended';
export interface PluginView {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly dataScope: string;
  readonly status: PluginStatus;
}

// ── Governance & Audit types (GOV-01..18, AUD-01..02) ──────────────────────────────────────
// Invariants: governance decisions require human authority checkpoints with outcome+rationale;
// versioned artifacts are immutable; chain of custody is maintained for evidence collections.

// Common statuses for governance records
type GovernanceRecordStatus = 'draft' | 'ready' | 'attention' | 'complete' | 'archived';

// AI System (GOV-01)
export interface AiSystemView {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly classification: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly updatedAt: string;
}

// Classification Decision (GOV-02)
export interface ClassificationView {
  readonly systemId: string;
  readonly role: string;
  readonly intendedPurpose: string;
  readonly classification: string | null;
  readonly reasoning: string | null;
  readonly resolved: boolean;
}

// Risk and Control (GOV-03)
export interface RiskView {
  readonly id: string;
  readonly title: string;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly controls: string;
  readonly residual: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
}

// Dataset (GOV-04)
export interface DatasetView {
  readonly id: string;
  readonly name: string;
  readonly provenance: string;
  readonly lawfulBasis: string;
  readonly representativeness: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly updatedAt: string;
}

// Technical Documentation (GOV-05)
export interface TechnicalDocView {
  readonly id: string;
  readonly systemId: string;
  readonly version: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly reference: string;
  readonly updatedAt: string;
}

// QMS Procedure (GOV-06)
export interface QmsProcedureView {
  readonly id: string;
  readonly title: string;
  readonly policy: string;
  readonly approvedBy: string | null;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly updatedAt: string;
}

// Data Use Purpose (GOV-07)
export interface DataUseView {
  readonly id: string;
  readonly purpose: string;
  readonly lawfulBasis: string;
  readonly categories: string;
  readonly recipients: string;
  readonly retention: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
}

// Impact Assessment (GOV-08)
export interface ImpactAssessmentView {
  readonly systemId: string;
  readonly assessmentType: 'DPIA' | 'FundamentalRights';
  readonly outcome: string | null;
  readonly rationale: string | null;
  readonly resolved: boolean;
}

// Oversight Plan (GOV-09)
export interface OversightPlanView {
  readonly systemId: string;
  readonly authority: string | null;
  readonly competency: string | null;
  readonly stoppingRules: string | null;
  readonly outcome: string | null;
  readonly rationale: string | null;
  readonly resolved: boolean;
}

// Deployer Instructions (GOV-10)
export interface DeployerInstructionsView {
  readonly id: string;
  readonly systemId: string;
  readonly version: string;
  readonly limitations: string;
  readonly oversight: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly reference: string;
}

// AI Literacy Training (GOV-11)
export interface AiLiteracyView {
  readonly id: string;
  readonly role: string;
  readonly trainingModule: string;
  readonly assignee: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
  readonly status: GovernanceRecordStatus;
}

// Conformity Assessment (GOV-12)
export interface ConformityAssessmentView {
  readonly systemId: string;
  readonly requirements: string;
  readonly tests: string;
  readonly gaps: string;
  readonly outcome: string | null;
  readonly rationale: string | null;
  readonly resolved: boolean;
}

// Market Access (GOV-13)
export type MarketAccessType = 'declaration' | 'registration' | 'ce_marking';
export interface MarketAccessView {
  readonly id: string;
  readonly systemId: string;
  readonly accessType: MarketAccessType;
  readonly completedAt: string | null;
  readonly evidence: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
}

// Post-Market Plan (GOV-14)
export interface PostMarketPlanView {
  readonly systemId: string;
  readonly metrics: string;
  readonly thresholds: string;
  readonly reviewCadence: string;
  readonly outcome: string | null;
  readonly rationale: string | null;
  readonly resolved: boolean;
}

// Signal (GOV-15)
export type SignalType = 'safety' | 'performance' | 'bias' | 'drift';
export type SignalPriority = 'low' | 'medium' | 'high' | 'critical';
export interface SignalView {
  readonly id: string;
  readonly type: SignalType;
  readonly priority: SignalPriority;
  readonly description: string;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly detectedAt: string;
}

export interface SignalDashboardView {
  readonly readyNow: number;
  readonly needsAttention: number;
  readonly inProgress: number;
  readonly signals: readonly SignalView[];
  readonly recentActivity: readonly { event: string; timestamp: string }[];
}

// Serious Incident (GOV-16)
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';
export interface SeriousIncidentView {
  readonly id: string;
  readonly title: string;
  readonly severity: IncidentSeverity;
  readonly contained: boolean;
  readonly notified: boolean;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
  readonly occurredAt: string;
}

// Vendor Evidence (GOV-17)
export interface VendorEvidenceView {
  readonly id: string;
  readonly vendor: string;
  readonly obligation: string;
  readonly evidence: string | null;
  readonly expiresAt: string | null;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
}

// Change Request (GOV-18)
export interface ChangeRequestView {
  readonly id: string;
  readonly title: string;
  readonly significance: 'minor' | 'major' | 'substantial';
  readonly affectedControls: string;
  readonly outcome: string | null;
  readonly rationale: string | null;
  readonly resolved: boolean;
  readonly status: GovernanceRecordStatus;
  readonly owner: string;
}

// Evidence Collection (AUD-01)
export interface EvidenceCollectionView {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly custodian: string;
  readonly sealed: boolean;
  readonly chainOfCustody: readonly { actor: string; action: string; timestamp: string }[];
  readonly status: GovernanceRecordStatus;
  readonly createdAt: string;
}

// Traceability (AUD-02)
export interface TraceabilityView {
  readonly requirementId: string;
  readonly description: string;
  readonly controls: readonly string[];
  readonly surfaces: readonly string[];
  readonly endpoints: readonly string[];
  readonly evidence: readonly string[];
}

// Notification preferences (ACC-02)
export interface NotificationPreference {
  readonly id: string;
  readonly channel: 'email' | 'in_app' | 'sms';
  readonly category: string;
  readonly enabled: boolean;
  readonly mandatory: boolean;
}

// Candidate profile (CAN-02)
export interface CandidateProfile {
  readonly fullName: string;
  readonly email: string;
  readonly dateOfBirth: string;
  readonly phone?: string;
}

// Notices (CAN-03)
export interface Notice {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly category: string;
  readonly acknowledged: boolean;
}

// Practice modules (CAN-06)
export interface PracticeModule {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly duration: string;
  readonly taskCount: number;
  readonly completed: boolean;
}

// System checks (CAN-07)
export type CheckStatus = 'not_started' | 'checking' | 'passed' | 'warning' | 'failed';
export interface SystemCheck {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: CheckStatus;
  readonly message?: string;
  readonly required: boolean;
}

// Review requests (CAN-10)
export interface ReviewableDecision {
  readonly id: string;
  readonly decisionType: string;
  readonly outcome: string;
  readonly reasoning: string;
  readonly decidedAt: string;
  readonly canRequest: boolean;
  readonly reviewRequested: boolean;
}

// Support tickets (CAN-13)
export interface SupportTicket {
  readonly id: string;
  readonly subject: string;
  readonly category: string;
  readonly status: 'open' | 'in_progress' | 'resolved' | 'closed';
  readonly priority: 'low' | 'medium' | 'high';
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Support queue (SUP-01)
export interface SupportCase {
  readonly id: string;
  readonly ticketNumber: string;
  readonly subject: string;
  readonly requester: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'new' | 'assigned' | 'in_progress' | 'escalated' | 'resolved';
  readonly category: string;
  readonly age: string;
  readonly assignedTo?: string;
}

// Support case detail (SUP-02)
export interface SupportCaseDetail extends SupportCase {
  readonly description: string;
  readonly createdAt: string;
  readonly messages: Array<{
    readonly id: string;
    readonly author: string;
    readonly content: string;
    readonly timestamp: string;
    readonly internal: boolean;
  }>;
}

// JIT access (SUP-03)
export interface JitAccessSession {
  readonly id: string;
  readonly grantedTo: string;
  readonly scope: string;
  readonly justification: string;
  readonly grantedAt: string;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired' | 'revoked';
  readonly actions: Array<{
    readonly id: string;
    readonly action: string;
    readonly timestamp: string;
    readonly outcome: string;
  }>;
}

// Operations dashboard (OPS-01)
export interface OperationalMetric {
  readonly label: string;
  readonly value: string;
  readonly trend?: string;
  readonly tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface SystemAlert {
  readonly id: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly timestamp: string;
  readonly acknowledged: boolean;
}

export interface OperationsDashboard {
  readonly metrics: OperationalMetric[];
  readonly alerts: SystemAlert[];
  readonly recentActivity: Array<{
    readonly id: string;
    readonly description: string;
    readonly timestamp: string;
  }>;
}

// Security incident (OPS-02)
export interface SecurityIncident {
  readonly id: string;
  readonly title: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'active' | 'contained' | 'resolved';
  readonly detectedAt: string;
}

export interface KillSwitchStatus {
  readonly enabled: boolean;
  readonly reason?: string;
  readonly enabledAt?: string;
  readonly enabledBy?: string;
}

// Integration deliveries (OPS-03)
export interface IntegrationDelivery {
  readonly id: string;
  readonly deliveryType: 'export' | 'webhook' | 'api';
  readonly destination: string;
  readonly status: 'pending' | 'in_progress' | 'delivered' | 'failed' | 'retrying';
  readonly recordCount: number;
  readonly initiatedAt: string;
  readonly completedAt?: string;
  readonly errorMessage?: string;
  readonly retryCount: number;
}

export interface ApplicationDetail {
  readonly id: string;
  readonly campaignTitle: string;
  readonly roleTitle: string;
  readonly appliedAt: string;
  readonly status: 'under_review' | 'withdrawn';
}
