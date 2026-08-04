import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  ApplicationCreate,
  ApplicationListQuery,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusUpdate,
} from './application-types.js';

export interface ApplicationListResult {
  readonly items: readonly ApplicationRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface ApplicationRepository {
  listApplications(
    actor: Actor,
    campaignId: string,
    query: ApplicationListQuery,
  ): Promise<ApplicationListResult>;
  getApplication(actor: Actor, applicationId: string): Promise<ApplicationRecord | null>;
  createApplication(
    actor: Actor,
    campaignId: string,
    input: ApplicationCreate,
  ): Promise<ApplicationRecord>;
  updateApplicationStatus(
    actor: Actor,
    applicationId: string,
    input: ApplicationStatusUpdate,
  ): Promise<ApplicationRecord | null>;
}

interface ApplicationRow {
  id: string;
  campaign_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  source: string;
  source_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  'id, campaign_id, candidate_id, status, source, source_reference, created_at, updated_at';

function toRecord(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    candidateId: row.candidate_id,
    status: row.status,
    source: row.source,
    sourceReference: row.source_reference,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgApplicationRepository implements ApplicationRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listApplications(
    actor: Actor,
    campaignId: string,
    query: ApplicationListQuery,
  ): Promise<ApplicationListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.applications WHERE tenant_id = $1 AND campaign_id = $2',
        [actor.tenantId, campaignId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      const params: unknown[] = [actor.tenantId, campaignId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($3, $4)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<ApplicationRow>(
        `SELECT ${COLUMNS}
           FROM hiring.applications
          WHERE tenant_id = $1 AND campaign_id = $2
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

  async getApplication(actor: Actor, applicationId: string): Promise<ApplicationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ApplicationRow>(
        `SELECT ${COLUMNS} FROM hiring.applications WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, applicationId],
      );
      const row = res.rows[0];
      return row === undefined ? null : toRecord(row);
    });
  }

  async createApplication(
    actor: Actor,
    campaignId: string,
    input: ApplicationCreate,
  ): Promise<ApplicationRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ApplicationRow>(
        `INSERT INTO hiring.applications (tenant_id, campaign_id, candidate_id, status, source, source_reference)
           VALUES ($1, $2, $3, 'created', $4, $5)
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          campaignId,
          input.candidateId,
          input.source ?? 'manual',
          input.sourceReference ?? null,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('application row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'application.create',
        resourceType: 'application',
        resourceId: row.id,
        outcome: 'success',
        metadata: { campaignId, candidateId: input.candidateId },
      });

      return toRecord(row);
    });
  }

  async updateApplicationStatus(
    actor: Actor,
    applicationId: string,
    input: ApplicationStatusUpdate,
  ): Promise<ApplicationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ApplicationRow>(
        `UPDATE hiring.applications
            SET status = $3, updated_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${COLUMNS}`,
        [actor.tenantId, applicationId, input.status],
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'application.update_status',
        resourceType: 'application',
        resourceId: row.id,
        outcome: 'success',
        metadata: { status: input.status },
      });

      return toRecord(row);
    });
  }
}
