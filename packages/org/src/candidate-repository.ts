import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  CandidateCreate,
  CandidateListQuery,
  CandidateRecord,
  CandidateStatus,
} from './candidate-types.js';

export interface CandidateListResult {
  readonly items: readonly CandidateRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface CandidateRepository {
  listCandidates(actor: Actor, query: CandidateListQuery): Promise<CandidateListResult>;
  getCandidate(actor: Actor, id: string): Promise<CandidateRecord | null>;
  createCandidate(actor: Actor, input: CandidateCreate): Promise<CandidateRecord>;
}

interface CandidateRow {
  id: string;
  external_reference: string | null;
  status: CandidateStatus;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, external_reference, status, created_at, updated_at';

function toRecord(row: CandidateRow): CandidateRecord {
  return {
    id: row.id,
    externalReference: row.external_reference,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgCandidateRepository implements CandidateRepository {
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

  async listCandidates(actor: Actor, query: CandidateListQuery): Promise<CandidateListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.candidates WHERE tenant_id = $1',
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

      const res = await client.query<CandidateRow>(
        `SELECT ${COLUMNS}
           FROM hiring.candidates
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

  async getCandidate(actor: Actor, id: string): Promise<CandidateRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<CandidateRow>(
        `SELECT ${COLUMNS} FROM hiring.candidates WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = res.rows[0];
      return row === undefined ? null : toRecord(row);
    });
  }

  async createCandidate(actor: Actor, input: CandidateCreate): Promise<CandidateRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<CandidateRow>(
        `INSERT INTO hiring.candidates (tenant_id, external_reference, status)
           VALUES ($1, $2, 'active')
         RETURNING ${COLUMNS}`,
        [actor.tenantId, input.externalReference ?? null],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('candidate row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate.create',
        resourceType: 'candidate',
        resourceId: row.id,
        outcome: 'success',
        metadata: { externalReference: input.externalReference ?? null },
      });

      return toRecord(row);
    });
  }
}
