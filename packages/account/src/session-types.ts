/** Types for the account session vertical (OpenAPI `get_me_sessions`, `delete_me_sessions_sessionId`; FR-ACC-08). */

/** A row of `iam.user_sessions` for the caller (token hashes are never surfaced). */
export interface SessionRecord {
  readonly id: string;
  readonly deviceLabel: string | null;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

/** Response projection for a session; excludes `refresh_token_hash` and fingerprint material. */
export interface SessionDto {
  readonly id: string;
  readonly deviceLabel: string | null;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly expiresAt: string;
  readonly status: SessionStatus;
}

/** `SessionPage` response projection (keyset-paginated). */
export interface SessionPageDto {
  readonly items: readonly SessionDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Opaque keyset cursor position (created_at + id of the last item on the previous page). */
export interface SessionCursor {
  readonly createdAt: string;
  readonly id: string;
}

/** Validated `get_me_sessions` query. */
export interface SessionListQuery {
  readonly limit: number;
  readonly cursor: SessionCursor | null;
}
