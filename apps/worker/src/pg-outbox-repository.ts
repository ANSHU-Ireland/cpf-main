import type { Pool } from 'pg';
import type { OutboxEvent, OutboxRepository } from './outbox.js';

interface OutboxRow {
  readonly id: string;
  readonly tenant_id: string | null;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly event_type: string;
  readonly event_version: number;
  readonly payload: Record<string, unknown>;
  readonly data_classification: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly attempt_count: number;
  readonly created_at: Date;
}

function mapRow(row: OutboxRow): OutboxEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    payload: row.payload,
    dataClassification: row.data_classification,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    attemptCount: row.attempt_count,
    createdAt: row.created_at.toISOString(),
  };
}

export class PgOutboxRepository implements OutboxRepository {
  constructor(private readonly pool: Pool) {}

  async claim(input: {
    readonly workerId: string;
    readonly limit: number;
    readonly leaseMs: number;
  }): Promise<readonly OutboxEvent[]> {
    const result = await this.pool.query<OutboxRow>(
      `WITH candidates AS (
         SELECT id
           FROM audit.outbox_events
          WHERE (
                  status IN ('pending', 'failed')
                  AND available_at <= now()
                )
             OR (
                  status = 'publishing'
                  AND locked_at < now() - ($3::integer * interval '1 millisecond')
                )
          ORDER BY available_at, created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       )
       UPDATE audit.outbox_events AS event
          SET status = 'publishing',
              attempt_count = attempt_count + 1,
              locked_at = now(),
              locked_by = $2,
              last_error_hash = NULL
         FROM candidates
        WHERE event.id = candidates.id
       RETURNING event.id, event.tenant_id, event.aggregate_type, event.aggregate_id,
                 event.event_type, event.event_version, event.payload,
                 event.data_classification, event.correlation_id, event.causation_id,
                 event.attempt_count, event.created_at`,
      [input.limit, input.workerId, input.leaseMs],
    );
    return result.rows.map(mapRow);
  }

  async markPublished(eventId: string, workerId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE audit.outbox_events
          SET status = 'published', published_at = now(), locked_at = NULL, locked_by = NULL
        WHERE id = $1 AND status = 'publishing' AND locked_by = $2`,
      [eventId, workerId],
    );
    return result.rowCount === 1;
  }

  async markRetry(
    eventId: string,
    workerId: string,
    availableAt: Date,
    errorHash: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE audit.outbox_events
          SET status = 'failed', available_at = $3, last_error_hash = $4,
              locked_at = NULL, locked_by = NULL
        WHERE id = $1 AND status = 'publishing' AND locked_by = $2`,
      [eventId, workerId, availableAt, errorHash],
    );
    return result.rowCount === 1;
  }

  async markDeadLetter(eventId: string, workerId: string, errorHash: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE audit.outbox_events
          SET status = 'dead_letter', last_error_hash = $3, locked_at = NULL, locked_by = NULL
        WHERE id = $1 AND status = 'publishing' AND locked_by = $2`,
      [eventId, workerId, errorHash],
    );
    return result.rowCount === 1;
  }
}
