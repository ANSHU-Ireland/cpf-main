import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  CalibrationStatus,
  ReviewerProfileCreate,
  ReviewerProfileListQuery,
  ReviewerProfileRecord,
  TrainingStatus,
} from './reviewer-profile-types.js';

export interface ReviewerProfileListResult {
  readonly items: readonly ReviewerProfileRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface ReviewerProfileRepository {
  listProfiles(actor: Actor, query: ReviewerProfileListQuery): Promise<ReviewerProfileListResult>;
  createProfile(actor: Actor, input: ReviewerProfileCreate): Promise<ReviewerProfileRecord>;
}

interface ProfileRow {
  id: string;
  user_id: string;
  expertise: string[];
  training_status: TrainingStatus;
  calibration_status: CalibrationStatus;
  conflict_declaration_required: boolean;
  max_active_reviews: number | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  'id, user_id, expertise, training_status, calibration_status, conflict_declaration_required, max_active_reviews, created_at, updated_at';

function toRecord(row: ProfileRow): ReviewerProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    expertise: row.expertise,
    trainingStatus: row.training_status,
    calibrationStatus: row.calibration_status,
    conflictDeclarationRequired: row.conflict_declaration_required,
    maxActiveReviews: row.max_active_reviews,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgReviewerProfileRepository implements ReviewerProfileRepository {
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

  async listProfiles(
    actor: Actor,
    query: ReviewerProfileListQuery,
  ): Promise<ReviewerProfileListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.reviewer_profiles WHERE tenant_id = $1',
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

      const res = await client.query<ProfileRow>(
        `SELECT ${COLUMNS}
           FROM hiring.reviewer_profiles
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

  async createProfile(actor: Actor, input: ReviewerProfileCreate): Promise<ReviewerProfileRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<ProfileRow>(
        `INSERT INTO hiring.reviewer_profiles (tenant_id, user_id, expertise, max_active_reviews)
           VALUES ($1, $2, $3::jsonb, $4)
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          input.userId,
          JSON.stringify(input.expertise ?? []),
          input.maxActiveReviews ?? null,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('reviewer profile row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'reviewer_profile.create',
        resourceType: 'reviewer_profile',
        resourceId: row.id,
        outcome: 'success',
        metadata: { userId: input.userId },
      });

      return toRecord(row);
    });
  }
}
