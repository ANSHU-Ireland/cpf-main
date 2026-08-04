import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { SupportCaseDetailRepository } from './support-case-detail-repository.js';
import type {
  SupportCaseDetailDto,
  SupportMessageCreate,
  SupportMessageDto,
  SupportMessageListQuery,
} from './support-message-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_BODY = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards the `{caseId}` path segment before it reaches a `uuid` column. */
export function isSupportCaseId(value: string): boolean {
  return UUID_RE.test(value);
}

export type ParseSupportMessageQueryResult =
  | { readonly ok: true; readonly value: SupportMessageListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawSupportMessageQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates the thread query on `get_me_support_cases_caseId` (limit 1..100 default 25). */
export function parseSupportMessageQuery(
  raw: RawSupportMessageQuery,
): ParseSupportMessageQueryResult {
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

  let cursor = null as SupportMessageListQuery['cursor'];
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

const ALLOWED_MESSAGE_KEYS = new Set(['body']);

export type ParseSupportMessageCreateResult =
  | { readonly ok: true; readonly value: SupportMessageCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Validates a `post_me_support_cases_caseId_messages` body (`body` required; attachments deferred). */
export function parseSupportMessageCreate(raw: unknown): ParseSupportMessageCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_MESSAGE_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  const body = input.body;
  if (typeof body !== 'string' || body.length === 0 || body.length > MAX_BODY) {
    errors.push(`body must be a non-empty string up to ${MAX_BODY} chars`);
  }

  if (errors.length > 0 || typeof body !== 'string') {
    return { ok: false, errors };
  }
  return { ok: true, value: { body } };
}

export interface SupportCaseDetailDeps {
  readonly repository: SupportCaseDetailRepository;
  readonly permissions?: readonly Permission[];
}

export type GetSupportCaseResult =
  | { readonly ok: true; readonly detail: SupportCaseDetailDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404 };

export type AddSupportMessageResult =
  | { readonly ok: true; readonly message: SupportMessageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404 };

function authorize(actor: Actor, action: 'read' | 'write', permissions: readonly Permission[]) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_support_case', tenantId: actor.tenantId },
    permissions,
  );
}

/**
 * `get_me_support_cases_caseId`: deny-by-default read of the caller's own case plus a page of its
 * requester-visible messages. A missing or non-owned case is reported as 404 (never distinguished).
 */
export async function getSupportCase(
  deps: SupportCaseDetailDeps,
  actor: Actor,
  caseId: string,
  query: SupportMessageListQuery,
): Promise<GetSupportCaseResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'read', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const result = await deps.repository.getCaseDetail(actor, caseId, query);
  if (result === null) {
    return { ok: false, status: 404 };
  }

  const { supportCase, messages } = result;
  const last = messages.items[messages.items.length - 1];
  const nextCursor =
    messages.hasMore && last !== undefined
      ? encodeCursor({ ts: last.createdAt, id: last.id })
      : null;

  return {
    ok: true,
    detail: {
      ...supportCase,
      messages: { items: messages.items, nextCursor, total: messages.total },
    },
  };
}

/**
 * `post_me_support_cases_caseId_messages`: deny-by-default, audited add of a requester-visible
 * message to the caller's own case. A missing or non-owned case is reported as 404.
 */
export async function addSupportMessage(
  deps: SupportCaseDetailDeps,
  actor: Actor,
  caseId: string,
  input: SupportMessageCreate,
): Promise<AddSupportMessageResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'write', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const message = await deps.repository.addMessage(actor, caseId, input);
  if (message === null) {
    return { ok: false, status: 404 };
  }
  return { ok: true, message };
}
