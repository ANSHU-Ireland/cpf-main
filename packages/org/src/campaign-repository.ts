import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  CampaignCreate,
  CampaignListQuery,
  CampaignRecord,
  CampaignStatus,
  CampaignUpdate,
} from './campaign-types.js';

export interface CampaignListResult {
  readonly items: readonly CampaignRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface CampaignRepository {
  listCampaigns(actor: Actor, query: CampaignListQuery): Promise<CampaignListResult>;
  getCampaign(actor: Actor, id: string): Promise<CampaignRecord | null>;
  createCampaign(actor: Actor, input: CampaignCreate): Promise<CampaignRecord>;
  updateCampaign(actor: Actor, id: string, input: CampaignUpdate): Promise<CampaignRecord | null>;
}

export interface PgCampaignRepositoryOptions {
  readonly role?: string;
}

interface CampaignRow {
  id: string;
  code: string;
  title: string;
  role_name: string;
  seniority: string;
  status: CampaignStatus;
  department_id: string | null;
  team_id: string | null;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  'id, code, title, role_name, seniority, status, department_id, team_id, owner_user_id, created_at, updated_at';

function toRecord(row: CampaignRow): CampaignRecord {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    roleName: row.role_name,
    seniority: row.seniority,
    status: row.status,
    departmentId: row.department_id,
    teamId: row.team_id,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgCampaignRepository implements CampaignRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgCampaignRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listCampaigns(actor: Actor, query: CampaignListQuery): Promise<CampaignListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.campaigns WHERE tenant_id = $1',
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

      const res = await client.query<CampaignRow>(
        `SELECT ${COLUMNS}
           FROM hiring.campaigns
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

  async getCampaign(actor: Actor, id: string): Promise<CampaignRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<CampaignRow>(
        `SELECT ${COLUMNS} FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = res.rows[0];
      return row === undefined ? null : toRecord(row);
    });
  }

  async createCampaign(actor: Actor, input: CampaignCreate): Promise<CampaignRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<CampaignRow>(
        `INSERT INTO hiring.campaigns (tenant_id, owner_user_id, code, title, role_name, seniority, department_id, team_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          actor.userId,
          input.code,
          input.title,
          input.roleName,
          input.seniority,
          input.departmentId ?? null,
          input.teamId ?? null,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('campaign row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign.create',
        resourceType: 'campaign',
        resourceId: row.id,
        outcome: 'success',
        metadata: { code: input.code, title: input.title },
      });

      return toRecord(row);
    });
  }

  async updateCampaign(
    actor: Actor,
    id: string,
    input: CampaignUpdate,
  ): Promise<CampaignRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const sets: string[] = [];
      const params: unknown[] = [actor.tenantId, id];
      let idx = 3;

      if (input.title !== undefined) {
        sets.push(`title = $${idx++}`);
        params.push(input.title);
      }
      if (input.roleName !== undefined) {
        sets.push(`role_name = $${idx++}`);
        params.push(input.roleName);
      }
      if (input.seniority !== undefined) {
        sets.push(`seniority = $${idx++}`);
        params.push(input.seniority);
      }
      if (input.departmentId !== undefined) {
        sets.push(`department_id = $${idx++}`);
        params.push(input.departmentId);
      }
      if (input.teamId !== undefined) {
        sets.push(`team_id = $${idx++}`);
        params.push(input.teamId);
      }

      const res = await client.query<CampaignRow>(
        `UPDATE hiring.campaigns
            SET ${sets.join(', ')}, updated_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${COLUMNS}`,
        params,
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign.update',
        resourceType: 'campaign',
        resourceId: row.id,
        outcome: 'success',
        metadata: input as unknown as Record<string, unknown>,
      });

      return toRecord(row);
    });
  }
}
