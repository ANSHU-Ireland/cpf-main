import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { OrganizationRepository } from './organization-repository.js';
import type { Actor, OrganizationDto, OrganizationRecord, OrganizationUpdate } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_DISPLAY_NAME = 200;
const MAX_TIMEZONE = 64;
const MAX_JSONB_KEYS = 100;

/** Validated `get_organization` query. The org root has no child collection, so paging is inert. */
export interface OrganizationQuery {
  readonly limit: number;
}

export type ParseOrganizationQueryResult =
  | { readonly ok: true; readonly value: OrganizationQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Raw query string values as received at the HTTP boundary (all optional). */
export interface RawOrganizationQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates the declared `limit`/`cursor` params (bounds only; they do not affect the single-row read). */
export function parseOrganizationQuery(raw: RawOrganizationQuery): ParseOrganizationQueryResult {
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

  if (raw.cursor !== undefined && raw.cursor.length > MAX_CURSOR) {
    errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { limit } };
}

export interface OrganizationDeps {
  readonly repository: OrganizationRepository;
  readonly permissions?: readonly Permission[];
}

export type GetOrganizationResult =
  | { readonly ok: true; readonly organization: OrganizationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404 };

/**
 * `get_organization` (FR-EA-01): deny-by-default read of the caller's own organisation, gated on the
 * Employer Admin role. A missing organisation is reported as 404.
 */
export async function getOrganization(
  deps: OrganizationDeps,
  actor: Actor,
): Promise<GetOrganizationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'organization', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const record = await deps.repository.getOrganization(actor);
  if (record === null) {
    return { ok: false, status: 404 };
  }
  return { ok: true, organization: toDto(record) };
}

const UPDATE_KEYS = new Set(['displayName', 'defaultTimezone', 'branding', 'settings']);

export type ParseOrganizationUpdateResult =
  | { readonly ok: true; readonly value: OrganizationUpdate }
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

function parseJsonObject(
  value: unknown,
  field: string,
  errors: string[],
): Readonly<Record<string, unknown>> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${field} must be a JSON object`);
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_JSONB_KEYS) {
    errors.push(`${field} must contain at most ${MAX_JSONB_KEYS} keys`);
    return undefined;
  }
  return value as Record<string, unknown>;
}

/**
 * Validates a `patch_organization` body: a partial update over the writable subset only. Unknown or
 * immutable keys (`slug`, `status`, `legalName`, ...) are rejected, and at least one field is required.
 */
export function parseOrganizationUpdate(raw: unknown): ParseOrganizationUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!UPDATE_KEYS.has(key)) {
      errors.push(`unknown or immutable property: ${key}`);
    }
  }

  const update: {
    displayName?: string;
    defaultTimezone?: string;
    branding?: Readonly<Record<string, unknown>>;
    settings?: Readonly<Record<string, unknown>>;
  } = {};

  if (input.displayName !== undefined) {
    const displayName = parseBoundedString(
      input.displayName,
      'displayName',
      MAX_DISPLAY_NAME,
      errors,
    );
    if (displayName !== undefined) {
      update.displayName = displayName;
    }
  }
  if (input.defaultTimezone !== undefined) {
    const defaultTimezone = parseBoundedString(
      input.defaultTimezone,
      'defaultTimezone',
      MAX_TIMEZONE,
      errors,
    );
    if (defaultTimezone !== undefined) {
      update.defaultTimezone = defaultTimezone;
    }
  }
  if (input.branding !== undefined) {
    const branding = parseJsonObject(input.branding, 'branding', errors);
    if (branding !== undefined) {
      update.branding = branding;
    }
  }
  if (input.settings !== undefined) {
    const settings = parseJsonObject(input.settings, 'settings', errors);
    if (settings !== undefined) {
      update.settings = settings;
    }
  }

  if (errors.length === 0 && Object.keys(update).length === 0) {
    errors.push('at least one updatable field is required');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: update };
}

export type UpdateOrganizationResult =
  | { readonly ok: true; readonly organization: OrganizationDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404 };

/**
 * `patch_organization` (FR-EA-01): deny-by-default audited update of the caller's own organisation,
 * gated on the Employer Admin role. A missing organisation is reported as 404.
 */
export async function updateOrganization(
  deps: OrganizationDeps,
  actor: Actor,
  update: OrganizationUpdate,
): Promise<UpdateOrganizationResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const record = await deps.repository.updateOrganization(actor, update);
  if (record === null) {
    return { ok: false, status: 404 };
  }
  return { ok: true, organization: toDto(record) };
}

function toDto(record: OrganizationRecord): OrganizationDto {
  return record;
}
