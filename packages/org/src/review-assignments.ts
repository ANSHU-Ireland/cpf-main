import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { Actor } from './types.js';
import { ASSIGNMENT_TYPES } from './review-assignment-types.js';
import type {
  ReviewAssignmentCreate,
  ReviewAssignmentDto,
  ReviewAssignmentListQuery,
  ReviewAssignmentRecord,
  AssignmentType,
} from './review-assignment-types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const VALID_TYPES: ReadonlySet<string> = new Set(ASSIGNMENT_TYPES);

export interface RawReviewAssignmentListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export function parseReviewAssignmentListQuery(
  raw: RawReviewAssignmentListQuery,
): { ok: true; value: ReviewAssignmentListQuery } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'string' ? parseInt(raw.limit, 10) : raw.limit;
    if (Number.isNaN(n) || n < 1) errors.push('limit must be positive');
    else if (n > MAX_LIMIT) errors.push(`limit max ${MAX_LIMIT}`);
    else limit = n;
  }
  let cursor: string | null = null;
  if (raw.cursor !== undefined && raw.cursor !== '') cursor = raw.cursor;
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export function parseReviewAssignmentCreate(
  raw: unknown,
): { ok: true; value: ReviewAssignmentCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['submissionId'] !== 'string' || !UUID_RE.test(obj['submissionId']))
    errors.push('submissionId must be UUID');
  if (typeof obj['reviewerProfileId'] !== 'string' || !UUID_RE.test(obj['reviewerProfileId']))
    errors.push('reviewerProfileId must be UUID');
  if (typeof obj['assignmentType'] !== 'string' || !VALID_TYPES.has(obj['assignmentType']))
    errors.push('assignmentType invalid');
  if (errors.length > 0) return { ok: false, errors };
  const value: ReviewAssignmentCreate = {
    submissionId: obj['submissionId'] as string,
    reviewerProfileId: obj['reviewerProfileId'] as string,
    assignmentType: obj['assignmentType'] as AssignmentType,
  };
  if (typeof obj['dueAt'] === 'string')
    return { ok: true, value: { ...value, dueAt: obj['dueAt'] } };
  return { ok: true, value };
}

export function parseAssignmentId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

// --- repository ---

export interface ReviewAssignmentListResult {
  readonly items: readonly ReviewAssignmentRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface ReviewAssignmentRepository {
  listAssignments(
    actor: Actor,
    limit: number,
    cursor: string | null,
  ): Promise<ReviewAssignmentListResult>;
  getAssignment(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null>;
  createAssignment(actor: Actor, input: ReviewAssignmentCreate): Promise<ReviewAssignmentRecord>;
  acceptAssignment(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null>;
}

// --- domain ---

export interface ReviewAssignmentDeps {
  readonly repository: ReviewAssignmentRepository;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export type ListAssignmentsResult = Result<{
  page: { items: readonly ReviewAssignmentDto[]; nextCursor: string | null; total: number };
}>;
export type GetAssignmentResult = Result<{ assignment: ReviewAssignmentDto }>;
export type CreateAssignmentResult = Result<{ assignment: ReviewAssignmentDto }>;
export type AcceptAssignmentResult = Result<{ assignment: ReviewAssignmentDto }>;

export async function listReviewAssignments(
  deps: ReviewAssignmentDeps,
  actor: Actor,
  query: ReviewAssignmentListQuery,
): Promise<ListAssignmentsResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const decoded = query.cursor !== null ? decodeCursor(query.cursor) : null;
  const result = await deps.repository.listAssignments(actor, query.limit, decoded?.id ?? null);
  const items: ReviewAssignmentDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.assignedAt, id: lastItem.id })
      : null;
  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export async function getReviewAssignment(
  deps: ReviewAssignmentDeps,
  actor: Actor,
  id: string,
): Promise<GetAssignmentResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.getAssignment(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Assignment not found.' };
  return { ok: true, assignment: record };
}

export async function createReviewAssignment(
  deps: ReviewAssignmentDeps,
  actor: Actor,
  input: ReviewAssignmentCreate,
): Promise<CreateAssignmentResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  try {
    const record = await deps.repository.createAssignment(actor, input);
    return { ok: true, assignment: record };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'Duplicate assignment.' };
    }
    throw err;
  }
}

export async function acceptReviewAssignment(
  deps: ReviewAssignmentDeps,
  actor: Actor,
  id: string,
): Promise<AcceptAssignmentResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.acceptAssignment(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Assignment not found.' };
  return { ok: true, assignment: record };
}
