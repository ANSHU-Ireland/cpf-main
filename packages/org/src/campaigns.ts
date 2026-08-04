import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { CampaignRepository } from './campaign-repository.js';
import type { Actor } from './types.js';
import type {
  CampaignCreate,
  CampaignDto,
  CampaignListQuery,
  CampaignPageDto,
  CampaignUpdate,
} from './campaign-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_CODE = 100;
const MAX_TITLE = 200;
const MAX_ROLE = 200;
const MAX_SENIORITY = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['code', 'title', 'roleName', 'seniority', 'departmentId', 'teamId']);
const UPDATE_KEYS = new Set(['title', 'roleName', 'seniority', 'departmentId', 'teamId']);

export interface RawCampaignListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseCampaignListQueryResult =
  | { readonly ok: true; readonly value: CampaignListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseCampaignListQuery(raw: RawCampaignListQuery): ParseCampaignListQueryResult {
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

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export type ParseCampaignCreateResult =
  | { readonly ok: true; readonly value: CampaignCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseCampaignCreate(raw: unknown): ParseCampaignCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (typeof input.code !== 'string' || input.code.length === 0 || input.code.length > MAX_CODE) {
    errors.push(`code must be a non-empty string up to ${MAX_CODE} chars`);
  }
  if (
    typeof input.title !== 'string' ||
    input.title.length === 0 ||
    input.title.length > MAX_TITLE
  ) {
    errors.push(`title must be a non-empty string up to ${MAX_TITLE} chars`);
  }
  if (
    typeof input.roleName !== 'string' ||
    input.roleName.length === 0 ||
    input.roleName.length > MAX_ROLE
  ) {
    errors.push(`roleName must be a non-empty string up to ${MAX_ROLE} chars`);
  }
  if (
    typeof input.seniority !== 'string' ||
    input.seniority.length === 0 ||
    input.seniority.length > MAX_SENIORITY
  ) {
    errors.push(`seniority must be a non-empty string up to ${MAX_SENIORITY} chars`);
  }
  if (input.departmentId !== undefined) {
    if (typeof input.departmentId !== 'string' || !UUID_RE.test(input.departmentId)) {
      errors.push('departmentId must be a valid UUID');
    }
  }
  if (input.teamId !== undefined) {
    if (typeof input.teamId !== 'string' || !UUID_RE.test(input.teamId)) {
      errors.push('teamId must be a valid UUID');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      code: input.code as string,
      title: input.title as string,
      roleName: input.roleName as string,
      seniority: input.seniority as string,
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId as string } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId as string } : {}),
    },
  };
}

export type ParseCampaignUpdateResult =
  | { readonly ok: true; readonly value: CampaignUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseCampaignUpdate(raw: unknown): ParseCampaignUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!UPDATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  const hasField =
    input.title !== undefined ||
    input.roleName !== undefined ||
    input.seniority !== undefined ||
    input.departmentId !== undefined ||
    input.teamId !== undefined;
  if (!hasField) {
    errors.push('at least one field is required');
  }

  if (input.title !== undefined) {
    if (
      typeof input.title !== 'string' ||
      input.title.length === 0 ||
      input.title.length > MAX_TITLE
    ) {
      errors.push(`title must be a non-empty string up to ${MAX_TITLE} chars`);
    }
  }
  if (input.roleName !== undefined) {
    if (
      typeof input.roleName !== 'string' ||
      input.roleName.length === 0 ||
      input.roleName.length > MAX_ROLE
    ) {
      errors.push(`roleName must be a non-empty string up to ${MAX_ROLE} chars`);
    }
  }
  if (input.seniority !== undefined) {
    if (
      typeof input.seniority !== 'string' ||
      input.seniority.length === 0 ||
      input.seniority.length > MAX_SENIORITY
    ) {
      errors.push(`seniority must be a non-empty string up to ${MAX_SENIORITY} chars`);
    }
  }
  if (input.departmentId !== undefined && input.departmentId !== null) {
    if (typeof input.departmentId !== 'string' || !UUID_RE.test(input.departmentId)) {
      errors.push('departmentId must be a valid UUID or null');
    }
  }
  if (input.teamId !== undefined && input.teamId !== null) {
    if (typeof input.teamId !== 'string' || !UUID_RE.test(input.teamId)) {
      errors.push('teamId must be a valid UUID or null');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(input.title !== undefined ? { title: input.title as string } : {}),
      ...(input.roleName !== undefined ? { roleName: input.roleName as string } : {}),
      ...(input.seniority !== undefined ? { seniority: input.seniority as string } : {}),
      ...(input.departmentId !== undefined
        ? { departmentId: input.departmentId as string | null }
        : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId as string | null } : {}),
    },
  };
}

export function parseCampaignId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface CampaignDeps {
  readonly repository: CampaignRepository;
  readonly permissions?: readonly Permission[];
}

export type ListCampaignsResult =
  | { readonly ok: true; readonly page: CampaignPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listCampaigns(
  deps: CampaignDeps,
  actor: Actor,
  query: CampaignListQuery,
): Promise<ListCampaignsResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listCampaigns(actor, query);
  const items: CampaignDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type GetCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function getCampaign(
  deps: CampaignDeps,
  actor: Actor,
  id: string,
): Promise<GetCampaignResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.getCampaign(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'Campaign not found.' };
  return { ok: true, campaign: record };
}

export type CreateCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createCampaign(
  deps: CampaignDeps,
  actor: Actor,
  input: CampaignCreate,
): Promise<CreateCampaignResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const record = await deps.repository.createCampaign(actor, input);
    return { ok: true, campaign: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'A campaign with that code already exists.' };
    }
    throw err;
  }
}

export type UpdateCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function updateCampaign(
  deps: CampaignDeps,
  actor: Actor,
  id: string,
  input: CampaignUpdate,
): Promise<UpdateCampaignResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.updateCampaign(actor, id, input);
  if (record === null) return { ok: false, status: 404, reason: 'Campaign not found.' };
  return { ok: true, campaign: record };
}
