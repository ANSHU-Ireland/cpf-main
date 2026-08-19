export const ASSIGNMENT_TYPES = [
  'primary',
  'secondary',
  'adjudication',
  'qa',
  'integrity',
] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const ASSIGNMENT_STATUSES = [
  'assigned',
  'accepted',
  'in_progress',
  'submitted',
  'reassigned',
  'cancelled',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface ReviewAssignmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly submissionId: string;
  readonly reviewerProfileId: string;
  readonly assignmentType: AssignmentType;
  readonly blindGroup: string | null;
  readonly status: AssignmentStatus;
  readonly assignedAt: string;
  readonly dueAt: string | null;
  readonly submittedAt: string | null;
  readonly assessmentTitle?: string;
  readonly candidateReference?: string;
  readonly criterionCount?: number;
  readonly evidenceCount?: number;
  readonly evidence?: readonly ReviewAssignmentEvidence[];
  readonly integrityEvents?: readonly ReviewAssignmentIntegrityEvent[];
  readonly clarifications?: readonly ReviewAssignmentClarification[];
}

export interface ReviewAssignmentEvidence {
  readonly id: string;
  readonly evidenceType: string;
  readonly sourceTable: string;
  readonly objectUri: string | null;
  readonly sha256: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly reviewed: boolean;
}

export interface ReviewAssignmentIntegrityEvent {
  readonly id: string;
  readonly eventType: string;
  readonly status: 'unreviewed' | 'under_review' | 'resolved';
  readonly resolution: string | null;
  readonly rationale: string | null;
  readonly occurredAt: string;
}

export interface ReviewAssignmentClarification {
  readonly id: string;
  readonly requestType: string;
  readonly question: string;
  readonly status: string;
  readonly createdAt: string;
}

export type ReviewAssignmentDto = ReviewAssignmentRecord;

export interface ReviewAssignmentCreate {
  readonly submissionId: string;
  readonly reviewerProfileId: string;
  readonly assignmentType: AssignmentType;
  readonly dueAt?: string;
}

export interface ReviewAssignmentListQuery {
  readonly limit: number;
  readonly cursor: string | null;
}
