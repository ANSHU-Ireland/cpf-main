/** Types for the user-visible security-events feed (OpenAPI `get_me_security_events`; FR-ACC-18). */
import type { KeysetCursor } from './cursor.js';

/** A row of `iam.account_security_events` for the caller (IP/UA hashes are not surfaced). */
export interface SecurityEventRecord {
  readonly id: string;
  readonly eventType: string;
  readonly outcome: string;
  readonly occurredAt: string;
}

/** Response projection for a security event. */
export interface SecurityEventDto {
  readonly id: string;
  readonly eventType: string;
  readonly outcome: string;
  readonly occurredAt: string;
}

/** `SecurityEventPage` response projection (keyset-paginated). */
export interface SecurityEventPageDto {
  readonly items: readonly SecurityEventDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Validated `get_me_security_events` query. */
export interface SecurityEventListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}
