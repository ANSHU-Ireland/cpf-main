import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { ReviewerProfileRepository } from './reviewer-profile-repository.js';
import type { Actor } from './types.js';
import type {
  ReviewerProfileCreate,
  ReviewerProfileDto,
  ReviewerProfileListQuery,
  ReviewerProfilePageDto,
} from './reviewer-profile-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_EXPERTISE_ITEMS = 20;
const MAX_EXPERTISE_LEN = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_KEYS = new Set(['userId', 'expertise', 'maxActiveReviews']);

export interface RawReviewerProfileListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseProfileListQueryResult =
  | { readonly ok: true; readonly value: ReviewerProfileListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseProfileListQuery(
  raw: RawReviewerProfileListQuery,
): ParseProfileListQueryResult {
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

export type ParseProfileCreateResult =
  | { readonly ok: true; readonly value: ReviewerProfileCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseProfileCreate(raw: unknown): ParseProfileCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (typeof input.userId !== 'string' || !UUID_RE.test(input.userId)) {
    errors.push('userId must be a valid UUID');
  }

  if (input.expertise !== undefined) {
    if (!Array.isArray(input.expertise)) {
      errors.push('expertise must be an array of strings');
    } else if (input.expertise.length > MAX_EXPERTISE_ITEMS) {
      errors.push(`expertise must have at most ${MAX_EXPERTISE_ITEMS} items`);
    } else {
      for (const item of input.expertise) {
        if (typeof item !== 'string' || item.length === 0 || item.length > MAX_EXPERTISE_LEN) {
          errors.push(
            `each expertise item must be a non-empty string up to ${MAX_EXPERTISE_LEN} chars`,
          );
          break;
        }
      }
    }
  }

  if (input.maxActiveReviews !== undefined) {
    if (
      typeof input.maxActiveReviews !== 'number' ||
      !Number.isInteger(input.maxActiveReviews) ||
      input.maxActiveReviews < 1
    ) {
      errors.push('maxActiveReviews must be a positive integer');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      userId: input.userId as string,
      ...(input.expertise !== undefined ? { expertise: input.expertise as string[] } : {}),
      ...(input.maxActiveReviews !== undefined
        ? { maxActiveReviews: input.maxActiveReviews as number }
        : {}),
    },
  };
}

export interface ReviewerProfileDeps {
  readonly repository: ReviewerProfileRepository;
  readonly permissions?: readonly Permission[];
}

export type ListProfilesResult =
  | { readonly ok: true; readonly page: ReviewerProfilePageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listReviewerProfiles(
  deps: ReviewerProfileDeps,
  actor: Actor,
  query: ReviewerProfileListQuery,
): Promise<ListProfilesResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'reviewer_profile', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const result = await deps.repository.listProfiles(actor, query);
  const items: ReviewerProfileDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type CreateProfileResult =
  | { readonly ok: true; readonly profile: ReviewerProfileDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createReviewerProfile(
  deps: ReviewerProfileDeps,
  actor: Actor,
  input: ReviewerProfileCreate,
): Promise<CreateProfileResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'reviewer_profile', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const record = await deps.repository.createProfile(actor, input);
    return { ok: true, profile: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'A reviewer profile already exists for this user.' };
    }
    throw err;
  }
}
