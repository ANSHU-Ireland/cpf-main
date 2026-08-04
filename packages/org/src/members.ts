import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { MemberRepository } from './member-repository.js';
import type { Actor } from './types.js';
import type {
  MemberDto,
  MemberListQuery,
  MemberPageDto,
  MemberRolesUpdate,
  MemberStatusUpdate,
} from './member-types.js';
import { MEMBERSHIP_STATUSES } from './member-types.js';

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

// --- Member status update ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMemberId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export type ParseMemberStatusUpdateResult =
  | { readonly ok: true; readonly value: MemberStatusUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseMemberStatusUpdate(raw: unknown): ParseMemberStatusUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];
  const allowed = new Set(['status']);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`unknown property: ${key}`);
  }
  if (input.status === undefined) {
    errors.push('status is required');
  } else if (!MEMBERSHIP_STATUSES.includes(input.status as never)) {
    errors.push(`status must be one of: ${MEMBERSHIP_STATUSES.join(', ')}`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { status: input.status as MemberStatusUpdate['status'] } };
}

export type UpdateMemberStatusResult =
  | { readonly ok: true; readonly member: MemberDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function updateMemberStatus(
  deps: MemberDeps,
  actor: Actor,
  memberId: string,
  input: MemberStatusUpdate,
): Promise<UpdateMemberStatusResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization_member', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.updateMemberStatus(actor, memberId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Member not found.' };
  return { ok: true, member: record };
}

// --- Member roles update ---

export type ParseMemberRolesUpdateResult =
  | { readonly ok: true; readonly value: MemberRolesUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseMemberRolesUpdate(raw: unknown): ParseMemberRolesUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];
  const allowed = new Set(['roles']);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`unknown property: ${key}`);
  }
  if (!Array.isArray(input.roles)) {
    errors.push('roles must be an array of strings');
  } else {
    if (input.roles.length === 0) errors.push('roles must contain at least one role code');
    for (const r of input.roles) {
      if (typeof r !== 'string' || r.length === 0) {
        errors.push('each role must be a non-empty string');
        break;
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { roles: input.roles as string[] } };
}

export type ReplaceMemberRolesResult =
  | { readonly ok: true; readonly member: MemberDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function replaceMemberRoles(
  deps: MemberDeps,
  actor: Actor,
  memberId: string,
  input: MemberRolesUpdate,
): Promise<ReplaceMemberRolesResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization_member', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.replaceMemberRoles(actor, memberId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Member not found.' };
  return { ok: true, member: record };
}
