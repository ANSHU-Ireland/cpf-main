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
