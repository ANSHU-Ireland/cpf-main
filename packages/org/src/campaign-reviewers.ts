import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { CampaignReviewerRepository } from './campaign-reviewer-repository.js';
import type { Actor } from './types.js';
import type {
  CampaignReviewerCreate,
  CampaignReviewerDto,
  CampaignReviewerListQuery,
  CampaignReviewerPageDto,
  CampaignReviewerUpdate,
} from './campaign-reviewer-types.js';
import { CAMPAIGN_REVIEWER_ROLES, CONFLICT_STATUSES } from './campaign-reviewer-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['reviewerProfileId', 'role']);
const UPDATE_KEYS = new Set(['role', 'conflictStatus']);

export interface RawReviewerListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseReviewerListQueryResult =
  | { readonly ok: true; readonly value: CampaignReviewerListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseReviewerListQuery(raw: RawReviewerListQuery): ParseReviewerListQueryResult {
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

export type ParseReviewerCreateResult =
  | { readonly ok: true; readonly value: CampaignReviewerCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseReviewerCreate(raw: unknown): ParseReviewerCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (typeof input.reviewerProfileId !== 'string' || !UUID_RE.test(input.reviewerProfileId)) {
    errors.push('reviewerProfileId must be a valid UUID');
  }
  if (typeof input.role !== 'string' || !CAMPAIGN_REVIEWER_ROLES.includes(input.role as never)) {
    errors.push(`role must be one of: ${CAMPAIGN_REVIEWER_ROLES.join(', ')}`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      reviewerProfileId: input.reviewerProfileId as string,
      role: input.role as CampaignReviewerCreate['role'],
    },
  };
}

export type ParseReviewerUpdateResult =
  | { readonly ok: true; readonly value: CampaignReviewerUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseReviewerUpdate(raw: unknown): ParseReviewerUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!UPDATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (input.role === undefined && input.conflictStatus === undefined) {
    errors.push('at least one field is required');
  }

  if (input.role !== undefined) {
    if (typeof input.role !== 'string' || !CAMPAIGN_REVIEWER_ROLES.includes(input.role as never)) {
      errors.push(`role must be one of: ${CAMPAIGN_REVIEWER_ROLES.join(', ')}`);
    }
  }
  if (input.conflictStatus !== undefined) {
    if (
      typeof input.conflictStatus !== 'string' ||
      !CONFLICT_STATUSES.includes(input.conflictStatus as never)
    ) {
      errors.push(`conflictStatus must be one of: ${CONFLICT_STATUSES.join(', ')}`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const value: CampaignReviewerUpdate = {};
  if (input.role !== undefined) {
    (value as { role: CampaignReviewerUpdate['role'] }).role =
      input.role as CampaignReviewerUpdate['role'];
  }
  if (input.conflictStatus !== undefined) {
    (value as { conflictStatus: CampaignReviewerUpdate['conflictStatus'] }).conflictStatus =
      input.conflictStatus as CampaignReviewerUpdate['conflictStatus'];
  }
  return { ok: true, value };
}

export function parseReviewerId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface CampaignReviewerDeps {
  readonly repository: CampaignReviewerRepository;
  readonly permissions?: readonly Permission[];
}

export type ListReviewersResult =
  | { readonly ok: true; readonly page: CampaignReviewerPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listCampaignReviewers(
  deps: CampaignReviewerDeps,
  actor: Actor,
  campaignId: string,
  query: CampaignReviewerListQuery,
): Promise<ListReviewersResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign_reviewer', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listReviewers(actor, campaignId, query);
  const items: CampaignReviewerDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type AddReviewerResult =
  | { readonly ok: true; readonly reviewer: CampaignReviewerDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function addCampaignReviewer(
  deps: CampaignReviewerDeps,
  actor: Actor,
  campaignId: string,
  input: CampaignReviewerCreate,
): Promise<AddReviewerResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign_reviewer', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const record = await deps.repository.addReviewer(actor, campaignId, input);
    return { ok: true, reviewer: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return {
        ok: false,
        status: 409,
        reason: 'This reviewer is already assigned to the campaign in that role.',
      };
    }
    throw err;
  }
}

export type DeactivateReviewerResult =
  | { readonly ok: true; readonly reviewer: CampaignReviewerDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function deactivateCampaignReviewer(
  deps: CampaignReviewerDeps,
  actor: Actor,
  campaignId: string,
  reviewerId: string,
): Promise<DeactivateReviewerResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign_reviewer', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.deactivateReviewer(actor, campaignId, reviewerId);
  if (record === null) return { ok: false, status: 404, reason: 'Campaign reviewer not found.' };
  return { ok: true, reviewer: record };
}

export type UpdateReviewerResult =
  | { readonly ok: true; readonly reviewer: CampaignReviewerDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string };

export async function updateCampaignReviewer(
  deps: CampaignReviewerDeps,
  actor: Actor,
  campaignId: string,
  reviewerId: string,
  input: CampaignReviewerUpdate,
): Promise<UpdateReviewerResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign_reviewer', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const record = await deps.repository.updateReviewer(actor, campaignId, reviewerId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Campaign reviewer not found.' };
  return { ok: true, reviewer: record };
}
