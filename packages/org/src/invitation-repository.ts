import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  InvitationCreate,
  InvitationListQuery,
  InvitationRecord,
  InvitationStatus,
} from './invitation-types.js';

export interface InvitationListResult {
  readonly items: readonly InvitationRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface InvitationRepository {
  listInvitations(
    actor: Actor,
    applicationId: string,
    query: InvitationListQuery,
  ): Promise<InvitationListResult>;
  getInvitation(actor: Actor, id: string): Promise<InvitationRecord | null>;
  createInvitation(
    actor: Actor,
    applicationId: string,
    input: InvitationCreate,
    tokenHash: string,
  ): Promise<InvitationRecord>;
  revokeInvitation(actor: Actor, id: string): Promise<InvitationRecord | null>;
}

interface InvitationRow {
  id: string;
  application_id: string;
  token_hash: string;
  status: InvitationStatus;
  max_attempts: number;
  valid_from: Date | null;
  expires_at: Date;
  sent_at: Date | null;
  revoked_at: Date | null;
  created_by: string;
  created_at: Date;
}

const COLUMNS =
  'id, application_id, token_hash, status, max_attempts, valid_from, expires_at, sent_at, revoked_at, created_by, created_at';

function toRecord(row: InvitationRow): InvitationRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    tokenHash: row.token_hash,
    status: row.status,
    maxAttempts: row.max_attempts,
    validFrom: row.valid_from?.toISOString() ?? null,
    expiresAt: row.expires_at.toISOString(),
    sentAt: row.sent_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

export class PgInvitationRepository implements InvitationRepository {
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

  async listInvitations(
    actor: Actor,
    applicationId: string,
    query: InvitationListQuery,
  ): Promise<InvitationListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM hiring.invitations WHERE tenant_id = $1 AND application_id = $2',
        [actor.tenantId, applicationId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      const params: unknown[] = [actor.tenantId, applicationId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($3, $4)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<InvitationRow>(
        `SELECT ${COLUMNS}
           FROM hiring.invitations
          WHERE tenant_id = $1 AND application_id = $2
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

  async getInvitation(actor: Actor, id: string): Promise<InvitationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<InvitationRow>(
        `SELECT ${COLUMNS} FROM hiring.invitations WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = res.rows[0];
      return row === undefined ? null : toRecord(row);
    });
  }

  async createInvitation(
    actor: Actor,
    applicationId: string,
    input: InvitationCreate,
    tokenHash: string,
  ): Promise<InvitationRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<InvitationRow>(
        `INSERT INTO hiring.invitations (tenant_id, application_id, token_hash, status, max_attempts, valid_from, expires_at, created_by)
           VALUES ($1, $2, $3, 'created', $4, $5, $6, $7)
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          applicationId,
          tokenHash,
          input.maxAttempts ?? 1,
          input.validFrom ?? null,
          input.expiresAt,
          actor.userId,
        ],
      );

      const row = res.rows[0];
      if (row === undefined) throw new Error('invitation row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'invitation.create',
        resourceType: 'invitation',
        resourceId: row.id,
        outcome: 'success',
        metadata: { applicationId, expiresAt: input.expiresAt },
      });

      return toRecord(row);
    });
  }

  async revokeInvitation(actor: Actor, id: string): Promise<InvitationRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<InvitationRow>(
        `UPDATE hiring.invitations
            SET status = 'revoked', revoked_at = now()
          WHERE tenant_id = $1 AND id = $2 AND status NOT IN ('revoked', 'completed', 'expired')
         RETURNING ${COLUMNS}`,
        [actor.tenantId, id],
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'invitation.revoke',
        resourceType: 'invitation',
        resourceId: row.id,
        outcome: 'success',
        metadata: {},
      });

      return toRecord(row);
    });
  }
}
