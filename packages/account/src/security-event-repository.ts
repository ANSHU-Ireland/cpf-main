import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import type { Actor } from './types.js';
import type { SecurityEventListQuery, SecurityEventRecord } from './security-event-types.js';

export interface SecurityEventListResult {
  readonly items: readonly SecurityEventRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface SecurityEventRepository {
  listSecurityEvents(actor: Actor, query: SecurityEventListQuery): Promise<SecurityEventListResult>;
}

export interface PgSecurityEventRepositoryOptions {
  /** Least-privilege DB role to assume (this table has no RLS; see ASM-07). */
  readonly role?: string;
}

interface SecurityEventRow {
  id: string;
  event_type: string;
  outcome: string;
  occurred_at: Date;
}

function toRecord(row: SecurityEventRow): SecurityEventRecord {
  return {
    id: row.id,
    eventType: row.event_type,
    outcome: row.outcome,
    occurredAt: row.occurred_at.toISOString(),
  };
}

/**
 * Reads the caller's own security events. `iam.account_security_events` has NO row-level security
 * (ASM-07), so scoping is enforced explicitly by the `user_id = $1` predicate on every query.
 */
export class PgSecurityEventRepository implements SecurityEventRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgSecurityEventRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listSecurityEvents(
    actor: Actor,
    query: SecurityEventListQuery,
  ): Promise<SecurityEventListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM iam.account_security_events WHERE user_id = $1',
        [actor.userId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (occurred_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [actor.userId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (occurred_at, id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<SecurityEventRow>(
        `SELECT id, event_type, outcome, occurred_at
           FROM iam.account_security_events
          WHERE user_id = $1
            ${keyset}
          ORDER BY occurred_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }
}
