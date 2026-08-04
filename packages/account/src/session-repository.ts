import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { SessionCursor, SessionListQuery, SessionRecord } from './session-types.js';

export interface SessionListResult {
  readonly items: readonly SessionRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface SessionRepository {
  listSessions(actor: Actor, query: SessionListQuery): Promise<SessionListResult>;
  /** Revokes the caller's own session; resolves `true` only when an active row was revoked. */
  revokeSession(actor: Actor, sessionId: string, reason: string): Promise<boolean>;
}

export interface PgSessionRepositoryOptions {
  /** Least-privilege DB role to assume so RLS is enforced (superusers bypass RLS). */
  readonly role?: string;
}

/** Encodes a keyset cursor as a URL-safe opaque token. */
export function encodeSessionCursor(cursor: SessionCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/** Decodes an opaque cursor token; returns `null` when absent or malformed. */
export function decodeSessionCursor(raw: string): SessionCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.createdAt === 'string' && typeof rec.id === 'string') {
      return { createdAt: rec.createdAt, id: rec.id };
    }
    return null;
  } catch {
    return null;
  }
}

interface SessionRow {
  id: string;
  device_label: string | null;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
}

function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    deviceLabel: row.device_label,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at === null ? null : row.revoked_at.toISOString(),
    revocationReason: row.revocation_reason,
  };
}

/** Reads/revokes the caller's own sessions through the `user_session_self` RLS policy. */
export class PgSessionRepository implements SessionRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgSessionRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listSessions(actor: Actor, query: SessionListQuery): Promise<SessionListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM iam.user_sessions',
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (created_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [];
      let where = '';
      if (query.cursor !== null) {
        where = 'WHERE (created_at, id) < ($1, $2)';
        params.push(query.cursor.createdAt, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<SessionRow>(
        `SELECT id, device_label, created_at, last_seen_at, expires_at, revoked_at, revocation_reason
           FROM iam.user_sessions
           ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }

  async revokeSession(actor: Actor, sessionId: string, reason: string): Promise<boolean> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const revoked = await revokeOne(client, sessionId, reason);
      if (!revoked) {
        return false;
      }

      // `delete_me_sessions_sessionId` is x-audit-event: true — chain the event in the same tx.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'session.revoke',
        resourceType: 'user_session',
        resourceId: sessionId,
        outcome: 'success',
        metadata: { reason },
      });
      return true;
    });
  }
}

async function revokeOne(client: PoolClient, sessionId: string, reason: string): Promise<boolean> {
  const res = await client.query(
    `UPDATE iam.user_sessions
        SET revoked_at = now(), revocation_reason = $2
      WHERE id = $1 AND revoked_at IS NULL
      RETURNING id`,
    [sessionId, reason],
  );
  return (res.rowCount ?? 0) > 0;
}
