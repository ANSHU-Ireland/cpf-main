import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { NoticeCreate, NoticeRecord, NoticeType } from './notice-types.js';
import type { NoticeListResult } from './notice-types.js';

export interface NoticeRepository {
  listNotices(actor: Actor, applicationId: string): Promise<NoticeListResult>;
  createNotice(actor: Actor, applicationId: string, input: NoticeCreate): Promise<NoticeRecord>;
}

interface NoticeRow {
  id: string;
  application_id: string;
  notice_type: NoticeType;
  notice_version: string;
  acknowledged_at: Date;
  created_at: Date;
}

const COLUMNS = 'id, application_id, notice_type, notice_version, acknowledged_at, created_at';

function toRecord(row: NoticeRow): NoticeRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    noticeType: row.notice_type,
    noticeVersion: row.notice_version,
    acknowledgedAt: row.acknowledged_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export class PgNoticeRepository implements NoticeRepository {
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

  async listNotices(actor: Actor, applicationId: string): Promise<NoticeListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<NoticeRow>(
        `SELECT ${COLUMNS}
           FROM hiring.notice_acknowledgements
          WHERE tenant_id = $1 AND application_id = $2
          ORDER BY acknowledged_at DESC`,
        [actor.tenantId, applicationId],
      );
      return { items: res.rows.map(toRecord), total: res.rows.length };
    });
  }

  async createNotice(
    actor: Actor,
    applicationId: string,
    input: NoticeCreate,
  ): Promise<NoticeRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<NoticeRow>(
        `INSERT INTO hiring.notice_acknowledgements (tenant_id, application_id, notice_type, notice_version, acknowledged_at)
           VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (application_id, notice_type, notice_version) DO UPDATE SET acknowledged_at = now()
         RETURNING ${COLUMNS}`,
        [actor.tenantId, applicationId, input.noticeType, input.noticeVersion],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('notice row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notice.acknowledge',
        resourceType: 'notice_acknowledgement',
        resourceId: row.id,
        outcome: 'success',
        metadata: { applicationId, noticeType: input.noticeType },
      });

      return toRecord(row);
    });
  }
}
