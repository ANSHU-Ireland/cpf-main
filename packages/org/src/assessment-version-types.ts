export const VALIDATION_TYPES = [
  'job_relevance',
  'accessibility',
  'privacy',
  'security',
  'fairness',
  'technical',
  'pilot',
  'calibration',
] as const;
export type ValidationType = (typeof VALIDATION_TYPES)[number];

export const VALIDATION_STATUSES = [
  'pending',
  'passed',
  'passed_with_conditions',
  'failed',
  'expired',
] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export interface AssessmentValidationRecord {
  readonly id: string;
  readonly assessmentVersionId: string;
  readonly validationType: ValidationType;
  readonly status: ValidationStatus;
  readonly evidenceUri: string | null;
  readonly summary: string | null;
  readonly reviewerUserId: string | null;
  readonly reviewedAt: string | null;
  readonly expiresAt: string | null;
  readonly createdAt: string;
}

export interface AssessmentValidationCreate {
  readonly validationType: ValidationType;
  readonly status: ValidationStatus;
  readonly summary?: string;
  readonly evidenceUri?: string;
}

export const ASSESSMENT_VERSION_STATUSES = [
  'draft',
  'approved',
  'active',
  'suspended',
  'retired',
] as const;
export type AssessmentVersionStatus = (typeof ASSESSMENT_VERSION_STATUSES)[number];

export interface AssessmentVersionRecord {
  readonly id: string;
  readonly assessmentId: string;
  readonly versionNo: number;
  readonly status: AssessmentVersionStatus;
  readonly durationSeconds: number;
  readonly createdAt: string;
}
