import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTenant } from '@cpf/db';
import type { Actor } from './types.js';
import type {
  ReviewerRepository,
  ReviewerProfileRecord,
  ReviewerProfileUpdate,
  ReviewerAvailabilityPage,
  ReviewerAvailabilityWindow,
  AvailabilityReplaceInput,
  ReviewerTrainingPage,
  ReviewerListQuery,
} from './reviewer.js';

function nowIso(): string {
  return new Date().toISOString();
}

function ctx(actor: Actor) {
  return { tenantId: actor.tenantId, userId: actor.userId };
}

export class PgReviewerRepository implements ReviewerRepository {
  constructor(private readonly pool: Pool) {}

  async getProfile(actor: Actor): Promise<ReviewerProfileRecord | null> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const r = await client.query<{
        expertise: string[];
        qualifications: string[];
        languages: string[];
        max_concurrent: number;
        updated_at: Date;
      }>(
        `SELECT expertise, qualifications, languages, max_concurrent, updated_at
           FROM reviewer.profiles
          WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        userId: actor.userId,
        expertise: row.expertise ?? [],
        qualifications: row.qualifications ?? [],
        languages: row.languages ?? [],
        maxConcurrent: row.max_concurrent,
        updatedAt: row.updated_at.toISOString(),
      };
    });
  }

  async updateProfile(actor: Actor, input: ReviewerProfileUpdate): Promise<ReviewerProfileRecord | null> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const setClauses: string[] = ['updated_at = now()'];
      const params: unknown[] = [actor.tenantId, actor.userId];
      if (input.expertise !== undefined) { params.push(JSON.stringify(input.expertise)); setClauses.push(`expertise = $${params.length}`); }
      if (input.qualifications !== undefined) { params.push(JSON.stringify(input.qualifications)); setClauses.push(`qualifications = $${params.length}`); }
      if (input.languages !== undefined) { params.push(JSON.stringify(input.languages)); setClauses.push(`languages = $${params.length}`); }
      if (input.maxConcurrent !== undefined) { params.push(input.maxConcurrent); setClauses.push(`max_concurrent = $${params.length}`); }
      const r = await client.query<{
        expertise: string[];
        qualifications: string[];
        languages: string[];
        max_concurrent: number;
        updated_at: Date;
      }>(
        `INSERT INTO reviewer.profiles (id, tenant_id, user_id, expertise, qualifications, languages, max_concurrent)
              VALUES ($3, $1, $2, '[]', '[]', '[]', 1)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET ${setClauses.join(', ')}
         RETURNING expertise, qualifications, languages, max_concurrent, updated_at`,
        params,
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        userId: actor.userId,
        expertise: row.expertise ?? [],
        qualifications: row.qualifications ?? [],
        languages: row.languages ?? [],
        maxConcurrent: row.max_concurrent,
        updatedAt: row.updated_at.toISOString(),
      };
    });
  }

  async listAvailability(actor: Actor, query: ReviewerListQuery): Promise<ReviewerAvailabilityPage> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const total = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM reviewer.availability_windows WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      const r = await client.query<{ id: string; day_of_week: number; start_time: string; end_time: string }>(
        `SELECT id, day_of_week, start_time, end_time FROM reviewer.availability_windows
          WHERE tenant_id = $1 AND user_id = $2 ORDER BY day_of_week, start_time LIMIT $3`,
        [actor.tenantId, actor.userId, query.limit],
      );
      return { items: r.rows.map((row) => ({ id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time })), nextCursor: null, total: Number(total.rows[0]?.count ?? '0') };
    });
  }

  async replaceAvailability(actor: Actor, input: AvailabilityReplaceInput): Promise<readonly ReviewerAvailabilityWindow[]> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      await client.query(`DELETE FROM reviewer.availability_windows WHERE tenant_id = $1 AND user_id = $2`, [actor.tenantId, actor.userId]);
      const windows: ReviewerAvailabilityWindow[] = [];
      for (const w of input.windows) {
        const id = randomUUID();
        await client.query(
          `INSERT INTO reviewer.availability_windows (id, tenant_id, user_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, actor.tenantId, actor.userId, w.dayOfWeek, w.startTime, w.endTime],
        );
        windows.push({ id, dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime });
      }
      return windows;
    });
  }

  async listTraining(actor: Actor, query: ReviewerListQuery): Promise<ReviewerTrainingPage> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const total = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM reviewer.training_records WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      const r = await client.query<{ id: string; module_code: string; status: string; completed_at: Date | null; expires_at: Date | null }>(
        `SELECT id, module_code, status, completed_at, expires_at FROM reviewer.training_records
          WHERE tenant_id = $1 AND user_id = $2 ORDER BY completed_at DESC NULLS LAST LIMIT $3`,
        [actor.tenantId, actor.userId, query.limit],
      );
      return {
        items: r.rows.map((row) => ({
          id: row.id,
          moduleCode: row.module_code,
          status: row.status,
          completedAt: row.completed_at?.toISOString() ?? null,
          expiresAt: row.expires_at?.toISOString() ?? null,
        })),
        nextCursor: null,
        total: Number(total.rows[0]?.count ?? '0'),
      };
    });
  }
}
