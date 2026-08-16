import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { NoticeCreate, NoticeRecord, NoticeType } from './notice-types.js';
import type { NoticeListResult } from './notice-types.js';

export interface NoticeRepository {
  listNotices(actor: Actor, applicationId: string | null): Promise<NoticeListResult>;
  createNotice(
    actor: Actor,
    applicationId: string | null,
    input: NoticeCreate,
  ): Promise<NoticeRecord | null>;
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
const QUALIFIED_COLUMNS =
  'acknowledgement.id, acknowledgement.application_id, acknowledgement.notice_type, acknowledgement.notice_version, acknowledgement.acknowledged_at, acknowledgement.created_at';

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

  async listNotices(actor: Actor, applicationId: string | null): Promise<NoticeListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<NoticeRow>(
        `SELECT ${QUALIFIED_COLUMNS}
           FROM hiring.notice_acknowledgements AS acknowledgement
           JOIN hiring.applications AS application
             ON application.id = acknowledgement.application_id
            AND application.tenant_id = acknowledgement.tenant_id
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE acknowledgement.tenant_id = $1
            AND ($2::uuid IS NULL OR acknowledgement.application_id = $2)
            AND ($3::boolean = false OR candidate.user_id = $4)
          ORDER BY acknowledgement.acknowledged_at DESC`,
        [actor.tenantId, applicationId, actor.roles.includes('candidate'), actor.userId],
      );
      return { items: res.rows.map(toRecord), total: res.rows.length };
    });
  }

  async createNotice(
    actor: Actor,
    applicationId: string | null,
    input: NoticeCreate,
  ): Promise<NoticeRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<NoticeRow>(
        `INSERT INTO hiring.notice_acknowledgements
           (tenant_id, application_id, notice_type, notice_version, acknowledged_at)
         SELECT $1, application.id, $3, $4, now()
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
         ON CONFLICT (application_id, notice_type, notice_version) DO UPDATE SET acknowledged_at = now()
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          applicationId,
          input.noticeType,
          input.noticeVersion,
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
        action: 'notice.acknowledge',
        resourceType: 'notice_acknowledgement',
        resourceId: row.id,
        outcome: 'success',
        metadata: { applicationId: row.application_id, noticeType: input.noticeType },
      });

      return toRecord(row);
    });
  }
}
