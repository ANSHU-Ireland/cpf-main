import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import type { Actor } from './types.js';
import type { MemberListQuery, MemberRecord, MembershipStatus } from './member-types.js';

export interface MemberListResult {
  readonly items: readonly MemberRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface MemberRepository {
  listMembers(actor: Actor, query: MemberListQuery): Promise<MemberListResult>;
}

export interface PgMemberRepositoryOptions {
  readonly role?: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  status: MembershipStatus;
  department_id: string | null;
  team_id: string | null;
  starts_at: Date;
  ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
  roles: string | null;
}

function toRecord(row: MemberRow): MemberRecord {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    roles: row.roles ? row.roles.split(',') : [],
    departmentId: row.department_id,
    teamId: row.team_id,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at === null ? null : row.ends_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Reads the caller's tenant members. `iam.memberships` carries both `tenant_isolation` and
 * `v2_tenant_isolation` RLS on `tenant_id`, so `withTenant` + the `cpf_app` role ensures
 * automatic row-level scoping to the caller's tenant.
 */
export class PgMemberRepository implements MemberRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgMemberRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listMembers(actor: Actor, query: MemberListQuery): Promise<MemberListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM iam.memberships WHERE tenant_id = $1',
        [actor.tenantId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      const params: unknown[] = [actor.tenantId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (m.created_at, m.id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<MemberRow>(
        `SELECT m.id, m.user_id, u.email, u.display_name, m.status,
                m.department_id, m.team_id, m.starts_at, m.ends_at,
                m.created_at, m.updated_at,
                (SELECT string_agg(r.code, ',' ORDER BY r.code)
                   FROM iam.membership_roles mr
                   JOIN iam.roles r ON r.id = mr.role_id
                  WHERE mr.membership_id = m.id) AS roles
           FROM iam.memberships m
           JOIN iam.users u ON u.id = m.user_id
          WHERE m.tenant_id = $1
            ${keyset}
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }
}
