export const ASSESSMENT_STATUSES = [
  'draft',
  'internal_review',
  'compliance_review',
  'technical_validation',
  'pilot',
  'calibration',
  'approved',
  'active',
  'suspended',
  'retired',
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export interface AssessmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly title: string;
  readonly targetRole: string;
  readonly seniority: string;
  readonly ownerUserId: string;
  readonly lifecycleStatus: AssessmentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AssessmentDto = AssessmentRecord;

export interface AssessmentCreate {
  readonly code: string;
  readonly title: string;
  readonly targetRole: string;
  readonly seniority: string;
  readonly ownerUserId: string;
}

export interface AssessmentListQuery {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface AssessmentPageDto {
  readonly items: readonly AssessmentDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}
