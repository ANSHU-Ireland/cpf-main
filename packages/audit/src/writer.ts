import type { PoolClient } from 'pg';
import { computeEventHash, type AuditEventCore } from './hash.js';

export interface AuditEventInput {
  readonly tenantId: string | null;
  readonly actorType: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: string;
  readonly purpose?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditRecord {
  readonly id: string;
  readonly occurredAt: string;
  readonly eventHash: string;
  readonly previousHash: string | null;
}

export interface AuditWriter {
  append(event: AuditEventInput): Promise<AuditRecord>;
}

/**
 * Appends an audit event on the caller's transaction client (so it commits atomically with the
 * business change), chaining `event_hash` from the tenant's most recent event.
 */
export class PgAuditWriter implements AuditWriter {
  readonly #client: PoolClient;

  constructor(client: PoolClient) {
    this.#client = client;
  }

  async append(event: AuditEventInput): Promise<AuditRecord> {
    const prev = await this.#client.query<{ event_hash: string }>(
      `SELECT event_hash
         FROM audit.events
        WHERE tenant_id = $1
        ORDER BY occurred_at DESC, id DESC
        LIMIT 1`,
      [event.tenantId],
    );
    const previousHash = prev.rows[0]?.event_hash ?? null;
    const occurredAt = new Date().toISOString();
    const core: AuditEventCore = {
      tenantId: event.tenantId,
      occurredAt,
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome: event.outcome,
      purpose: event.purpose ?? null,
      metadata: event.metadata ?? {},
    };
    const eventHash = computeEventHash(previousHash, core);

    const inserted = await this.#client.query<{ id: string }>(
      `INSERT INTO audit.events
         (tenant_id, occurred_at, actor_type, actor_id, action, resource_type,
          resource_id, purpose, outcome, metadata, previous_hash, event_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        core.tenantId,
        occurredAt,
        core.actorType,
        core.actorId,
        core.action,
        core.resourceType,
        core.resourceId,
        core.purpose,
        core.outcome,
        JSON.stringify(core.metadata),
        previousHash,
        eventHash,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (id === undefined) {
      throw new Error('audit event insert returned no id');
    }
    return { id, occurredAt, eventHash, previousHash };
  }
}
