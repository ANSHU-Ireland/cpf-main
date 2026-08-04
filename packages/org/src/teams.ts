import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { TeamRepository } from './team-repository.js';
import type { Actor } from './types.js';
import type { TeamCreate, TeamDto, TeamListQuery, TeamPageDto } from './team-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_NAME = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['name', 'departmentId']);

export interface RawTeamListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseTeamListQueryResult =
  | { readonly ok: true; readonly value: TeamListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseTeamListQuery(raw: RawTeamListQuery): ParseTeamListQueryResult {
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

export type ParseTeamCreateResult =
  | { readonly ok: true; readonly value: TeamCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseTeamCreate(raw: unknown): ParseTeamCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  if (typeof input.name !== 'string' || input.name.length === 0 || input.name.length > MAX_NAME) {
    errors.push(`name must be a non-empty string up to ${MAX_NAME} chars`);
  }

  if (input.departmentId !== undefined) {
    if (typeof input.departmentId !== 'string' || !UUID_RE.test(input.departmentId)) {
      errors.push('departmentId must be a valid UUID');
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name: input.name as string,
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId as string } : {}),
    },
  };
}

export interface TeamDeps {
  readonly repository: TeamRepository;
  readonly permissions?: readonly Permission[];
}

export type ListTeamsResult =
  | { readonly ok: true; readonly page: TeamPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listTeams(
  deps: TeamDeps,
  actor: Actor,
  query: TeamListQuery,
): Promise<ListTeamsResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'team', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const result = await deps.repository.listTeams(actor, query);
  const items: TeamDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type CreateTeamResult =
  | { readonly ok: true; readonly team: TeamDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createTeam(
  deps: TeamDeps,
  actor: Actor,
  input: TeamCreate,
): Promise<CreateTeamResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'team', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  try {
    const record = await deps.repository.createTeam(actor, input);
    return { ok: true, team: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return {
        ok: false,
        status: 409,
        reason: 'A team with that name already exists in this department.',
      };
    }
    throw err;
  }
}
