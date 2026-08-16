import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  AccommodationCreate,
  AccommodationRecord,
  AccommodationStatus,
  AccommodationStatusUpdate,
} from './accommodation-types.js';

export interface AccommodationListResult {
  readonly items: readonly AccommodationRecord[];
  readonly total: number;
}

export interface AccommodationRepository {
  listAccommodations(actor: Actor, applicationId: string | null): Promise<AccommodationListResult>;
  createAccommodation(
    actor: Actor,
    applicationId: string | null,
    input: AccommodationCreate,
  ): Promise<AccommodationRecord | null>;
  updateAccommodationStatus(
    actor: Actor,
    id: string,
    input: AccommodationStatusUpdate,
  ): Promise<AccommodationRecord | null>;
}

interface AccommodationRow {
  id: string;
  application_id: string;
  request_summary: string;
  operational_adjustments: Record<string, unknown>;
  status: AccommodationStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  'id, application_id, request_summary, operational_adjustments, status, reviewed_by, reviewed_at, created_at, updated_at';
const QUALIFIED_COLUMNS =
  'accommodation.id, accommodation.application_id, accommodation.request_summary, accommodation.operational_adjustments, accommodation.status, accommodation.reviewed_by, accommodation.reviewed_at, accommodation.created_at, accommodation.updated_at';

function toRecord(row: AccommodationRow): AccommodationRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    requestSummary: row.request_summary,
    operationalAdjustments: row.operational_adjustments,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgAccommodationRepository implements AccommodationRepository {
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

  async listAccommodations(
    actor: Actor,
    applicationId: string | null,
  ): Promise<AccommodationListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AccommodationRow>(
        `SELECT ${QUALIFIED_COLUMNS}
           FROM hiring.accommodations AS accommodation
           JOIN hiring.applications AS application
             ON application.id = accommodation.application_id
            AND application.tenant_id = accommodation.tenant_id
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE accommodation.tenant_id = $1
            AND ($2::uuid IS NULL OR accommodation.application_id = $2)
            AND ($3::boolean = false OR candidate.user_id = $4)
          ORDER BY accommodation.created_at DESC`,
        [actor.tenantId, applicationId, actor.roles.includes('candidate'), actor.userId],
      );
      return { items: res.rows.map(toRecord), total: res.rows.length };
    });
  }

  async createAccommodation(
    actor: Actor,
    applicationId: string | null,
    input: AccommodationCreate,
  ): Promise<AccommodationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AccommodationRow>(
        `INSERT INTO hiring.accommodations
           (tenant_id, application_id, request_summary, operational_adjustments, status)
         SELECT $1, application.id, $3, $4, 'requested'
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE application.tenant_id = $1
            AND ($2::uuid IS NULL OR application.id = $2)
            AND ($5::boolean = false OR candidate.user_id = $6)
            AND application.status NOT IN ('withdrawn', 'cancelled')
          ORDER BY application.created_at DESC
          LIMIT 1
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          applicationId,
          input.requestSummary,
          JSON.stringify(input.operationalAdjustments ?? {}),
          actor.roles.includes('candidate'),
          actor.userId,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'accommodation.create',
        resourceType: 'accommodation',
        resourceId: row.id,
        outcome: 'success',
        metadata: { applicationId: row.application_id },
      });

      return toRecord(row);
    });
  }

  async updateAccommodationStatus(
    actor: Actor,
    id: string,
    input: AccommodationStatusUpdate,
  ): Promise<AccommodationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AccommodationRow>(
        `UPDATE hiring.accommodations AS accommodation
            SET status = $3,
                reviewed_by = CASE WHEN $5 THEN accommodation.reviewed_by ELSE $4 END,
                reviewed_at = CASE WHEN $5 THEN accommodation.reviewed_at ELSE now() END,
                updated_at = now()
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE accommodation.tenant_id = $1
            AND accommodation.id = $2
            AND application.id = accommodation.application_id
            AND ($5::boolean = false OR candidate.user_id = $4)
         RETURNING ${QUALIFIED_COLUMNS}`,
        [actor.tenantId, id, input.status, actor.userId, actor.roles.includes('candidate')],
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'accommodation.update_status',
        resourceType: 'accommodation',
        resourceId: row.id,
        outcome: 'success',
        metadata: { status: input.status },
      });

      return toRecord(row);
    });
  }
}
