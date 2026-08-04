import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  CampaignReviewerCreate,
  CampaignReviewerListQuery,
  CampaignReviewerRecord,
  CampaignReviewerRole,
  CampaignReviewerUpdate,
  ConflictStatus,
} from './campaign-reviewer-types.js';

export interface CampaignReviewerListResult {
  readonly items: readonly CampaignReviewerRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface CampaignReviewerRepository {
  listReviewers(
    actor: Actor,
    campaignId: string,
    query: CampaignReviewerListQuery,
  ): Promise<CampaignReviewerListResult>;
  addReviewer(
    actor: Actor,
    campaignId: string,
    input: CampaignReviewerCreate,
  ): Promise<CampaignReviewerRecord>;
  deactivateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
  ): Promise<CampaignReviewerRecord | null>;
  updateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
    input: CampaignReviewerUpdate,
  ): Promise<CampaignReviewerRecord | null>;
}

interface ReviewerRow {
  id: string;
  campaign_id: string;
  reviewer_profile_id: string;
  role: CampaignReviewerRole;
  conflict_status: ConflictStatus;
  active: boolean;
  created_at: Date;
}

const COLUMNS = 'id, campaign_id, reviewer_profile_id, role, conflict_status, active, created_at';

function toRecord(row: ReviewerRow): CampaignReviewerRecord {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    reviewerProfileId: row.reviewer_profile_id,
    role: row.role,
    conflictStatus: row.conflict_status,
    active: row.active,
    createdAt: row.created_at.toISOString(),
  };
}

export class PgCampaignReviewerRepository implements CampaignReviewerRepository {
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

  async listReviewers(
    actor: Actor,
    campaignId: string,
    query: CampaignReviewerListQuery,
  ): Promise<CampaignReviewerListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.campaign_reviewers WHERE tenant_id = $1 AND campaign_id = $2',
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

      const res = await client.query<ReviewerRow>(
        `SELECT ${COLUMNS}
           FROM hiring.campaign_reviewers
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

  async addReviewer(
    actor: Actor,
    campaignId: string,
    input: CampaignReviewerCreate,
  ): Promise<CampaignReviewerRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ReviewerRow>(
        `INSERT INTO hiring.campaign_reviewers (tenant_id, campaign_id, reviewer_profile_id, role)
           VALUES ($1, $2, $3, $4)
         RETURNING ${COLUMNS}`,
        [actor.tenantId, campaignId, input.reviewerProfileId, input.role],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('reviewer row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign_reviewer.add',
        resourceType: 'campaign_reviewer',
        resourceId: row.id,
        outcome: 'success',
        metadata: { campaignId, reviewerProfileId: input.reviewerProfileId, role: input.role },
      });

      return toRecord(row);
    });
  }

  async deactivateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
  ): Promise<CampaignReviewerRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ReviewerRow>(
        `UPDATE hiring.campaign_reviewers
            SET active = false
          WHERE tenant_id = $1 AND campaign_id = $2 AND id = $3
         RETURNING ${COLUMNS}`,
        [actor.tenantId, campaignId, reviewerId],
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign_reviewer.deactivate',
        resourceType: 'campaign_reviewer',
        resourceId: row.id,
        outcome: 'success',
        metadata: { campaignId },
      });

      return toRecord(row);
    });
  }

  async updateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
    input: CampaignReviewerUpdate,
  ): Promise<CampaignReviewerRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const sets: string[] = [];
      const params: unknown[] = [actor.tenantId, campaignId, reviewerId];
      let idx = 4;

      if (input.role !== undefined) {
        sets.push(`role = $${idx++}`);
        params.push(input.role);
      }
      if (input.conflictStatus !== undefined) {
        sets.push(`conflict_status = $${idx++}`);
        params.push(input.conflictStatus);
      }

      if (sets.length === 0) return null;

      const res = await client.query<ReviewerRow>(
        `UPDATE hiring.campaign_reviewers
            SET ${sets.join(', ')}
          WHERE tenant_id = $1 AND campaign_id = $2 AND id = $3
         RETURNING ${COLUMNS}`,
        params,
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'campaign_reviewer.update',
        resourceType: 'campaign_reviewer',
        resourceId: row.id,
        outcome: 'success',
        metadata: input as unknown as Record<string, unknown>,
      });

      return toRecord(row);
    });
  }
}
