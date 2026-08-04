import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { TeamCreate, TeamListQuery, TeamRecord, TeamStatus } from './team-types.js';

export interface TeamListResult {
  readonly items: readonly TeamRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface TeamRepository {
  listTeams(actor: Actor, query: TeamListQuery): Promise<TeamListResult>;
  createTeam(actor: Actor, input: TeamCreate): Promise<TeamRecord>;
}

export interface PgTeamRepositoryOptions {
  readonly role?: string;
}

interface TeamRow {
  id: string;
  department_id: string | null;
  name: string;
  status: TeamStatus;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, department_id, name, status, created_at, updated_at';

function toRecord(row: TeamRow): TeamRecord {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgTeamRepository implements TeamRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgTeamRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listTeams(actor: Actor, query: TeamListQuery): Promise<TeamListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM tenant.teams WHERE tenant_id = $1',
        [actor.tenantId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      const params: unknown[] = [actor.tenantId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<TeamRow>(
        `SELECT ${COLUMNS}
           FROM tenant.teams
          WHERE tenant_id = $1
            ${keyset}
          ORDER BY created_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }

  async createTeam(actor: Actor, input: TeamCreate): Promise<TeamRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<TeamRow>(
        `INSERT INTO tenant.teams (tenant_id, department_id, name)
           VALUES ($1, $2, $3)
         RETURNING ${COLUMNS}`,
        [actor.tenantId, input.departmentId ?? null, input.name],
      );
      const row = res.rows[0];
      if (row === undefined) {
        throw new Error('team row missing after insert');
      }

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'team.create',
        resourceType: 'team',
        resourceId: row.id,
        outcome: 'success',
        metadata: { name: input.name, departmentId: input.departmentId ?? null },
      });

      return toRecord(row);
    });
  }
}
