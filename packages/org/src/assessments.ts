import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { AssessmentRepository } from './assessment-repository.js';
import type { Actor } from './types.js';
import type {
  AssessmentCreate,
  AssessmentDto,
  AssessmentListQuery,
  AssessmentPageDto,
} from './assessment-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_CODE = 100;
const MAX_TITLE = 200;
const MAX_ROLE = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RawAssessmentListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseAssessmentListQueryResult =
  | { readonly ok: true; readonly value: AssessmentListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseAssessmentListQuery(
  raw: RawAssessmentListQuery,
): ParseAssessmentListQueryResult {
  const errors: string[] = [];
  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'string' ? parseInt(raw.limit, 10) : raw.limit;
    if (Number.isNaN(n) || n < 1) errors.push('limit must be a positive integer');
    else if (n > MAX_LIMIT) errors.push(`limit must be at most ${MAX_LIMIT}`);
    else limit = n;
  }
  let cursor: string | null = null;
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) errors.push('cursor too long');
    else cursor = raw.cursor;
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export type ParseAssessmentCreateResult =
  | { readonly ok: true; readonly value: AssessmentCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseAssessmentCreate(raw: unknown): ParseAssessmentCreateResult {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['code'] !== 'string' || obj['code'].length === 0) errors.push('code is required');
  else if (obj['code'].length > MAX_CODE) errors.push('code too long');
  if (typeof obj['title'] !== 'string' || obj['title'].length === 0)
    errors.push('title is required');
  else if (obj['title'].length > MAX_TITLE) errors.push('title too long');
  if (typeof obj['targetRole'] !== 'string' || obj['targetRole'].length === 0)
    errors.push('targetRole is required');
  else if (obj['targetRole'].length > MAX_ROLE) errors.push('targetRole too long');
  if (typeof obj['seniority'] !== 'string' || obj['seniority'].length === 0)
    errors.push('seniority is required');
  if (typeof obj['ownerUserId'] !== 'string' || !UUID_RE.test(obj['ownerUserId']))
    errors.push('ownerUserId must be a valid UUID');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      code: obj['code'] as string,
      title: obj['title'] as string,
      targetRole: obj['targetRole'] as string,
      seniority: obj['seniority'] as string,
      ownerUserId: obj['ownerUserId'] as string,
    },
  };
}

export function parseAssessmentId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface AssessmentDeps {
  readonly repository: AssessmentRepository;
}

export type ListAssessmentsResult =
  | { readonly ok: true; readonly page: AssessmentPageDto }
  | { readonly ok: false; readonly status: number; readonly reason: string };

export async function listAssessments(
  deps: AssessmentDeps,
  actor: Actor,
  query: AssessmentListQuery,
): Promise<ListAssessmentsResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const decoded = query.cursor !== null ? decodeCursor(query.cursor) : null;
  const cursorId = decoded?.id ?? null;
  const result = await deps.repository.listAssessments(actor, query.limit, cursorId);
  const items: AssessmentDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;
  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type GetAssessmentResult =
  | { readonly ok: true; readonly assessment: AssessmentDto }
  | { readonly ok: false; readonly status: number; readonly reason: string };

export async function getAssessment(
  deps: AssessmentDeps,
  actor: Actor,
  id: string,
): Promise<GetAssessmentResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.getAssessment(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Assessment not found.' };
  return { ok: true, assessment: record };
}

export type CreateAssessmentResult =
  | { readonly ok: true; readonly assessment: AssessmentDto }
  | { readonly ok: false; readonly status: number; readonly reason: string };

export async function createAssessment(
  deps: AssessmentDeps,
  actor: Actor,
  input: AssessmentCreate,
): Promise<CreateAssessmentResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  try {
    const record = await deps.repository.createAssessment(actor, input);
    return { ok: true, assessment: record };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'An assessment with that code already exists.' };
    }
    throw err;
  }
}
