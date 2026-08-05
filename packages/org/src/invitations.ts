import { randomUUID } from 'node:crypto';
import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { InvitationRepository } from './invitation-repository.js';
import type { Actor } from './types.js';
import type {
  InvitationCreate,
  InvitationDto,
  InvitationListQuery,
  InvitationPageDto,
} from './invitation-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const CREATE_KEYS = new Set(['maxAttempts', 'validFrom', 'expiresAt']);

export interface RawInvitationListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseInvitationListQueryResult =
  | { readonly ok: true; readonly value: InvitationListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseInvitationListQuery(
  raw: RawInvitationListQuery,
): ParseInvitationListQueryResult {
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

export type ParseInvitationCreateResult =
  | { readonly ok: true; readonly value: InvitationCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseInvitationCreate(raw: unknown): ParseInvitationCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (typeof input.expiresAt !== 'string' || !ISO_DATE_RE.test(input.expiresAt)) {
    errors.push('expiresAt must be a valid ISO 8601 date-time string');
  }
  if (input.validFrom !== undefined) {
    if (typeof input.validFrom !== 'string' || !ISO_DATE_RE.test(input.validFrom)) {
      errors.push('validFrom must be a valid ISO 8601 date-time string');
    }
  }
  if (input.maxAttempts !== undefined) {
    if (
      typeof input.maxAttempts !== 'number' ||
      !Number.isInteger(input.maxAttempts) ||
      input.maxAttempts < 1
    ) {
      errors.push('maxAttempts must be a positive integer');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      expiresAt: input.expiresAt as string,
      ...(input.validFrom !== undefined ? { validFrom: input.validFrom as string } : {}),
      ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts as number } : {}),
    },
  };
}

export function parseInvitationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseApplicationIdParam(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface InvitationDeps {
  readonly repository: InvitationRepository;
  readonly permissions?: readonly Permission[];
  readonly generateTokenHash?: () => string;
}

export type ListInvitationsResult =
  | { readonly ok: true; readonly page: InvitationPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listInvitations(
  deps: InvitationDeps,
  actor: Actor,
  applicationId: string,
  query: InvitationListQuery,
): Promise<ListInvitationsResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listInvitations(actor, applicationId, query);
  const items: InvitationDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;
  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type GetInvitationResult =
  | { readonly ok: true; readonly invitation: InvitationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function getInvitation(
  deps: InvitationDeps,
  actor: Actor,
  id: string,
): Promise<GetInvitationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.getInvitation(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Invitation not found.' };
  return { ok: true, invitation: record };
}

export type CreateInvitationResult =
  | { readonly ok: true; readonly invitation: InvitationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function createInvitation(
  deps: InvitationDeps,
  actor: Actor,
  applicationId: string,
  input: InvitationCreate,
): Promise<CreateInvitationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const tokenHash = (deps.generateTokenHash ?? randomUUID)();
  const record = await deps.repository.createInvitation(actor, applicationId, input, tokenHash);
  return { ok: true, invitation: record };
}

export type RevokeInvitationResult =
  | { readonly ok: true; readonly invitation: InvitationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function revokeInvitation(
  deps: InvitationDeps,
  actor: Actor,
  id: string,
): Promise<RevokeInvitationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const existing = await deps.repository.getInvitation(actor, id);
  if (existing === null) return { ok: false, status: 404, reason: 'Invitation not found.' };

  const record = await deps.repository.revokeInvitation(actor, id);
  if (record === null) {
    return {
      ok: false,
      status: 409,
      reason: 'Invitation cannot be revoked from its current status.',
    };
  }
  return { ok: true, invitation: record };
}

export type ResendInvitationResult =
  | { readonly ok: true; readonly invitation: InvitationDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

export async function resendInvitation(
  deps: InvitationDeps,
  actor: Actor,
  id: string,
): Promise<ResendInvitationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.resendInvitation(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Invitation not found.' };
  return { ok: true, invitation: record };
}

export type ParseInvitationExtendResult =
  | { readonly ok: true; readonly value: { readonly expiresAt: string } }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseInvitationExtend(raw: unknown): ParseInvitationExtendResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  if (typeof input['expiresAt'] !== 'string' || !ISO_DATE_RE.test(input['expiresAt'])) {
    return { ok: false, errors: ['expiresAt must be an ISO 8601 date-time'] };
  }
  return { ok: true, value: { expiresAt: input['expiresAt'] } };
}

export type ExtendInvitationResult =
  | { readonly ok: true; readonly invitation: InvitationDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

export async function extendInvitation(
  deps: InvitationDeps,
  actor: Actor,
  id: string,
  expiresAt: string,
): Promise<ExtendInvitationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'invitation', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.extendInvitation(actor, id, expiresAt);
  if (record === null) return { ok: false, status: 404, reason: 'Invitation not found.' };
  return { ok: true, invitation: record };
}
