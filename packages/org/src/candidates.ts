import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { CandidateRepository } from './candidate-repository.js';
import type { Actor } from './types.js';
import type {
  CandidateCreate,
  CandidateDto,
  CandidateListQuery,
  CandidatePageDto,
} from './candidate-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_EXT_REF = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['externalReference']);

export interface RawCandidateListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseCandidateListQueryResult =
  | { readonly ok: true; readonly value: CandidateListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseCandidateListQuery(raw: RawCandidateListQuery): ParseCandidateListQueryResult {
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
      if (cursor === null) errors.push('cursor is malformed');
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export type ParseCandidateCreateResult =
  | { readonly ok: true; readonly value: CandidateCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseCandidateCreate(raw: unknown): ParseCandidateCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (input.externalReference !== undefined) {
    if (
      typeof input.externalReference !== 'string' ||
      input.externalReference.length === 0 ||
      input.externalReference.length > MAX_EXT_REF
    ) {
      errors.push(`externalReference must be a non-empty string up to ${MAX_EXT_REF} chars`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(input.externalReference !== undefined
        ? { externalReference: input.externalReference as string }
        : {}),
    },
  };
}

export function parseCandidateId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface CandidateDeps {
  readonly repository: CandidateRepository;
  readonly permissions?: readonly Permission[];
}

export type ListCandidatesResult =
  | { readonly ok: true; readonly page: CandidatePageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listCandidates(
  deps: CandidateDeps,
  actor: Actor,
  query: CandidateListQuery,
): Promise<ListCandidatesResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listCandidates(actor, query);
  const items: CandidateDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;
  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type GetCandidateResult =
  | { readonly ok: true; readonly candidate: CandidateDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function getCandidate(
  deps: CandidateDeps,
  actor: Actor,
  id: string,
): Promise<GetCandidateResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.getCandidate(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Candidate not found.' };
  return { ok: true, candidate: record };
}

export type CreateCandidateResult =
  | { readonly ok: true; readonly candidate: CandidateDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createCandidate(
  deps: CandidateDeps,
  actor: Actor,
  input: CandidateCreate,
): Promise<CreateCandidateResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const record = await deps.repository.createCandidate(actor, input);
    return { ok: true, candidate: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return {
        ok: false,
        status: 409,
        reason: 'A candidate with that external reference already exists.',
      };
    }
    throw err;
  }
}
