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
}

export type ScorecardDto = ScorecardRecord;

export interface ScorecardUpdate {
  readonly summary?: string;
  readonly overallConfidence?: number | null;
  readonly status?: ScorecardStatus;
}
