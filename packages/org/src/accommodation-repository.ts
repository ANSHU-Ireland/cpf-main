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
  listAccommodations(actor: Actor, applicationId: string): Promise<AccommodationListResult>;
  createAccommodation(
    actor: Actor,
    applicationId: string,
    input: AccommodationCreate,
  ): Promise<AccommodationRecord>;
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

  async listAccommodations(actor: Actor, applicationId: string): Promise<AccommodationListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AccommodationRow>(
        `SELECT ${COLUMNS}
           FROM hiring.accommodations
          WHERE tenant_id = $1 AND application_id = $2
          ORDER BY created_at DESC`,
        [actor.tenantId, applicationId],
      );
      return { items: res.rows.map(toRecord), total: res.rows.length };
    });
  }

  async createAccommodation(
    actor: Actor,
    applicationId: string,
    input: AccommodationCreate,
  ): Promise<AccommodationRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AccommodationRow>(
        `INSERT INTO hiring.accommodations (tenant_id, application_id, request_summary, operational_adjustments, status)
           VALUES ($1, $2, $3, $4, 'requested')
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          applicationId,
          input.requestSummary,
          JSON.stringify(input.operationalAdjustments ?? {}),
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('accommodation row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'accommodation.create',
        resourceType: 'accommodation',
        resourceId: row.id,
        outcome: 'success',
        metadata: { applicationId },
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
        `UPDATE hiring.accommodations
            SET status = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${COLUMNS}`,
        [actor.tenantId, id, input.status, actor.userId],
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
