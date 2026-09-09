import { randomUUID } from 'node:crypto';
import { createPool } from '@cpf/db';
import { EventBridgePublisher, MetadataLogPublisher } from './eventbridge-publisher.js';
import { OutboxProcessor } from './outbox.js';
import { PgOutboxRepository } from './pg-outbox-repository.js';

const appEnvironment = process.env.APP_ENV ?? 'local';
const publisherMode =
  process.env.CPF_EVENT_PUBLISHER ?? (appEnvironment === 'uat' ? 'log' : 'none');
if (appEnvironment === 'production' && publisherMode !== 'eventbridge') {
  throw new Error('Production requires CPF_EVENT_PUBLISHER=eventbridge.');
}

const publisher =
  publisherMode === 'eventbridge'
    ? new EventBridgePublisher(process.env.CPF_EVENT_BUS_NAME ?? '')
    : publisherMode === 'log' && appEnvironment !== 'production'
      ? new MetadataLogPublisher()
      : null;
if (publisher === null) throw new Error('No governed outbox publisher is configured.');

const controller = new AbortController();
const stop = (): void => controller.abort();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const pool = createPool();
const workerId = `${process.env.HOSTNAME ?? 'cpf-worker'}-${randomUUID()}`;
const processor = new OutboxProcessor(new PgOutboxRepository(pool), publisher, {
  workerId,
  batchSize: Number(process.env.CPF_OUTBOX_BATCH_SIZE ?? 50),
  leaseMs: Number(process.env.CPF_OUTBOX_LEASE_MS ?? 60_000),
  maxAttempts: Number(process.env.CPF_OUTBOX_MAX_ATTEMPTS ?? 8),
});

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

try {
  process.stdout.write(`CPF outbox worker started (${publisherMode}, ${workerId}).\n`);
  while (!controller.signal.aborted) {
    const result = await processor.runBatch(controller.signal);
    if (result.claimed > 0) {
      process.stdout.write(`${JSON.stringify({ level: 'info', workerId, ...result })}\n`);
    }
    if (result.claimed === 0) {
      await delay(Number(process.env.CPF_OUTBOX_POLL_MS ?? 1_000), controller.signal);
    }
  }
} finally {
  await pool.end();
  process.stdout.write('CPF outbox worker stopped.\n');
}
