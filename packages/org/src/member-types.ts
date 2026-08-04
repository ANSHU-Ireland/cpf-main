import type { KeysetCursor } from './cursor.js';

export const MEMBERSHIP_STATUSES = ['invited', 'active', 'suspended', 'revoked'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Caller-facing projection of a tenant member (membership + user + roles). */
export interface MemberRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly status: MembershipStatus;
  readonly roles: readonly string[];
  readonly departmentId: string | null;
  readonly teamId: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type MemberDto = MemberRecord;

export interface MemberPageDto {
  readonly items: readonly MemberDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface MemberListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface MemberStatusUpdate {
  readonly status: MembershipStatus;
}

export interface MemberRolesUpdate {
  readonly roles: readonly string[];
}
