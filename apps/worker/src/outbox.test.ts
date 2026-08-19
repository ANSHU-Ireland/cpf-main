import { describe, expect, it, vi } from 'vitest';
import {
  OutboxProcessor,
  retryDelayMs,
  type EventPublisher,
  type OutboxEvent,
  type OutboxRepository,
} from './outbox.js';

function event(id: string, attemptCount = 1): OutboxEvent {
  return {
    id,
    tenantId: 'tenant-1',
    aggregateType: 'attempt',
    aggregateId: 'attempt-1',
    eventType: 'attempt.saved',
    eventVersion: 1,
    payload: { responseHash: 'safe-hash' },
    dataClassification: 'confidential',
    correlationId: 'correlation-1',
    causationId: null,
    attemptCount,
    createdAt: '2026-08-16T00:00:00.000Z',
  };
}

function repository(events: readonly OutboxEvent[]): OutboxRepository & {
  markPublished: ReturnType<typeof vi.fn>;
  markRetry: ReturnType<typeof vi.fn>;
  markDeadLetter: ReturnType<typeof vi.fn>;
} {
  return {
    claim: vi.fn().mockResolvedValue(events),
    markPublished: vi.fn().mockResolvedValue(true),
    markRetry: vi.fn().mockResolvedValue(true),
    markDeadLetter: vi.fn().mockResolvedValue(true),
  };
}

describe('outbox processor', () => {
  it('publishes with the event id as the idempotency key', async () => {
    const repo = repository([event('event-1')]);
    const publisher: EventPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const result = await new OutboxProcessor(repo, publisher, { workerId: 'worker-1' }).runBatch();

    expect(publisher.publish).toHaveBeenCalledWith(event('event-1'), {
      idempotencyKey: 'event-1',
    });
    expect(repo.markPublished).toHaveBeenCalledWith('event-1', 'worker-1');
    expect(result).toEqual({
      claimed: 1,
      published: 1,
      retried: 0,
      deadLettered: 0,
      lostLease: 0,
    });
  });

  it('uses bounded exponential retry without storing raw errors', async () => {
    const repo = repository([event('event-2', 3)]);
    const publisher: EventPublisher = {
      publish: vi.fn().mockRejectedValue(new Error('recipient@example.test secret-value')),
    };
    const now = new Date('2026-08-16T12:00:00.000Z');
    const result = await new OutboxProcessor(repo, publisher, {
      workerId: 'worker-1',
      baseRetryMs: 1_000,
      now: () => now,
    }).runBatch();

    expect(repo.markRetry).toHaveBeenCalledWith(
      'event-2',
      'worker-1',
      new Date('2026-08-16T12:00:04.000Z'),
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(JSON.stringify(repo.markRetry.mock.calls)).not.toContain('recipient@example.test');
    expect(result.retried).toBe(1);
  });

  it('dead-letters at the configured attempt bound', async () => {
    const repo = repository([event('event-3', 8)]);
    const publisher: EventPublisher = { publish: vi.fn().mockRejectedValue(new Error('down')) };
    const result = await new OutboxProcessor(repo, publisher, {
      workerId: 'worker-1',
      maxAttempts: 8,
    }).runBatch();

    expect(repo.markDeadLetter).toHaveBeenCalledWith(
      'event-3',
      'worker-1',
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(repo.markRetry).not.toHaveBeenCalled();
    expect(result.deadLettered).toBe(1);
  });

  it('caps retry delays', () => {
    expect(retryDelayMs(1, 1_000, 10_000)).toBe(1_000);
    expect(retryDelayMs(8, 1_000, 10_000)).toBe(10_000);
  });
});
