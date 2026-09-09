import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor, MembershipRecord, ProfileData, ProfileUpdate, UserRecord } from './types.js';

export interface AccountRepository {
  findProfileData(actor: Actor): Promise<ProfileData>;
  applyProfileUpdate(actor: Actor, patch: ProfileUpdate): Promise<ProfileData>;
}

export interface PgAccountRepositoryOptions {
  /** Least-privilege DB role to assume so RLS is enforced (superusers bypass RLS). */
  readonly role?: string;
}

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  user_type: string;
  status: string;
}

interface MembershipRow {
  tenant_id: string;
  status: string;
  roles: string[];
}

/** Maps validated patch fields to their `iam.user_profiles` columns (whitelist; no SQL injection). */
const PROFILE_COLUMNS: Readonly<Record<keyof ProfileUpdate, string>> = {
  preferredName: 'preferred_name',
  locale: 'locale',
  timezone: 'timezone',
  theme: 'theme',
  density: 'density',
  reducedMotion: 'reduced_motion',
};

/** Reads the caller's own user + current-tenant membership through the tenant RLS context. */
export class PgAccountRepository implements AccountRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgAccountRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async findProfileData(actor: Actor): Promise<ProfileData> {
    return withTenant(this.#pool, this.#context(actor), (client) => readProfile(client, actor));
  }

  async applyProfileUpdate(actor: Actor, patch: ProfileUpdate): Promise<ProfileData> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const entries = Object.entries(patch).filter(([, value]) => value !== undefined) as [
        keyof ProfileUpdate,
        unknown,
      ][];

      const columns = entries.map(([key]) => PROFILE_COLUMNS[key]);
      const values = entries.map(([, value]) => value);
      const insertCols = ['user_id', ...columns];
      const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`);
      const updates = columns.map((col) => `${col} = EXCLUDED.${col}`);

      await client.query(
        `INSERT INTO iam.user_profiles (${insertCols.join(', ')})
         VALUES (${insertPlaceholders.join(', ')})
         ON CONFLICT (user_id) DO UPDATE
           SET ${[...updates, 'updated_at = now()'].join(', ')}`,
        [actor.userId, ...values],
      );

      // `patch_me` is x-audit-event: true — record a hash-chained event in the same transaction.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'profile.update',
        resourceType: 'user_profile',
        resourceId: actor.userId,
        outcome: 'success',
        metadata: { fields: entries.map(([key]) => key) },
      });

      return readProfile(client, actor);
    });
  }
}

async function readProfile(client: PoolClient, actor: Actor): Promise<ProfileData> {
  const userRes = await client.query<UserRow>(
    `SELECT id, email, display_name, user_type, status
       FROM iam.users
      WHERE id = $1`,
    [actor.userId],
  );
  const userRow = userRes.rows[0];
  const user: UserRecord | null = userRow
    ? {
        id: userRow.id,
        email: userRow.email,
        displayName: userRow.display_name,
        userType: userRow.user_type,
        status: userRow.status,
      }
    : null;

  const memRes = await client.query<MembershipRow>(
    `SELECT m.tenant_id,
            m.status,
            COALESCE(
              array_agg(DISTINCT r.code ORDER BY r.code) FILTER (WHERE r.code IS NOT NULL),
              '{}'
            ) AS roles
       FROM iam.memberships m
       LEFT JOIN iam.membership_roles mr ON mr.membership_id = m.id
       LEFT JOIN iam.roles r ON r.id = mr.role_id
      WHERE m.user_id = $1 AND m.tenant_id = $2
      GROUP BY m.tenant_id, m.status`,
    [actor.userId, actor.tenantId],
  );
  const memRow = memRes.rows[0];
  const membership: MembershipRecord | null = memRow
    ? { tenantId: memRow.tenant_id, status: memRow.status, roles: memRow.roles }
    : null;

  return { user, membership };
}
