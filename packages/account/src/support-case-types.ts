/** Types for the requester support-case surface (OpenAPI `get_me_support_cases`/`post_me_support_cases`; FR-ACC-16/FR-SUP-01). */
import type { KeysetCursor } from './cursor.js';

/** Severity levels a requester may assign to a new case. */
export const SUPPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type SupportSeverity = (typeof SUPPORT_SEVERITIES)[number];

/** All lifecycle statuses of a `support.cases` row. */
export const SUPPORT_CASE_STATUSES = [
  'draft',
  'open',
  'awaiting_user',
  'awaiting_internal',
  'escalated',
  'resolved',
  'closed',
  'reopened',
] as const;
export type SupportCaseStatus = (typeof SUPPORT_CASE_STATUSES)[number];

/** A caller-facing row of `support.cases` (internal routing fields are not surfaced). */
export interface SupportCaseRecord {
  readonly id: string;
  readonly caseReference: string;
  readonly category: string;
  readonly severity: SupportSeverity;
  readonly subject: string;
  readonly description: string;
  readonly purpose: string;
  readonly status: SupportCaseStatus;
  readonly slaDueAt: string | null;
  readonly resolution: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
}

/** Response projection for a support case (replaces the `GenericRecord` placeholder). */
export type SupportCaseDto = SupportCaseRecord;

/** `SupportCasePage` response projection (keyset-paginated). */
export interface SupportCasePageDto {
  readonly items: readonly SupportCaseDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Validated `get_me_support_cases` query. */
export interface SupportCaseListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

/** Validated `post_me_support_cases` command. */
export interface SupportCaseCreate {
  readonly category: string;
  readonly severity: SupportSeverity;
  readonly subject: string;
  readonly description: string;
  readonly purpose: string;
}
