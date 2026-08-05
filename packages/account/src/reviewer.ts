import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { Actor } from './types.js';

const MAX_STRING = 200;
const MAX_LIST = 50;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ReviewerProfileRecord {
  readonly userId: string;
  readonly expertise: readonly string[];
  readonly qualifications: readonly string[];
  readonly languages: readonly string[];
  readonly maxConcurrent: number;
  readonly updatedAt: string;
}

export interface ReviewerProfileUpdate {
  expertise?: readonly string[];
  qualifications?: readonly string[];
  languages?: readonly string[];
  maxConcurrent?: number;
}

export interface ReviewerAvailabilityWindow {
  readonly id: string;
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
}

export interface ReviewerAvailabilityPage {
  readonly items: readonly ReviewerAvailabilityWindow[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface AvailabilityWindowInput {
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
}

export interface AvailabilityReplaceInput {
  readonly windows: readonly AvailabilityWindowInput[];
}

export interface ReviewerTrainingRecord {
  readonly id: string;
  readonly moduleCode: string;
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
  key: 'expertise' | 'qualifications' | 'languages',
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
  const allowed = new Set(['expertise', 'qualifications', 'languages', 'maxConcurrent']);
  const errors: string[] = [];
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) errors.push(`unknown property: ${key}`);
  }
  const value: ReviewerProfileUpdate = {};
  const expertise = readStringList(raw, 'expertise', errors);
  if (expertise !== undefined) value.expertise = expertise;
  const qualifications = readStringList(raw, 'qualifications', errors);
  if (qualifications !== undefined) value.qualifications = qualifications;
  const languages = readStringList(raw, 'languages', errors);
  if (languages !== undefined) value.languages = languages;
  if (raw.maxConcurrent !== undefined) {
    if (
      typeof raw.maxConcurrent !== 'number' ||
      !Number.isInteger(raw.maxConcurrent) ||
      raw.maxConcurrent < 0 ||
      raw.maxConcurrent > 100
    ) {
      errors.push('maxConcurrent must be an integer between 0 and 100');
    } else {
      value.maxConcurrent = raw.maxConcurrent;
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
    const { dayOfWeek, startTime, endTime } = entry;
    if (
      typeof dayOfWeek !== 'number' ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      errors.push('dayOfWeek must be an integer between 0 and 6');
      continue;
    }
    if (typeof startTime !== 'string' || !TIME_RE.test(startTime)) {
      errors.push('startTime must be an HH:MM time');
      continue;
    }
    if (typeof endTime !== 'string' || !TIME_RE.test(endTime)) {
      errors.push('endTime must be an HH:MM time');
      continue;
    }
    if (endTime <= startTime) {
      errors.push('endTime must be after startTime');
      continue;
    }
    parsed.push({ dayOfWeek, startTime, endTime });
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
