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
  readonly versions?: readonly AssessmentVersionSummary[];
  readonly defects?: readonly {
    readonly id: string;
    readonly assessmentVersionId: string;
    readonly defectType: string;
    readonly severity: string;
    readonly description: string;
    readonly status: string;
    readonly createdAt: string;
  }[];
}

export interface AssessmentVersionSummary {
  readonly id: string;
  readonly assessmentId: string;
  readonly versionNo: number;
  readonly status: string;
  readonly durationSeconds: number;
  readonly createdAt: string;
  readonly validations: readonly {
    readonly id: string;
    readonly validationType: string;
    readonly status: string;
    readonly summary: string | null;
  }[];
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
