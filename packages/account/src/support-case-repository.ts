import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  SupportCaseCreate,
  SupportCaseListQuery,
  SupportCaseRecord,
  SupportCaseStatus,
  SupportSeverity,
} from './support-case-types.js';

export interface SupportCaseListResult {
  readonly items: readonly SupportCaseRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface SupportCaseRepository {
  listCases(actor: Actor, query: SupportCaseListQuery): Promise<SupportCaseListResult>;
  /** Creates the caller's own case and appends one audit event atomically. */
  createCase(actor: Actor, input: SupportCaseCreate): Promise<SupportCaseRecord>;
}

export interface PgSupportCaseRepositoryOptions {
  /** Least-privilege DB role to assume so `v2_tenant_isolation` RLS is enforced. */
  readonly role?: string;
}

/** Initial status for a submitted case. */
const INITIAL_STATUS: SupportCaseStatus = 'open';

interface SupportCaseRow {
  id: string;
  case_reference: string;
  category: string;
  severity: SupportSeverity;
  subject: string;
  description: string;
  purpose: string;
  status: SupportCaseStatus;
  sla_due_at: Date | null;
  resolution: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
}

function toRecord(row: SupportCaseRow): SupportCaseRecord {
  return {
    id: row.id,
    caseReference: row.case_reference,
    category: row.category,
    severity: row.severity,
    subject: row.subject,
    description: row.description,
    purpose: row.purpose,
    status: row.status,
    slaDueAt: row.sla_due_at === null ? null : row.sla_due_at.toISOString(),
    resolution: row.resolution,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    resolvedAt: row.resolved_at === null ? null : row.resolved_at.toISOString(),
  };
}

const RETURNING = `id, case_reference, category, severity, subject, description, purpose, status,
                   sla_due_at, resolution, created_at, updated_at, resolved_at`;

/**
 * Reads/creates the caller's own support cases. `support.cases` carries `v2_tenant_isolation` RLS
 * (tenant scope); requester ownership is additionally enforced by the `requester_user_id = $1`
 * predicate on every read.
 */
export class PgSupportCaseRepository implements SupportCaseRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgSupportCaseRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listCases(actor: Actor, query: SupportCaseListQuery): Promise<SupportCaseListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM support.cases WHERE requester_user_id = $1',
        [actor.userId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (created_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [actor.userId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<SupportCaseRow>(
        `SELECT ${RETURNING}
           FROM support.cases
          WHERE requester_user_id = $1
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

  async createCase(actor: Actor, input: SupportCaseCreate): Promise<SupportCaseRecord> {
    const caseReference = `SC-${randomUUID().toUpperCase()}`;

    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<SupportCaseRow>(
        `INSERT INTO support.cases
           (tenant_id, requester_user_id, case_reference, category, severity, subject,
            description, purpose, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${RETURNING}`,
        [
          actor.tenantId,
          actor.userId,
          caseReference,
          input.category,
          input.severity,
          input.subject,
          input.description,
          input.purpose,
          INITIAL_STATUS,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) {
        throw new Error('support case row missing after insert');
      }

      // `post_me_support_cases` is x-audit-event: true — chain the event in the same transaction.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'support_case.create',
        resourceType: 'support_case',
        resourceId: row.id,
        outcome: 'success',
        metadata: { category: input.category, severity: input.severity },
      });

      return toRecord(row);
    });
  }
}
