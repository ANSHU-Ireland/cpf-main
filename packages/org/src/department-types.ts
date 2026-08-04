import type { KeysetCursor } from './cursor.js';

export const DEPARTMENT_STATUSES = ['active', 'inactive'] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export interface DepartmentRecord {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly status: DepartmentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type DepartmentDto = DepartmentRecord;

export interface DepartmentPageDto {
  readonly items: readonly DepartmentDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface DepartmentListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface DepartmentCreate {
  readonly name: string;
  readonly code?: string;
}
