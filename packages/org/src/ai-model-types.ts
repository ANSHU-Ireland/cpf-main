export const AI_MODEL_STATUSES = [
  'draft',
  'evaluating',
  'approved',
  'active',
  'suspended',
  'retired',
] as const;
export type AiModelStatus = (typeof AI_MODEL_STATUSES)[number];

export interface AiModelRecord {
  readonly id: string;
  readonly provider: string;
  readonly modelKey: string;
  readonly displayName: string;
  readonly modelVersion: string;
  readonly intendedPurpose: string;
  readonly limitations: string;
  readonly dataRegion: string | null;
  readonly status: AiModelStatus;
  readonly evaluationSummary: Record<string, unknown>;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly createdAt: string;
}

export type AiModelDto = AiModelRecord;

export interface AiModelCreate {
  readonly provider: string;
  readonly modelKey: string;
  readonly displayName: string;
  readonly modelVersion: string;
  readonly intendedPurpose: string;
  readonly limitations: string;
  readonly dataRegion?: string;
}

export interface AiModelListQuery {
  readonly limit: number;
  readonly cursor: string | null;
}
