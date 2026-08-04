import type { KeysetCursor } from './cursor.js';

export const TEAM_STATUSES = ['active', 'inactive'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export interface TeamRecord {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string | null;
  readonly status: TeamStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type TeamDto = TeamRecord;

export interface TeamPageDto {
  readonly items: readonly TeamDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface TeamListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface TeamCreate {
  readonly name: string;
  readonly departmentId?: string;
}

export interface TeamUpdate {
  readonly name?: string;
  readonly departmentId?: string | null;
  readonly status?: TeamStatus;
}
