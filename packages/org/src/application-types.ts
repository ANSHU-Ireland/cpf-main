import type { KeysetCursor } from './cursor.js';

export const APPLICATION_STATUSES = [
  'created',
  'invited',
  'started',
  'submitted',
  'in_review',
  'reviewed',
  'progressed',
  'not_progressed',
  'withdrawn',
  'cancelled',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationRecord {
  readonly id: string;
  readonly campaignId: string;
  readonly candidateId: string;
  readonly status: ApplicationStatus;
  readonly source: string;
  readonly sourceReference: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ApplicationDto = ApplicationRecord;

export interface ApplicationPageDto {
  readonly items: readonly ApplicationDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface ApplicationListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface ApplicationCreate {
  readonly candidateId: string;
  readonly source?: string;
  readonly sourceReference?: string;
}

export interface ApplicationStatusUpdate {
  readonly status: ApplicationStatus;
}
