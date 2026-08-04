/**
 * Types for the requester support-case *thread* surface (OpenAPI `get_me_support_cases_caseId`/
 * `post_me_support_cases_caseId_messages`; FR-ACC-16/FR-SUP-02).
 *
 * ASM-12: the `/me` surface implements the *requester* relationship only. Only `requester`-visibility
 * messages are ever read or written here; `internal`/`restricted` messages are never exposed to, nor
 * creatable by, the case requester (the "assigned support" persona is a separate staff surface).
 */
import type { KeysetCursor } from './cursor.js';
import type { SupportCaseRecord } from './support-case-types.js';

/** A requester-visible row of `support.case_messages`. */
export interface SupportMessageRecord {
  readonly id: string;
  readonly body: string;
  readonly attachments: readonly unknown[];
  readonly createdAt: string;
  readonly editedAt: string | null;
}

/** Response projection for a support-case message (replaces the `GenericRecord` placeholder). */
export type SupportMessageDto = SupportMessageRecord;

/** Keyset-paginated page of thread messages. */
export interface SupportMessagePageDto {
  readonly items: readonly SupportMessageDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/**
 * `get_me_support_cases_caseId` response: the case plus a page of its requester-visible messages
 * (replaces the `SupportCase` placeholder, whose `cursor`/`limit` params page the thread).
 */
export interface SupportCaseDetailDto extends SupportCaseRecord {
  readonly messages: SupportMessagePageDto;
}

/** Validated `get_me_support_cases_caseId` query (paginates the message thread). */
export interface SupportMessageListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

/** Validated `post_me_support_cases_caseId_messages` command. */
export interface SupportMessageCreate {
  readonly body: string;
}
