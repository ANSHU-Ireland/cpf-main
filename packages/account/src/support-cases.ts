import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { SupportCaseRepository } from './support-case-repository.js';
import {
  SUPPORT_SEVERITIES,
  type SupportCaseCreate,
  type SupportCaseDto,
  type SupportCaseListQuery,
  type SupportCasePageDto,
  type SupportCaseRecord,
  type SupportSeverity,
} from './support-case-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_CATEGORY = 128;
const MAX_SUBJECT = 256;
const MAX_DESCRIPTION = 8000;
const MAX_PURPOSE = 512;

export type ParseSupportCaseQueryResult =
  | { readonly ok: true; readonly value: SupportCaseListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawSupportCaseQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates `get_me_support_cases` query params (limit 1..100 default 25; opaque cursor). */
export function parseSupportCaseQuery(raw: RawSupportCaseQuery): ParseSupportCaseQueryResult {
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

  let cursor = null as SupportCaseListQuery['cursor'];
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

const ALLOWED_CREATE_KEYS = new Set(['category', 'severity', 'subject', 'description', 'purpose']);

export type ParseSupportCaseCreateResult =
  | { readonly ok: true; readonly value: SupportCaseCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

function parseBoundedString(
  value: unknown,
  field: string,
  max: number,
  errors: string[],
): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    errors.push(`${field} must be a non-empty string up to ${max} chars`);
    return undefined;
  }
  return value;
}

/** Validates a `post_me_support_cases` body; every field is required. */
export function parseSupportCaseCreate(raw: unknown): ParseSupportCaseCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  const category = parseBoundedString(input.category, 'category', MAX_CATEGORY, errors);
  const subject = parseBoundedString(input.subject, 'subject', MAX_SUBJECT, errors);
  const description = parseBoundedString(input.description, 'description', MAX_DESCRIPTION, errors);
  const purpose = parseBoundedString(input.purpose, 'purpose', MAX_PURPOSE, errors);

  let severity: SupportSeverity | undefined;
  if (
    typeof input.severity !== 'string' ||
    !SUPPORT_SEVERITIES.includes(input.severity as SupportSeverity)
  ) {
    errors.push(`severity must be one of: ${SUPPORT_SEVERITIES.join(', ')}`);
  } else {
    severity = input.severity as SupportSeverity;
  }

  if (
    errors.length > 0 ||
    category === undefined ||
    subject === undefined ||
    description === undefined ||
    purpose === undefined ||
    severity === undefined
  ) {
    return { ok: false, errors };
  }

  return { ok: true, value: { category, severity, subject, description, purpose } };
}

export interface SupportCaseDeps {
  readonly repository: SupportCaseRepository;
  readonly permissions?: readonly Permission[];
}

export type ListSupportCasesResult =
  | { readonly ok: true; readonly page: SupportCasePageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export type CreateSupportCaseResult =
  | { readonly ok: true; readonly supportCase: SupportCaseDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

function authorize(actor: Actor, action: 'read' | 'write', permissions: readonly Permission[]) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_support_case', tenantId: actor.tenantId },
    permissions,
  );
}

/** `get_me_support_cases`: deny-by-default read of the caller's own support cases. */
export async function listSupportCases(
  deps: SupportCaseDeps,
  actor: Actor,
  query: SupportCaseListQuery,
): Promise<ListSupportCasesResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'read', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { items, total, hasMore } = await deps.repository.listCases(actor, query);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last !== undefined ? encodeCursor({ ts: last.createdAt, id: last.id }) : null;

  return { ok: true, page: { items: items.map(toDto), nextCursor, total } };
}

/** `post_me_support_cases`: deny-by-default, audited creation of the caller's own case. */
export async function createSupportCase(
  deps: SupportCaseDeps,
  actor: Actor,
  input: SupportCaseCreate,
): Promise<CreateSupportCaseResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'write', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const record = await deps.repository.createCase(actor, input);
  return { ok: true, supportCase: toDto(record) };
}

function toDto(record: SupportCaseRecord): SupportCaseDto {
  return record;
}
