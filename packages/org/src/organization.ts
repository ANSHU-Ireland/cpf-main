import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { OrganizationRepository } from './organization-repository.js';
import type { Actor, OrganizationDto, OrganizationRecord } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;

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

function toDto(record: OrganizationRecord): OrganizationDto {
  return record;
}
