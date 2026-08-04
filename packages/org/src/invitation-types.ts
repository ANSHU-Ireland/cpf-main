import type { KeysetCursor } from './cursor.js';

export const INVITATION_STATUSES = [
  'created',
  'sent',
  'delivered',
  'opened',
  'accepted',
  'expired',
  'revoked',
  'completed',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface InvitationRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly tokenHash: string;
  readonly status: InvitationStatus;
  readonly maxAttempts: number;
  readonly validFrom: string | null;
  readonly expiresAt: string;
  readonly sentAt: string | null;
  readonly revokedAt: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
}

export type InvitationDto = InvitationRecord;

export interface InvitationPageDto {
  readonly items: readonly InvitationDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface InvitationListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface InvitationCreate {
  readonly maxAttempts?: number;
  readonly validFrom?: string;
  readonly expiresAt: string;
}
