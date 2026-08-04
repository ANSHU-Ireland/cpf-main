import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  OnboardingListQuery,
  OnboardingStatus,
  OnboardingStepRecord,
  OnboardingStepUpdate,
} from './onboarding-types.js';

export interface OnboardingListResult {
  readonly items: readonly OnboardingStepRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface OnboardingRepository {
  listOnboarding(actor: Actor, query: OnboardingListQuery): Promise<OnboardingListResult>;
  /** Updates one existing step and appends one audit event atomically; `null` when no step matches. */
  updateStep(actor: Actor, update: OnboardingStepUpdate): Promise<OnboardingStepRecord | null>;
}

export interface PgOnboardingRepositoryOptions {
  /** Least-privilege DB role to assume (this table has no RLS; see ASM-07/ASM-10). */
  readonly role?: string;
}

interface OnboardingRow {
  id: string;
  role_code: string;
  step_code: string;
  material_version: string | null;
  status: OnboardingStatus;
  completed_at: Date | null;
  updated_at: Date;
}

function toRecord(row: OnboardingRow): OnboardingStepRecord {
  return {
    id: row.id,
    roleCode: row.role_code,
    stepCode: row.step_code,
    materialVersion: row.material_version,
    status: row.status,
    completedAt: row.completed_at === null ? null : row.completed_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Reads/updates the caller's own onboarding steps. `iam.onboarding_progress` has NO row-level
 * security (ASM-10), so scoping is enforced explicitly by the `user_id = $1` predicate on every query.
 */
export class PgOnboardingRepository implements OnboardingRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgOnboardingRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listOnboarding(actor: Actor, query: OnboardingListQuery): Promise<OnboardingListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM iam.onboarding_progress WHERE user_id = $1',
        [actor.userId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (updated_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [actor.userId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (updated_at, id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<OnboardingRow>(
        `SELECT id, role_code, step_code, material_version, status, completed_at, updated_at
           FROM iam.onboarding_progress
          WHERE user_id = $1
            ${keyset}
          ORDER BY updated_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }

  async updateStep(
    actor: Actor,
    update: OnboardingStepUpdate,
  ): Promise<OnboardingStepRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const completedAt = update.status === 'completed' ? 'now()' : 'NULL';
      const res = await client.query<OnboardingRow>(
        `UPDATE iam.onboarding_progress
            SET status = $4,
                completed_at = ${completedAt},
                updated_at = now()
          WHERE user_id = $1
            AND role_code = $2
            AND step_code = $3
            AND material_version IS NOT DISTINCT FROM $5
        RETURNING id, role_code, step_code, material_version, status, completed_at, updated_at`,
        [actor.userId, update.roleCode, update.stepCode, update.status, update.materialVersion],
      );

      const row = res.rows[0];
      if (row === undefined) {
        return null;
      }

      // `put_me_onboarding_stepCode` is x-audit-event: true — chain the event in the same transaction.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'onboarding.step.update',
        resourceType: 'onboarding_step',
        resourceId: row.id,
        outcome: 'success',
        metadata: { roleCode: update.roleCode, stepCode: update.stepCode, status: update.status },
      });

      return toRecord(row);
    });
  }
}
