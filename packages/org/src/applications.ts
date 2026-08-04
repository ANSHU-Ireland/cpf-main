import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { ApplicationRepository } from './application-repository.js';
import type { Actor } from './types.js';
import type {
  ApplicationCreate,
  ApplicationDto,
  ApplicationListQuery,
  ApplicationPageDto,
  ApplicationStatus,
  ApplicationStatusUpdate,
} from './application-types.js';
import { APPLICATION_STATUSES } from './application-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_SOURCE = 100;
const MAX_SOURCE_REF = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['candidateId', 'source', 'sourceReference']);
const STATUS_UPDATE_KEYS = new Set(['status']);

export interface RawApplicationListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseApplicationListQueryResult =
  | { readonly ok: true; readonly value: ApplicationListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseApplicationListQuery(
  raw: RawApplicationListQuery,
): ParseApplicationListQueryResult {
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

export type ParseApplicationCreateResult =
  | { readonly ok: true; readonly value: ApplicationCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseApplicationCreate(raw: unknown): ParseApplicationCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (typeof input.candidateId !== 'string' || !UUID_RE.test(input.candidateId)) {
    errors.push('candidateId must be a valid UUID');
  }
  if (input.source !== undefined) {
    if (
      typeof input.source !== 'string' ||
      input.source.length === 0 ||
      input.source.length > MAX_SOURCE
    ) {
      errors.push(`source must be a non-empty string up to ${MAX_SOURCE} chars`);
    }
  }
  if (input.sourceReference !== undefined) {
    if (
      typeof input.sourceReference !== 'string' ||
      input.sourceReference.length > MAX_SOURCE_REF
    ) {
      errors.push(`sourceReference must be a string up to ${MAX_SOURCE_REF} chars`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      candidateId: input.candidateId as string,
      ...(input.source !== undefined ? { source: input.source as string } : {}),
      ...(input.sourceReference !== undefined
        ? { sourceReference: input.sourceReference as string }
        : {}),
    },
  };
}

export type ParseApplicationStatusUpdateResult =
  | { readonly ok: true; readonly value: ApplicationStatusUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseApplicationStatusUpdate(raw: unknown): ParseApplicationStatusUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!STATUS_UPDATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (
    typeof input.status !== 'string' ||
    !APPLICATION_STATUSES.includes(input.status as ApplicationStatus)
  ) {
    errors.push(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { status: input.status as ApplicationStatus } };
}

export function parseApplicationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface ApplicationDeps {
  readonly repository: ApplicationRepository;
  readonly permissions?: readonly Permission[];
}

export type ListApplicationsResult =
  | { readonly ok: true; readonly page: ApplicationPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listApplications(
  deps: ApplicationDeps,
  actor: Actor,
  campaignId: string,
  query: ApplicationListQuery,
): Promise<ListApplicationsResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'application', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listApplications(actor, campaignId, query);
  const items: ApplicationDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type GetApplicationResult =
  | { readonly ok: true; readonly application: ApplicationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function getApplication(
  deps: ApplicationDeps,
  actor: Actor,
  applicationId: string,
): Promise<GetApplicationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'application', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.getApplication(actor, applicationId);
  if (record === null) return { ok: false, status: 404, reason: 'Application not found.' };
  return { ok: true, application: record };
}

export type CreateApplicationResult =
  | { readonly ok: true; readonly application: ApplicationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createApplication(
  deps: ApplicationDeps,
  actor: Actor,
  campaignId: string,
  input: ApplicationCreate,
): Promise<CreateApplicationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'application', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const record = await deps.repository.createApplication(actor, campaignId, input);
    return { ok: true, application: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return {
        ok: false,
        status: 409,
        reason: 'This candidate already has an application for this campaign.',
      };
    }
    throw err;
  }
}

export type UpdateApplicationStatusResult =
  | { readonly ok: true; readonly application: ApplicationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function updateApplicationStatus(
  deps: ApplicationDeps,
  actor: Actor,
  applicationId: string,
  input: ApplicationStatusUpdate,
): Promise<UpdateApplicationStatusResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'application', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.updateApplicationStatus(actor, applicationId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Application not found.' };
  return { ok: true, application: record };
}
