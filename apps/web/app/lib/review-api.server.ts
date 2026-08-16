import type {
  AssignmentStatus,
  AssignmentView,
  ClarificationView,
  Collection,
  CriterionView,
  EvidenceItemView,
  IntegrityFlagView,
  ObservationsView,
  ReviewSubmissionView,
  ReviewerAvailabilityView,
  ReviewerProfileView,
  TaskKind,
  TrainingModuleView,
  TrainingStatus,
} from './types';

export interface PlatformReviewAssignment {
  readonly id: string;
  readonly status: string;
  readonly assignedAt: string;
  readonly dueAt: string | null;
  readonly submittedAt: string | null;
  readonly assessmentTitle?: string;
  readonly candidateReference?: string;
  readonly criterionCount?: number;
  readonly evidenceCount?: number;
  readonly evidence?: readonly PlatformEvidence[];
  readonly integrityEvents?: readonly PlatformIntegrityEvent[];
  readonly clarifications?: readonly PlatformClarification[];
}

export interface PlatformEvidence {
  readonly id: string;
  readonly evidenceType: string;
  readonly sourceTable: string;
  readonly objectUri: string | null;
  readonly sha256: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly reviewed: boolean;
}

export interface PlatformIntegrityEvent {
  readonly id: string;
  readonly eventType: string;
  readonly status: 'unreviewed' | 'under_review' | 'resolved';
  readonly resolution: string | null;
  readonly rationale: string | null;
  readonly occurredAt: string;
}

export interface PlatformClarification {
  readonly id: string;
  readonly requestType: string;
  readonly question: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface PlatformReviewerProfile {
  readonly displayName: string;
  readonly expertise: readonly string[];
  readonly trainingStatus: string;
  readonly calibrationStatus: string;
  readonly conflictDeclarationRequired: boolean;
  readonly maxActiveReviews: number | null;
}

export interface PlatformAvailabilityWindow {
  readonly id: string;
  readonly availableFrom: string;
  readonly availableTo: string;
  readonly capacity: number;
  readonly status: 'available' | 'unavailable' | 'tentative';
  readonly note: string | null;
}

export interface PlatformTrainingRecord {
  readonly id: string;
  readonly trainingType: string;
  readonly materialVersion: string;
  readonly status: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
}

export interface PlatformCriterion {
  readonly criterionId: string;
  readonly title: string;
  readonly description: string;
  readonly maxScore: number;
  readonly humanScore: number | null;
  readonly insufficientEvidence: boolean;
  readonly evidenceLinks: readonly unknown[];
  readonly reviewerComment: string | null;
}

export interface PlatformScorecard {
  readonly id: string;
  readonly assignmentId: string;
  readonly status: 'draft' | 'submitted' | 'locked' | 'superseded';
  readonly submittedAt: string | null;
  readonly criteria?: readonly PlatformCriterion[];
}

export interface PlatformObservations {
  readonly items: readonly {
    readonly id: string;
    readonly criterionId: string | null;
    readonly observation: string;
    readonly evidenceLinks: readonly unknown[];
    readonly generatedAt: string;
  }[];
  readonly independentScoringComplete: boolean;
}

function assignmentStatus(status: string): AssignmentStatus {
  if (status === 'assigned') return 'offered';
  if (status === 'accepted') return 'accepted';
  if (status === 'in_progress') return 'in_review';
  if (status === 'submitted') return 'submitted';
  return 'declined';
}

export function reviewerAssignment(item: PlatformReviewAssignment): AssignmentView {
  return {
    id: item.id,
    assessmentTitle: item.assessmentTitle ?? 'Assessment review',
    candidateRef: item.candidateReference ?? `candidate-${item.id.slice(0, 8)}`,
    status: assignmentStatus(item.status),
    dueAt: item.dueAt ?? item.assignedAt,
    criterionCount: item.criterionCount ?? 0,
    evidenceCount: item.evidenceCount ?? 0,
    assignedAt: item.assignedAt,
  };
}

export function reviewerAssignments(input: {
  readonly items: readonly PlatformReviewAssignment[];
  readonly total: number;
}): Collection<AssignmentView> {
  return { items: input.items.map(reviewerAssignment), total: input.total };
}

export function reviewerProfile(profile: PlatformReviewerProfile): ReviewerProfileView {
  return {
    displayName: profile.displayName,
    disciplines: profile.expertise,
    maxActiveReviews: profile.maxActiveReviews,
    trainingStatus: profile.trainingStatus,
    calibrationStatus: profile.calibrationStatus,
    conflictDeclarationRequired: profile.conflictDeclarationRequired,
  };
}

export function reviewerAvailability(input: {
  readonly items?: readonly PlatformAvailabilityWindow[];
  readonly windows?: readonly PlatformAvailabilityWindow[];
}): ReviewerAvailabilityView {
  const windows = input.items ?? input.windows ?? [];
  const primary = windows[0];
  if (primary === undefined) return { state: 'unavailable', weeklyCapacity: 0, note: '' };
  return {
    state:
      primary.status === 'tentative'
        ? 'limited'
        : primary.status === 'unavailable'
          ? 'unavailable'
          : 'available',
    weeklyCapacity: primary.capacity,
    note: primary.note ?? '',
  };
}

function trainingStatus(status: string, expiresAt: string | null): TrainingStatus {
  if (expiresAt !== null && Date.parse(expiresAt) < Date.now()) return 'expired';
  if (status === 'passed' || status === 'waived') return 'complete';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'expired' || status === 'failed') return 'expired';
  return 'not_started';
}

export function reviewerTraining(input: {
  readonly items: readonly PlatformTrainingRecord[];
  readonly total: number;
}): Collection<TrainingModuleView> {
  return {
    items: input.items.map((item) => ({
      id: item.id,
      title: `${item.trainingType} · ${item.materialVersion}`,
      status: trainingStatus(item.status, item.expiresAt),
      required: item.status !== 'waived',
      completedAt: item.completedAt,
    })),
    total: input.total,
  };
}

function evidenceKind(type: string): TaskKind {
  if (type.toLowerCase().includes('code')) return 'code';
  if (type.toLowerCase().includes('sheet') || type.toLowerCase().includes('table')) return 'sheet';
  return 'document';
}

function metadataText(metadata: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function reviewerEvidence(
  assignment: PlatformReviewAssignment,
): Collection<EvidenceItemView> {
  const items = (assignment.evidence ?? []).map((item) => ({
    id: item.id,
    title: metadataText(item.metadata, 'title') ?? item.evidenceType,
    kind: evidenceKind(item.evidenceType),
    excerpt:
      metadataText(item.metadata, 'excerpt') ??
      metadataText(item.metadata, 'summary') ??
      'Open the immutable source reference to inspect this evidence.',
    status: item.reviewed ? ('reviewed' as const) : ('unreviewed' as const),
    version:
      typeof item.metadata.version === 'number' && Number.isInteger(item.metadata.version)
        ? item.metadata.version
        : 1,
    sourceLabel: item.objectUri ?? `${item.sourceTable}:${item.id}`,
  }));
  return { items, total: items.length };
}

function evidenceLink(links: readonly unknown[]): string {
  const first = links[0];
  if (typeof first === 'string') return first;
  if (first !== null && typeof first === 'object') {
    const source = (first as Record<string, unknown>).source;
    if (typeof source === 'string') return source;
  }
  return '';
}

export function reviewerScorecard(scorecard: PlatformScorecard): Collection<CriterionView> {
  const items = (scorecard.criteria ?? []).map((criterion) => ({
    id: criterion.criterionId,
    label: criterion.title,
    descriptor: criterion.description,
    maxScore: criterion.maxScore,
    score: criterion.humanScore,
    rationale: criterion.reviewerComment ?? '',
    state:
      scorecard.status === 'draft'
        ? criterion.humanScore === null && !criterion.insufficientEvidence
          ? ('draft' as const)
          : ('saved' as const)
        : ('submitted' as const),
    evidenceLink: evidenceLink(criterion.evidenceLinks),
    insufficientEvidence: criterion.insufficientEvidence,
  }));
  return { items, total: items.length };
}

export function reviewerObservations(input: PlatformObservations): ObservationsView {
  return {
    revealState: input.independentScoringComplete ? 'revealed' : 'concealed',
    scoringComplete: input.independentScoringComplete,
    items: input.independentScoringComplete
      ? input.items.map((item) => ({
          id: item.id,
          criterionId: item.criterionId ?? '',
          body: item.observation,
          provenanceRef: evidenceLink(item.evidenceLinks) || item.id,
        }))
      : [],
  };
}

export function reviewerIntegrity(
  assignment: PlatformReviewAssignment,
): Collection<IntegrityFlagView> {
  const items = (assignment.integrityEvents ?? []).map((event) => ({
    id: event.id,
    summary: event.eventType.replaceAll('_', ' '),
    status:
      event.status !== 'resolved'
        ? ('open' as const)
        : event.resolution === 'material_integrity_concern'
          ? ('upheld' as const)
          : ('dismissed' as const),
    resolution: event.rationale ?? event.resolution?.replaceAll('_', ' ') ?? '',
  }));
  return { items, total: items.length };
}

function clarificationStatus(status: string): ClarificationView['status'] {
  if (status === 'answered' || status === 'resolved') return 'answered';
  return 'sent';
}

export function reviewerClarifications(
  assignment: PlatformReviewAssignment,
): Collection<ClarificationView> {
  const items = (assignment.clarifications ?? []).map((item) => ({
    id: item.id,
    topic: item.requestType.replaceAll('_', ' '),
    body: item.question,
    status: clarificationStatus(item.status),
    at: item.createdAt,
  }));
  return { items, total: items.length };
}

export function reviewerSubmission(
  assignment: PlatformReviewAssignment,
  scorecard: PlatformScorecard,
): ReviewSubmissionView {
  const criteria = scorecard.criteria ?? [];
  return {
    assignmentId: assignment.id,
    allCriteriaScored:
      criteria.length > 0 &&
      criteria.every(
        (item) =>
          (item.humanScore !== null || item.insufficientEvidence) &&
          (item.reviewerComment?.trim().length ?? 0) >= 3,
      ),
    evidenceAllReviewed:
      (assignment.evidence?.length ?? 0) > 0 &&
      (assignment.evidence ?? []).every((item) => item.reviewed),
    openIntegrityFlags: (assignment.integrityEvents ?? []).filter(
      (event) => event.status !== 'resolved',
    ).length,
    submittedAt: scorecard.submittedAt,
    receiptRef: scorecard.submittedAt === null ? null : scorecard.id,
  };
}
