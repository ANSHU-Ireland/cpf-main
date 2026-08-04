import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { OnboardingRepository } from './onboarding-repository.js';
import {
  USER_SETTABLE_ONBOARDING_STATUSES,
  type OnboardingListQuery,
  type OnboardingPageDto,
  type OnboardingStepDto,
  type OnboardingStepRecord,
  type OnboardingStepUpdate,
  type UserSettableOnboardingStatus,
} from './onboarding-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_STEP_CODE = 128;
const MAX_ROLE_CODE = 128;
const MAX_MATERIAL_VERSION = 128;
const MAX_REASON = 2000;

export type ParseOnboardingQueryResult =
  | { readonly ok: true; readonly value: OnboardingListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawOnboardingQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates `get_me_onboarding` query params (limit 1..100 default 25; opaque cursor). */
export function parseOnboardingQuery(raw: RawOnboardingQuery): ParseOnboardingQueryResult {
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

  let cursor = null as OnboardingListQuery['cursor'];
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

const ALLOWED_BODY_KEYS = new Set(['status', 'roleCode', 'materialVersion', 'reason']);

export type ParseOnboardingStepResult =
  | { readonly ok: true; readonly value: OnboardingStepUpdate }
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

/** Validates a `put_me_onboarding_stepCode` request: the path `stepCode` plus the command body. */
export function parseOnboardingStepUpdate(
  stepCode: unknown,
  raw: unknown,
): ParseOnboardingStepResult {
  const errors: string[] = [];

  const step = parseBoundedString(stepCode, 'stepCode', MAX_STEP_CODE, errors);

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: [...errors, 'body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;

  for (const key of Object.keys(input)) {
    if (!ALLOWED_BODY_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  const roleCode = parseBoundedString(input.roleCode, 'roleCode', MAX_ROLE_CODE, errors);

  let materialVersion: string | null = null;
  if (input.materialVersion !== undefined && input.materialVersion !== null) {
    const parsed = parseBoundedString(
      input.materialVersion,
      'materialVersion',
      MAX_MATERIAL_VERSION,
      errors,
    );
    materialVersion = parsed ?? null;
  }

  let status: UserSettableOnboardingStatus | undefined;
  if (
    typeof input.status !== 'string' ||
    !USER_SETTABLE_ONBOARDING_STATUSES.includes(input.status as UserSettableOnboardingStatus)
  ) {
    errors.push(`status must be one of: ${USER_SETTABLE_ONBOARDING_STATUSES.join(', ')}`);
  } else {
    status = input.status as UserSettableOnboardingStatus;
  }

  let reason: string | undefined;
  if (input.reason !== undefined) {
    const parsed = parseBoundedString(input.reason, 'reason', MAX_REASON, errors);
    if (parsed !== undefined) {
      reason = parsed;
    }
  }

  if (errors.length > 0 || step === undefined || roleCode === undefined || status === undefined) {
    return { ok: false, errors };
  }

  const value: OnboardingStepUpdate = { stepCode: step, roleCode, materialVersion, status };
  return { ok: true, value: reason === undefined ? value : { ...value, reason } };
}

export interface OnboardingDeps {
  readonly repository: OnboardingRepository;
  readonly permissions?: readonly Permission[];
}

export type ListOnboardingResult =
  | { readonly ok: true; readonly page: OnboardingPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export type UpdateOnboardingStepResult =
  | { readonly ok: true; readonly step: OnboardingStepDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

function authorize(actor: Actor, action: 'read' | 'write', permissions: readonly Permission[]) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_onboarding', tenantId: actor.tenantId },
    permissions,
  );
}

function toDto(record: OnboardingStepRecord): OnboardingStepDto {
  return {
    id: record.id,
    roleCode: record.roleCode,
    stepCode: record.stepCode,
    materialVersion: record.materialVersion,
    status: record.status,
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
  };
}

/** `get_me_onboarding`: deny-by-default read of the caller's own onboarding checklist. */
export async function listOnboarding(
  deps: OnboardingDeps,
  actor: Actor,
  query: OnboardingListQuery,
): Promise<ListOnboardingResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'read', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { items, total, hasMore } = await deps.repository.listOnboarding(actor, query);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last !== undefined ? encodeCursor({ ts: last.updatedAt, id: last.id }) : null;

  return { ok: true, page: { items: items.map(toDto), nextCursor, total } };
}

/** `put_me_onboarding_stepCode`: deny-by-default, audited update of one existing step (404 if absent). */
export async function updateOnboardingStep(
  deps: OnboardingDeps,
  actor: Actor,
  update: OnboardingStepUpdate,
): Promise<UpdateOnboardingStepResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'write', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const record = await deps.repository.updateStep(actor, update);
  if (record === null) {
    return { ok: false, status: 404, reason: 'onboarding step not found' };
  }
  return { ok: true, step: toDto(record) };
}
