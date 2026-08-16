export const SCORECARD_STATUSES = ['draft', 'submitted', 'locked', 'superseded'] as const;
export type ScorecardStatus = (typeof SCORECARD_STATUSES)[number];

export interface ScorecardRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly assignmentId: string;
  readonly rubricVersionId: string;
  readonly status: ScorecardStatus;
  readonly overallConfidence: number | null;
  readonly summary: string | null;
  readonly submittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly criteria?: readonly CriterionScoreRecord[];
}

export type ScorecardDto = ScorecardRecord;

export interface ScorecardUpdate {
  readonly summary?: string;
  readonly overallConfidence?: number | null;
  readonly status?: ScorecardStatus;
  readonly criterion?: CriterionScoreUpdate;
}

export interface CriterionScoreRecord {
  readonly id: string;
  readonly criterionId: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly displayOrder: number;
  readonly maxScore: number;
  readonly humanScore: number | null;
  readonly confidence: number | null;
  readonly insufficientEvidence: boolean;
  readonly evidenceLinks: readonly unknown[];
  readonly reviewerComment: string | null;
  readonly updatedAt: string | null;
}

export interface CriterionScoreUpdate {
  readonly criterionId: string;
  readonly humanScore: number | null;
  readonly confidence?: number | null;
  readonly insufficientEvidence: boolean;
  readonly evidenceLinks: readonly unknown[];
  readonly reviewerComment: string;
}
