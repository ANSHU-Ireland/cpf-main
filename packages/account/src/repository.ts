import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import type { Actor, MembershipRecord, ProfileData, UserRecord } from './types.js';

export interface AccountRepository {
  findProfileData(actor: Actor): Promise<ProfileData>;
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

/** Reads the caller's own user + current-tenant membership through the tenant RLS context. */
export class PgAccountRepository implements AccountRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgAccountRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  async findProfileData(actor: Actor): Promise<ProfileData> {
    const ctx: TenantContext =
      this.#role === undefined
        ? { tenantId: actor.tenantId, userId: actor.userId }
        : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };

    return withTenant(this.#pool, ctx, async (client) => {
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
                COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
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
    });
  }
}
