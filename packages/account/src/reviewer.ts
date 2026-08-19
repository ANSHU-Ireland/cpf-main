import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { Actor } from './types.js';

const MAX_STRING = 200;
const MAX_LIST = 50;

export interface ReviewerProfileRecord {
  readonly userId: string;
  readonly displayName: string;
  readonly expertise: readonly string[];
  readonly trainingStatus: string;
  readonly calibrationStatus: string;
  readonly conflictDeclarationRequired: boolean;
  readonly maxActiveReviews: number | null;
  readonly updatedAt: string;
}

export interface ReviewerProfileUpdate {
  displayName?: string;
  expertise?: readonly string[];
  maxActiveReviews?: number | null;
}

export interface ReviewerAvailabilityWindow {
  readonly id: string;
  readonly availableFrom: string;
  readonly availableTo: string;
  readonly capacity: number;
  readonly status: 'available' | 'unavailable' | 'tentative';
  readonly note: string | null;
}

export interface ReviewerAvailabilityPage {
  readonly items: readonly ReviewerAvailabilityWindow[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface AvailabilityWindowInput {
  readonly availableFrom: string;
  readonly availableTo: string;
  readonly capacity: number;
  readonly status: 'available' | 'unavailable' | 'tentative';
  readonly note?: string | null;
}

export interface AvailabilityReplaceInput {
  readonly windows: readonly AvailabilityWindowInput[];
}

export interface ReviewerTrainingRecord {
  readonly id: string;
  readonly trainingType: string;
  readonly materialVersion: string;
  readonly status: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
}

export interface ReviewerTrainingPage {
  readonly items: readonly ReviewerTrainingRecord[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface ReviewerListQuery {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface ReviewerRepository {
  getProfile(actor: Actor): Promise<ReviewerProfileRecord | null>;
  updateProfile(actor: Actor, input: ReviewerProfileUpdate): Promise<ReviewerProfileRecord | null>;
  listAvailability(actor: Actor, query: ReviewerListQuery): Promise<ReviewerAvailabilityPage>;
  replaceAvailability(
    actor: Actor,
    input: AvailabilityReplaceInput,
  ): Promise<readonly ReviewerAvailabilityWindow[]>;
  listTraining(actor: Actor, query: ReviewerListQuery): Promise<ReviewerTrainingPage>;
}

export interface ReviewerDeps {
  readonly repository: ReviewerRepository;
  readonly permissions?: readonly Permission[];
}

export type ParseResultReviewer<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };
type ParseResult<T> = ParseResultReviewer<T>;

type Result<T> =
  | ({ readonly ok: true } & T)
  | { readonly ok: false; readonly status: number; readonly reason: string };

function isObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function authorize(deps: ReviewerDeps, actor: Actor, action: 'read' | 'write'): boolean {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_reviewer', tenantId: actor.tenantId },
    deps.permissions ?? ACCOUNT_PERMISSIONS,
  );
  return decision.allowed;
}

function readStringList(
  input: Record<string, unknown>,
  key: 'expertise',
  errors: string[],
): readonly string[] | undefined {
  const v = input[key];
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > MAX_LIST) {
    errors.push(`${key} must be an array of up to ${MAX_LIST} strings`);
    return undefined;
  }
  for (const entry of v) {
    if (typeof entry !== 'string' || entry.length === 0 || entry.length > MAX_STRING) {
      errors.push(`${key} entries must be non-empty strings up to ${MAX_STRING} chars`);
      return undefined;
    }
  }
  return v as readonly string[];
}

export function parseReviewerListQuery(raw: unknown): ParseResult<ReviewerListQuery> {
  const input = isObject(raw) ? raw : {};
  const errors: string[] = [];
  let limit = 25;
  if (input.limit !== undefined) {
    if (
      typeof input.limit !== 'number' ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    ) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      limit = input.limit;
    }
  }
  let cursor: string | null = null;
  if (input.cursor !== undefined) {
    if (typeof input.cursor !== 'string' || input.cursor.length > 512) {
      errors.push('cursor must be a string');
    } else {
      cursor = input.cursor;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export function parseReviewerProfileUpdate(raw: unknown): ParseResult<ReviewerProfileUpdate> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const allowed = new Set(['displayName', 'expertise', 'maxActiveReviews']);
  const errors: string[] = [];
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) errors.push(`unknown property: ${key}`);
  }
  const value: ReviewerProfileUpdate = {};
  if (raw.displayName !== undefined) {
    if (
      typeof raw.displayName !== 'string' ||
      raw.displayName.trim().length < 2 ||
      raw.displayName.length > MAX_STRING
    ) {
      errors.push(`displayName must be between 2 and ${MAX_STRING} chars`);
    } else {
      value.displayName = raw.displayName.trim();
    }
  }
  const expertise = readStringList(raw, 'expertise', errors);
  if (expertise !== undefined) value.expertise = expertise;
  if (raw.maxActiveReviews !== undefined) {
    if (
      raw.maxActiveReviews !== null &&
      (typeof raw.maxActiveReviews !== 'number' ||
        !Number.isInteger(raw.maxActiveReviews) ||
        raw.maxActiveReviews < 0 ||
        raw.maxActiveReviews > 100)
    ) {
      errors.push('maxActiveReviews must be null or an integer between 0 and 100');
    } else {
      value.maxActiveReviews = raw.maxActiveReviews as number | null;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  if (Object.keys(value).length === 0) {
    return { ok: false, errors: ['at least one field must be provided'] };
  }
  return { ok: true, value };
}

export function parseAvailabilityReplace(raw: unknown): ParseResult<AvailabilityReplaceInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const windows = raw.windows;
  if (!Array.isArray(windows) || windows.length > MAX_LIST) {
    return { ok: false, errors: [`windows must be an array of up to ${MAX_LIST} entries`] };
  }
  const parsed: AvailabilityWindowInput[] = [];
  for (const entry of windows) {
    if (!isObject(entry)) {
      errors.push('each window must be an object');
      continue;
    }
    const { availableFrom, availableTo, capacity, status, note } = entry;
    const from = typeof availableFrom === 'string' ? Date.parse(availableFrom) : Number.NaN;
    const to = typeof availableTo === 'string' ? Date.parse(availableTo) : Number.NaN;
    if (!Number.isFinite(from)) {
      errors.push('availableFrom must be an ISO-8601 timestamp');
      continue;
    }
    if (!Number.isFinite(to)) {
      errors.push('availableTo must be an ISO-8601 timestamp');
      continue;
    }
    if (to <= from) {
      errors.push('availableTo must be after availableFrom');
      continue;
    }
    if (
      typeof capacity !== 'number' ||
      !Number.isInteger(capacity) ||
      capacity < 0 ||
      capacity > 100
    ) {
      errors.push('capacity must be an integer between 0 and 100');
      continue;
    }
    if (status !== 'available' && status !== 'unavailable' && status !== 'tentative') {
      errors.push('status must be available, unavailable, or tentative');
      continue;
    }
    if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 2_000)) {
      errors.push('note must be null or a string up to 2000 chars');
      continue;
    }
    parsed.push({
      availableFrom: new Date(from).toISOString(),
      availableTo: new Date(to).toISOString(),
      capacity,
      status,
      ...(note === undefined ? {} : { note: note as string | null }),
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { windows: parsed } };
}

/** `get_reviewer_profile`: read the caller's reviewer profile. */
export async function getReviewerProfile(
  deps: ReviewerDeps,
  actor: Actor,
): Promise<Result<{ profile: ReviewerProfileRecord }>> {
  if (!authorize(deps, actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  const profile = await deps.repository.getProfile(actor);
  if (profile === null) return { ok: false, status: 404, reason: 'Reviewer profile not found.' };
  return { ok: true, profile };
}

/** `patch_reviewer_profile`: update the caller's expertise and preferences. */
export async function updateReviewerProfile(
  deps: ReviewerDeps,
  actor: Actor,
  input: ReviewerProfileUpdate,
): Promise<Result<{ profile: ReviewerProfileRecord }>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const profile = await deps.repository.updateProfile(actor, input);
  if (profile === null) return { ok: false, status: 404, reason: 'Reviewer profile not found.' };
  return { ok: true, profile };
}

/** `get_reviewer_availability`: list the caller's availability windows. */
export async function listReviewerAvailability(
  deps: ReviewerDeps,
  actor: Actor,
  query: ReviewerListQuery,
): Promise<Result<{ page: ReviewerAvailabilityPage }>> {
  if (!authorize(deps, actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  const page = await deps.repository.listAvailability(actor, query);
  return { ok: true, page };
}

/** `put_reviewer_availability`: replace the caller's availability windows. */
export async function replaceReviewerAvailability(
  deps: ReviewerDeps,
  actor: Actor,
  input: AvailabilityReplaceInput,
): Promise<Result<{ windows: readonly ReviewerAvailabilityWindow[] }>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const windows = await deps.repository.replaceAvailability(actor, input);
  return { ok: true, windows };
}

/** `get_reviewer_training`: list the caller's training and calibration status. */
export async function listReviewerTraining(
  deps: ReviewerDeps,
  actor: Actor,
  query: ReviewerListQuery,
): Promise<Result<{ page: ReviewerTrainingPage }>> {
  if (!authorize(deps, actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  const page = await deps.repository.listTraining(actor, query);
  return { ok: true, page };
}
