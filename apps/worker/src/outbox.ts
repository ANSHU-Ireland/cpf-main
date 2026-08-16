import { createHash } from 'node:crypto';

export interface OutboxEvent {
  readonly id: string;
  readonly tenantId: string | null;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly dataClassification: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly attemptCount: number;
  readonly createdAt: string;
}

export interface OutboxRepository {
  claim(input: {
    readonly workerId: string;
    readonly limit: number;
    readonly leaseMs: number;
  }): Promise<readonly OutboxEvent[]>;
  markPublished(eventId: string, workerId: string): Promise<boolean>;
  markRetry(
    eventId: string,
    workerId: string,
    availableAt: Date,
    errorHash: string,
  ): Promise<boolean>;
  markDeadLetter(eventId: string, workerId: string, errorHash: string): Promise<boolean>;
}

export interface EventPublisher {
  publish(event: OutboxEvent, options: { readonly idempotencyKey: string }): Promise<void>;
}

export interface OutboxBatchResult {
  readonly claimed: number;
  readonly published: number;
  readonly retried: number;
  readonly deadLettered: number;
  readonly lostLease: number;
}

export interface OutboxProcessorOptions {
  readonly workerId: string;
  readonly batchSize?: number;
  readonly leaseMs?: number;
  readonly maxAttempts?: number;
  readonly baseRetryMs?: number;
  readonly maxRetryMs?: number;
  readonly now?: () => Date;
}

function errorHash(error: unknown): string {
  const safeMessage = error instanceof Error ? `${error.name}:${error.message}` : typeof error;
  return createHash('sha256').update(safeMessage).digest('hex');
}

export function retryDelayMs(
  attemptCount: number,
  baseRetryMs: number,
  maxRetryMs: number,
): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 30));
  return Math.min(maxRetryMs, baseRetryMs * 2 ** exponent);
}

export class OutboxProcessor {
  readonly #batchSize: number;
  readonly #leaseMs: number;
  readonly #maxAttempts: number;
  readonly #baseRetryMs: number;
  readonly #maxRetryMs: number;
  readonly #now: () => Date;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly options: OutboxProcessorOptions,
  ) {
    this.#batchSize = options.batchSize ?? 50;
    this.#leaseMs = options.leaseMs ?? 60_000;
    this.#maxAttempts = options.maxAttempts ?? 8;
    this.#baseRetryMs = options.baseRetryMs ?? 1_000;
    this.#maxRetryMs = options.maxRetryMs ?? 15 * 60_000;
    this.#now = options.now ?? (() => new Date());

    if (options.workerId.trim().length === 0) throw new Error('workerId is required');
    if (this.#batchSize < 1 || this.#batchSize > 500) throw new Error('batchSize must be 1..500');
    if (this.#maxAttempts < 1) throw new Error('maxAttempts must be positive');
  }

  async runBatch(signal?: AbortSignal): Promise<OutboxBatchResult> {
    const events = await this.repository.claim({
      workerId: this.options.workerId,
      limit: this.#batchSize,
      leaseMs: this.#leaseMs,
    });
    let published = 0;
    let retried = 0;
    let deadLettered = 0;
    let lostLease = 0;

    for (const event of events) {
      if (signal?.aborted === true) break;
      try {
        await this.publisher.publish(event, { idempotencyKey: event.id });
        if (await this.repository.markPublished(event.id, this.options.workerId)) published += 1;
        else lostLease += 1;
      } catch (error) {
        const hash = errorHash(error);
        if (event.attemptCount >= this.#maxAttempts) {
          if (await this.repository.markDeadLetter(event.id, this.options.workerId, hash)) {
            deadLettered += 1;
          } else lostLease += 1;
        } else {
          const delay = retryDelayMs(event.attemptCount, this.#baseRetryMs, this.#maxRetryMs);
          const availableAt = new Date(this.#now().getTime() + delay);
          if (await this.repository.markRetry(event.id, this.options.workerId, availableAt, hash)) {
            retried += 1;
          } else lostLease += 1;
        }
      }
    }

    return {
      claimed: events.length,
      published,
      retried,
      deadLettered,
      lostLease,
    };
  }
}
