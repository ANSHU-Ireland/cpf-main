import type { KeysetCursor } from './cursor.js';

export const CANDIDATE_STATUSES = ['active', 'withdrawn', 'restricted', 'deleted'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export interface CandidateRecord {
  readonly id: string;
  readonly externalReference: string | null;
  readonly status: CandidateStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CandidateDto = CandidateRecord;

export interface CandidatePageDto {
  readonly items: readonly CandidateDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface CandidateListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface CandidateCreate {
  readonly externalReference?: string;
}
