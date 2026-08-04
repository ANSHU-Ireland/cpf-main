import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import type { Actor } from './types.js';
import type { OrganizationRecord, OrganizationStatus } from './types.js';

export interface OrganizationRepository {
  /** Loads the caller's own organisation, or `null` if it does not exist. */
  getOrganization(actor: Actor): Promise<OrganizationRecord | null>;
}

export interface PgOrganizationRepositoryOptions {
  /** Least-privilege DB role to assume for defence-in-depth. */
  readonly role?: string;
}

interface OrganizationRow {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  status: OrganizationStatus;
  data_region: string;
  default_timezone: string;
  branding: unknown;
  settings: unknown;
  created_at: Date;
  updated_at: Date;
  suspended_at: Date | null;
  terminated_at: Date | null;
}

function toJsonObject(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toRecord(row: OrganizationRow): OrganizationRecord {
  return {
    id: row.id,
    slug: row.slug,
    legalName: row.legal_name,
    displayName: row.display_name,
    status: row.status,
    dataRegion: row.data_region,
    defaultTimezone: row.default_timezone,
    branding: toJsonObject(row.branding),
    settings: toJsonObject(row.settings),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    suspendedAt: row.suspended_at === null ? null : row.suspended_at.toISOString(),
    terminatedAt: row.terminated_at === null ? null : row.terminated_at.toISOString(),
  };
}

const COLUMNS = `id, slug, legal_name, display_name, status, data_region, default_timezone,
                 branding, settings, created_at, updated_at, suspended_at, terminated_at`;

/**
 * Reads the caller's own organisation. `tenant.organizations` carries no row-level security, so the
 * caller is scoped by the `id = $1` predicate (`$1` = the caller's tenant); there is no cross-tenant path.
 */
export class PgOrganizationRepository implements OrganizationRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgOrganizationRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async getOrganization(actor: Actor): Promise<OrganizationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<OrganizationRow>(
        `SELECT ${COLUMNS} FROM tenant.organizations WHERE id = $1`,
        [actor.tenantId],
      );
      const row = res.rows[0];
      return row === undefined ? null : toRecord(row);
    });
  }
}
