import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import {
  mapSupportCaseRow,
  SUPPORT_CASE_COLUMNS,
  type SupportCaseRow,
} from './support-case-repository.js';
import type { SupportCaseRecord } from './support-case-types.js';
import type { SupportMessageCreate, SupportMessageRecord } from './support-message-types.js';

/** Visibility a requester may read/author on the `/me` surface (ASM-12). */
const REQUESTER_VISIBILITY = 'requester';

export interface SupportMessageListPage {
  readonly items: readonly SupportMessageRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface SupportCaseDetailResult {
  readonly supportCase: SupportCaseRecord;
  readonly messages: SupportMessageListPage;
}

/** A validated thread query (limit + optional keyset cursor over `created_at, id`). */
export interface SupportMessageQuery {
  readonly limit: number;
  readonly cursor: { readonly ts: string; readonly id: string } | null;
}

export interface SupportCaseDetailRepository {
  /**
   * Loads the caller's own case plus a page of its requester-visible messages, or `null` when the
   * case does not exist or is not owned by the caller (existence and ownership are indistinguishable).
   */
  getCaseDetail(
    actor: Actor,
    caseId: string,
    query: SupportMessageQuery,
  ): Promise<SupportCaseDetailResult | null>;
  /**
   * Appends a requester-visible message to the caller's own case and chains one audit event, or
   * returns `null` when the case does not exist or is not owned by the caller.
   */
  addMessage(
    actor: Actor,
    caseId: string,
    input: SupportMessageCreate,
  ): Promise<SupportMessageRecord | null>;
}

export interface PgSupportCaseDetailRepositoryOptions {
  /** Least-privilege DB role to assume so `v2_tenant_isolation` RLS is enforced. */
  readonly role?: string;
}

interface SupportMessageRow {
  id: string;
  body: string;
  attachments: unknown;
  created_at: Date;
  edited_at: Date | null;
}

const MESSAGE_COLUMNS = 'id, body, attachments, created_at, edited_at';

function toMessageRecord(row: SupportMessageRow): SupportMessageRecord {
  return {
    id: row.id,
    body: row.body,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at.toISOString(),
    editedAt: row.edited_at === null ? null : row.edited_at.toISOString(),
  };
}

/**
 * Reads a case thread and appends requester messages. `support.case_messages` carries
 * `v2_tenant_isolation` RLS (tenant scope); requester ownership is additionally enforced by the
 * `requester_user_id = $1` predicate on the parent case, and only `requester` visibility is surfaced.
 */
export class PgSupportCaseDetailRepository implements SupportCaseDetailRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgSupportCaseDetailRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async getCaseDetail(
    actor: Actor,
    caseId: string,
    query: SupportMessageQuery,
  ): Promise<SupportCaseDetailResult | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const caseRes = await client.query<SupportCaseRow>(
        `SELECT ${SUPPORT_CASE_COLUMNS}
           FROM support.cases
          WHERE id = $1 AND requester_user_id = $2`,
        [caseId, actor.userId],
      );
      const caseRow = caseRes.rows[0];
      if (caseRow === undefined) {
        return null;
      }

      const totalRes = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM support.case_messages
          WHERE case_id = $1 AND visibility = $2`,
        [caseId, REQUESTER_VISIBILITY],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (created_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [caseId, REQUESTER_VISIBILITY];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($3, $4)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const msgRes = await client.query<SupportMessageRow>(
        `SELECT ${MESSAGE_COLUMNS}
           FROM support.case_messages
          WHERE case_id = $1 AND visibility = $2
            ${keyset}
          ORDER BY created_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = msgRes.rows.length > query.limit;
      const rows = hasMore ? msgRes.rows.slice(0, query.limit) : msgRes.rows;
      return {
        supportCase: mapSupportCaseRow(caseRow),
        messages: { items: rows.map(toMessageRecord), total, hasMore },
      };
    });
  }

  async addMessage(
    actor: Actor,
    caseId: string,
    input: SupportMessageCreate,
  ): Promise<SupportMessageRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      // Reject the write unless the caller owns the case (no audit event on a denied add).
      const ownRes = await client.query<{ tenant_id: string | null }>(
        'SELECT tenant_id FROM support.cases WHERE id = $1 AND requester_user_id = $2',
        [caseId, actor.userId],
      );
      const owned = ownRes.rows[0];
      if (owned === undefined) {
        return null;
      }

      const res = await client.query<SupportMessageRow>(
        `INSERT INTO support.case_messages
           (tenant_id, case_id, author_user_id, visibility, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${MESSAGE_COLUMNS}`,
        [actor.tenantId, caseId, actor.userId, REQUESTER_VISIBILITY, input.body],
      );

      const row = res.rows[0];
      if (row === undefined) {
        throw new Error('support case message row missing after insert');
      }

      // `post_me_support_cases_caseId_messages` is x-audit-event: true — chain in the same tx.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'support_case.message.create',
        resourceType: 'support_case_message',
        resourceId: row.id,
        outcome: 'success',
        metadata: { caseId },
      });

      return toMessageRecord(row);
    });
  }
}
