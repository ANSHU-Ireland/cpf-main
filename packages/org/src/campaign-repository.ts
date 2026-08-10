import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
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

export type TransitionStatusResult = CampaignRecord | 'not_found' | 'invalid_status';

export interface CampaignRepository {
  listCampaigns(actor: Actor, query: CampaignListQuery): Promise<CampaignListResult>;
  getCampaign(actor: Actor, id: string): Promise<CampaignRecord | null>;
  createCampaign(actor: Actor, input: CampaignCreate): Promise<CampaignRecord>;
  updateCampaign(actor: Actor, id: string, input: CampaignUpdate): Promise<CampaignRecord | null>;
  transitionStatus(
    actor: Actor,
    id: string,
    toStatus: CampaignStatus,
    validFrom: readonly CampaignStatus[],
  ): Promise<TransitionStatusResult>;
  duplicateCampaign(
    actor: Actor,
    sourceId: string,
    newCode: string,
  ): Promise<CampaignRecord | null>;
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

async function appendCampaignOutbox(
  client: PoolClient,
  actor: Actor,
  campaignId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.outbox_events
       (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload,
        data_classification, correlation_id, status)
     VALUES ($1, 'campaign', $2, $3, 1, $4::jsonb, 'confidential', $5, 'pending')`,
    [actor.tenantId, campaignId, eventType, JSON.stringify(payload), randomUUID()],
  );
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
      await appendCampaignOutbox(client, actor, row.id, 'campaign.created', {
        code: input.code,
        title: input.title,
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
      await appendCampaignOutbox(
        client,
        actor,
        row.id,
        'campaign.updated',
        input as unknown as Record<string, unknown>,
      );

      return toRecord(row);
    });
  }

  async transitionStatus(
    actor: Actor,
    id: string,
    toStatus: CampaignStatus,
    validFrom: readonly CampaignStatus[],
  ): Promise<TransitionStatusResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<CampaignRow>(
        `UPDATE hiring.campaigns
            SET status = $3, updated_at = now()
          WHERE tenant_id = $1 AND id = $2 AND status = ANY($4)
         RETURNING ${COLUMNS}`,
        [actor.tenantId, id, toStatus, validFrom],
      );

      if (res.rows[0] !== undefined) {
        const row = res.rows[0];
        await new PgAuditWriter(client).append({
          tenantId: actor.tenantId,
          actorType: 'user',
          actorId: actor.userId,
          action: `campaign.${toStatus}`,
          resourceType: 'campaign',
          resourceId: row.id,
          outcome: 'success',
          metadata: { fromStatus: validFrom, toStatus },
        });
        await appendCampaignOutbox(client, actor, row.id, 'campaign.status_changed', {
          fromStatus: validFrom,
          toStatus,
        });
        return toRecord(row);
      }

      const check = await client.query<{ id: string }>(
        'SELECT id FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2',
        [actor.tenantId, id],
      );
      return check.rows[0] === undefined ? 'not_found' : 'invalid_status';
    });
  }

  async duplicateCampaign(
    actor: Actor,
    sourceId: string,
    newCode: string,
  ): Promise<CampaignRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const source = await client.query<CampaignRow>(
        `SELECT ${COLUMNS} FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, sourceId],
      );
      if (source.rows[0] === undefined) return null;

      const s = source.rows[0];
      const res = await client.query<CampaignRow>(
        `INSERT INTO hiring.campaigns (tenant_id, owner_user_id, code, title, role_name, seniority, department_id, team_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          actor.userId,
          newCode,
          s.title,
          s.role_name,
          s.seniority,
          s.department_id,
          s.team_id,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('campaign row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign.duplicate',
        resourceType: 'campaign',
        resourceId: row.id,
        outcome: 'success',
        metadata: { sourceId, newCode },
      });
      await appendCampaignOutbox(client, actor, row.id, 'campaign.created', {
        sourceId,
        newCode,
      });

      return toRecord(row);
    });
  }
}
