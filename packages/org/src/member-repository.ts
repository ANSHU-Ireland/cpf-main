import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  MemberListQuery,
  MemberRecord,
  MemberRolesUpdate,
  MembershipStatus,
  MemberStatusUpdate,
} from './member-types.js';

export interface MemberListResult {
  readonly items: readonly MemberRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface MemberRepository {
  listMembers(actor: Actor, query: MemberListQuery): Promise<MemberListResult>;
  updateMemberStatus(
    actor: Actor,
    memberId: string,
    input: MemberStatusUpdate,
  ): Promise<MemberRecord | null>;
  replaceMemberRoles(
    actor: Actor,
    memberId: string,
    input: MemberRolesUpdate,
  ): Promise<MemberRecord | null>;
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

  async updateMemberStatus(
    actor: Actor,
    memberId: string,
    input: MemberStatusUpdate,
  ): Promise<MemberRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<MemberRow>(
        `UPDATE iam.memberships SET status = $3, updated_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING id, user_id, status, department_id, team_id, starts_at, ends_at, created_at, updated_at`,
        [actor.tenantId, memberId, input.status],
      );
      if (res.rows.length === 0) return null;

      const mRow = res.rows[0]!;
      const userRes = await client.query<{ email: string | null; display_name: string | null }>(
        'SELECT email, display_name FROM iam.users WHERE id = $1',
        [mRow.user_id],
      );
      const rolesRes = await client.query<{ code: string }>(
        `SELECT r.code FROM iam.membership_roles mr JOIN iam.roles r ON r.id = mr.role_id WHERE mr.membership_id = $1 ORDER BY r.code`,
        [mRow.id],
      );

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'organization_member.status.update',
        resourceType: 'organization_member',
        resourceId: memberId,
        outcome: 'success',
        metadata: { status: input.status },
      });

      const u = userRes.rows[0];
      return toRecord({
        ...mRow,
        email: u?.email ?? null,
        display_name: u?.display_name ?? null,
        roles: rolesRes.rows.map((r) => r.code).join(',') || null,
      });
    });
  }

  async replaceMemberRoles(
    actor: Actor,
    memberId: string,
    input: MemberRolesUpdate,
  ): Promise<MemberRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      // Verify membership exists in this tenant
      const check = await client.query<MemberRow>(
        `SELECT id, user_id, status, department_id, team_id, starts_at, ends_at, created_at, updated_at
           FROM iam.memberships WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, memberId],
      );
      if (check.rows.length === 0) return null;
      const mRow = check.rows[0]!;

      // Replace roles: delete existing, insert new
      await client.query('DELETE FROM iam.membership_roles WHERE membership_id = $1', [memberId]);

      if (input.roles.length > 0) {
        const roleCodes = input.roles;
        const roleRes = await client.query<{ id: string; code: string }>(
          `SELECT id, code FROM iam.roles WHERE code = ANY($1)`,
          [roleCodes],
        );
        for (const role of roleRes.rows) {
          await client.query(
            `INSERT INTO iam.membership_roles (membership_id, role_id, granted_by)
               VALUES ($1, $2, $3)`,
            [memberId, role.id, actor.userId],
          );
        }
      }

      await client.query('UPDATE iam.memberships SET updated_at = now() WHERE id = $1', [memberId]);

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'organization_member.roles.update',
        resourceType: 'organization_member',
        resourceId: memberId,
        outcome: 'success',
        metadata: { roles: input.roles },
      });

      const userRes = await client.query<{ email: string | null; display_name: string | null }>(
        'SELECT email, display_name FROM iam.users WHERE id = $1',
        [mRow.user_id],
      );
      const rolesRes = await client.query<{ code: string }>(
        `SELECT r.code FROM iam.membership_roles mr JOIN iam.roles r ON r.id = mr.role_id WHERE mr.membership_id = $1 ORDER BY r.code`,
        [memberId],
      );

      const u = userRes.rows[0];
      return toRecord({
        ...mRow,
        email: u?.email ?? null,
        display_name: u?.display_name ?? null,
        roles: rolesRes.rows.map((r) => r.code).join(',') || null,
      });
    });
  }
}
