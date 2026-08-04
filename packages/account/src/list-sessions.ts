import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import {
  decodeSessionCursor,
  encodeSessionCursor,
  type SessionRepository,
} from './session-repository.js';
import type {
  SessionDto,
  SessionListQuery,
  SessionPageDto,
  SessionRecord,
  SessionStatus,
} from './session-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;

export type ParseSessionQueryResult =
  | { readonly ok: true; readonly value: SessionListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawSessionQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates `get_me_sessions` query params (limit 1..100 default 25; opaque decodable cursor). */
export function parseSessionListQuery(raw: RawSessionQuery): ParseSessionQueryResult {
  const errors: string[] = [];

  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'number' ? raw.limit : Number(raw.limit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    } else {
      limit = n;
    }
  }

  let cursor = null as SessionListQuery['cursor'];
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) {
      errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
    } else {
      const decoded = decodeSessionCursor(raw.cursor);
      if (decoded === null) {
        errors.push('cursor is invalid');
      } else {
        cursor = decoded;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { limit, cursor } };
}

export interface ListSessionsDeps {
  readonly repository: SessionRepository;
  readonly permissions?: readonly Permission[];
}

export type ListSessionsResult =
  | { readonly ok: true; readonly page: SessionPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

function statusOf(record: SessionRecord, now: number): SessionStatus {
  if (record.revokedAt !== null) {
    return 'revoked';
  }
  return Date.parse(record.expiresAt) <= now ? 'expired' : 'active';
}

function toDto(record: SessionRecord, now: number): SessionDto {
  return {
    id: record.id,
    deviceLabel: record.deviceLabel,
    createdAt: record.createdAt,
    lastSeenAt: record.lastSeenAt,
    expiresAt: record.expiresAt,
    status: statusOf(record, now),
  };
}

/** `get_me_sessions`: deny-by-default read of the caller's own sessions, keyset-paginated. */
export async function listSessions(
  deps: ListSessionsDeps,
  actor: Actor,
  query: SessionListQuery,
): Promise<ListSessionsResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    'read',
    { type: 'self_session', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { items, total, hasMore } = await deps.repository.listSessions(actor, query);
  const now = Date.now();
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last !== undefined
      ? encodeSessionCursor({ createdAt: last.createdAt, id: last.id })
      : null;

  return {
    ok: true,
    page: { items: items.map((record) => toDto(record, now)), nextCursor, total },
  };
}
