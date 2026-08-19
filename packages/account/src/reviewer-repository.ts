import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { PgAuditWriter } from '@cpf/audit';
import { withTenant } from '@cpf/db';
import type { Actor } from './types.js';
import type {
  AvailabilityReplaceInput,
  ReviewerAvailabilityPage,
  ReviewerAvailabilityWindow,
  ReviewerListQuery,
  ReviewerProfileRecord,
  ReviewerProfileUpdate,
  ReviewerRepository,
  ReviewerTrainingPage,
} from './reviewer.js';

function ctx(actor: Actor) {
  return { tenantId: actor.tenantId, userId: actor.userId };
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  expertise: string[];
  training_status: string;
  calibration_status: string;
  conflict_declaration_required: boolean;
  max_active_reviews: number | null;
  updated_at: Date;
}

function toProfile(row: ProfileRow): ReviewerProfileRecord {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? 'Reviewer',
    expertise: row.expertise ?? [],
    trainingStatus: row.training_status,
    calibrationStatus: row.calibration_status,
    conflictDeclarationRequired: row.conflict_declaration_required,
    maxActiveReviews: row.max_active_reviews,
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgReviewerRepository implements ReviewerRepository {
  constructor(private readonly pool: Pool) {}

  async getProfile(actor: Actor): Promise<ReviewerProfileRecord | null> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const result = await client.query<ProfileRow>(
        `SELECT profile.user_id, account.display_name, profile.expertise,
                profile.training_status, profile.calibration_status,
                profile.conflict_declaration_required, profile.max_active_reviews,
                profile.updated_at
           FROM hiring.reviewer_profiles AS profile
           JOIN iam.users AS account ON account.id = profile.user_id
          WHERE profile.tenant_id = $1 AND profile.user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      return result.rows[0] === undefined ? null : toProfile(result.rows[0]);
    });
  }

  async updateProfile(
    actor: Actor,
    input: ReviewerProfileUpdate,
  ): Promise<ReviewerProfileRecord | null> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      if (input.displayName !== undefined) {
        await client.query(
          `UPDATE iam.users SET display_name = $2, updated_at = now()
            WHERE id = $1 AND status NOT IN ('deleted', 'disabled')`,
          [actor.userId, input.displayName],
        );
      }

      const result = await client.query<ProfileRow>(
        `INSERT INTO hiring.reviewer_profiles
           (id, tenant_id, user_id, expertise, max_active_reviews)
         VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb), $5)
         ON CONFLICT (tenant_id, user_id) DO UPDATE
             SET expertise = COALESCE($4::jsonb, hiring.reviewer_profiles.expertise),
                 max_active_reviews = CASE
                   WHEN $6::boolean THEN $5
                   ELSE hiring.reviewer_profiles.max_active_reviews
                 END,
                 updated_at = now()
         RETURNING user_id,
           (SELECT display_name FROM iam.users WHERE id = user_id) AS display_name,
           expertise, training_status, calibration_status, conflict_declaration_required,
           max_active_reviews, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
          actor.userId,
          input.expertise === undefined ? null : JSON.stringify(input.expertise),
          input.maxActiveReviews ?? null,
          input.maxActiveReviews !== undefined,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'reviewer_profile.update',
        resourceType: 'reviewer_profile',
        resourceId: actor.userId,
        outcome: 'success',
        metadata: { fields: Object.keys(input) },
      });
      return toProfile(row);
    });
  }

  async listAvailability(
    actor: Actor,
    query: ReviewerListQuery,
  ): Promise<ReviewerAvailabilityPage> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const total = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM review.reviewer_availability AS availability
           JOIN hiring.reviewer_profiles AS profile
             ON profile.id = availability.reviewer_profile_id
            AND profile.tenant_id = availability.tenant_id
          WHERE availability.tenant_id = $1 AND profile.user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      const result = await client.query<{
        id: string;
        available_from: Date;
        available_to: Date;
        capacity: number;
        status: ReviewerAvailabilityWindow['status'];
        note: string | null;
      }>(
        `SELECT availability.id, availability.available_from, availability.available_to,
                availability.capacity, availability.status, availability.note
           FROM review.reviewer_availability AS availability
           JOIN hiring.reviewer_profiles AS profile
             ON profile.id = availability.reviewer_profile_id
            AND profile.tenant_id = availability.tenant_id
          WHERE availability.tenant_id = $1 AND profile.user_id = $2
          ORDER BY availability.available_from, availability.id
          LIMIT $3`,
        [actor.tenantId, actor.userId, query.limit],
      );
      return {
        items: result.rows.map((row) => ({
          id: row.id,
          availableFrom: row.available_from.toISOString(),
          availableTo: row.available_to.toISOString(),
          capacity: row.capacity,
          status: row.status,
          note: row.note,
        })),
        nextCursor: null,
        total: Number(total.rows[0]?.count ?? '0'),
      };
    });
  }

  async replaceAvailability(
    actor: Actor,
    input: AvailabilityReplaceInput,
  ): Promise<readonly ReviewerAvailabilityWindow[]> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const profile = await client.query<{ id: string }>(
        `SELECT id FROM hiring.reviewer_profiles
          WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      const profileId = profile.rows[0]?.id;
      if (profileId === undefined) return [];

      await client.query(
        `DELETE FROM review.reviewer_availability
          WHERE tenant_id = $1 AND reviewer_profile_id = $2`,
        [actor.tenantId, profileId],
      );
      const windows: ReviewerAvailabilityWindow[] = [];
      for (const window of input.windows) {
        const id = randomUUID();
        const result = await client.query<{
          available_from: Date;
          available_to: Date;
          capacity: number;
          status: ReviewerAvailabilityWindow['status'];
          note: string | null;
        }>(
          `INSERT INTO review.reviewer_availability
             (id, tenant_id, reviewer_profile_id, available_from, available_to,
              capacity, status, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING available_from, available_to, capacity, status, note`,
          [
            id,
            actor.tenantId,
            profileId,
            new Date(window.availableFrom),
            new Date(window.availableTo),
            window.capacity,
            window.status,
            window.note ?? null,
          ],
        );
        const row = result.rows[0];
        if (row !== undefined) {
          windows.push({
            id,
            availableFrom: row.available_from.toISOString(),
            availableTo: row.available_to.toISOString(),
            capacity: row.capacity,
            status: row.status,
            note: row.note,
          });
        }
      }
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'reviewer_availability.replace',
        resourceType: 'reviewer_profile',
        resourceId: profileId,
        outcome: 'success',
        metadata: { windowCount: windows.length },
      });
      return windows;
    });
  }

  async listTraining(actor: Actor, query: ReviewerListQuery): Promise<ReviewerTrainingPage> {
    return withTenant(this.pool, ctx(actor), async (client) => {
      const total = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM review.reviewer_training_records AS training
           JOIN hiring.reviewer_profiles AS profile
             ON profile.id = training.reviewer_profile_id
            AND profile.tenant_id = training.tenant_id
          WHERE training.tenant_id = $1 AND profile.user_id = $2`,
        [actor.tenantId, actor.userId],
      );
      const result = await client.query<{
        id: string;
        training_type: string;
        material_version: string;
        status: string;
        completed_at: Date | null;
        expires_at: Date | null;
      }>(
        `SELECT training.id, training.training_type, training.material_version,
                training.status, training.completed_at, training.expires_at
           FROM review.reviewer_training_records AS training
           JOIN hiring.reviewer_profiles AS profile
             ON profile.id = training.reviewer_profile_id
            AND profile.tenant_id = training.tenant_id
          WHERE training.tenant_id = $1 AND profile.user_id = $2
          ORDER BY training.created_at DESC, training.id
          LIMIT $3`,
        [actor.tenantId, actor.userId, query.limit],
      );
      return {
        items: result.rows.map((row) => ({
          id: row.id,
          trainingType: row.training_type,
          materialVersion: row.material_version,
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
