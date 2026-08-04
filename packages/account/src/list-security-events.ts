import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { SecurityEventRepository } from './security-event-repository.js';
import type {
  SecurityEventDto,
  SecurityEventListQuery,
  SecurityEventPageDto,
  SecurityEventRecord,
} from './security-event-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;

export type ParseSecurityEventQueryResult =
  | { readonly ok: true; readonly value: SecurityEventListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawSecurityEventQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates `get_me_security_events` query params (limit 1..100 default 25; opaque cursor). */
export function parseSecurityEventQuery(raw: RawSecurityEventQuery): ParseSecurityEventQueryResult {
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

  let cursor = null as SecurityEventListQuery['cursor'];
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) {
      errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
    } else {
      const decoded = decodeCursor(raw.cursor);
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

export interface ListSecurityEventsDeps {
  readonly repository: SecurityEventRepository;
  readonly permissions?: readonly Permission[];
}

export type ListSecurityEventsResult =
  | { readonly ok: true; readonly page: SecurityEventPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

function toDto(record: SecurityEventRecord): SecurityEventDto {
  return {
    id: record.id,
    eventType: record.eventType,
    outcome: record.outcome,
    occurredAt: record.occurredAt,
  };
}

/** `get_me_security_events`: deny-by-default read of the caller's own security events. */
export async function listSecurityEvents(
  deps: ListSecurityEventsDeps,
  actor: Actor,
  query: SecurityEventListQuery,
): Promise<ListSecurityEventsResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    'read',
    { type: 'self_security_event', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { items, total, hasMore } = await deps.repository.listSecurityEvents(actor, query);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last !== undefined ? encodeCursor({ ts: last.occurredAt, id: last.id }) : null;

  return { ok: true, page: { items: items.map(toDto), nextCursor, total } };
}
