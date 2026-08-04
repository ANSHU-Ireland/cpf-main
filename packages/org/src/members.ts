import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { MemberRepository } from './member-repository.js';
import type { Actor } from './types.js';
import type { MemberDto, MemberListQuery, MemberPageDto } from './member-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;

export interface RawMemberListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseMemberListQueryResult =
  | { readonly ok: true; readonly value: MemberListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseMemberListQuery(raw: RawMemberListQuery): ParseMemberListQueryResult {
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

  let cursor = null;
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) {
      errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
    } else {
      cursor = decodeCursor(raw.cursor);
      if (cursor === null) {
        errors.push('cursor is malformed');
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { limit, cursor } };
}

export interface MemberDeps {
  readonly repository: MemberRepository;
  readonly permissions?: readonly Permission[];
}

export type ListMembersResult =
  | { readonly ok: true; readonly page: MemberPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listMembers(
  deps: MemberDeps,
  actor: Actor,
  query: MemberListQuery,
): Promise<ListMembersResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'organization_member', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const result = await deps.repository.listMembers(actor, query);

  const items: MemberDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}
