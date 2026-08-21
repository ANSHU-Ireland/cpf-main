import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { EventPublisher, OutboxEvent } from './outbox.js';

const MAX_DETAIL_BYTES = 240 * 1024;

interface EventBridgeSender {
  send(command: PutEventsCommand): Promise<{
    readonly FailedEntryCount?: number;
    readonly Entries?: readonly { readonly ErrorCode?: string; readonly EventId?: string }[];
  }>;
}

export class EventBridgePublisher implements EventPublisher {
  readonly #client: EventBridgeSender;
  readonly #eventBusName: string;

  constructor(eventBusName: string, client: EventBridgeSender = new EventBridgeClient({})) {
    if (eventBusName.trim().length === 0) throw new Error('eventBusName is required');
    this.#eventBusName = eventBusName;
    this.#client = client;
  }

  async publish(event: OutboxEvent, options: { readonly idempotencyKey: string }): Promise<void> {
    const detail = JSON.stringify({
      eventId: event.id,
      idempotencyKey: options.idempotencyKey,
      tenantId: event.tenantId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      dataClassification: event.dataClassification,
      correlationId: event.correlationId,
      causationId: event.causationId,
      occurredAt: event.createdAt,
      payload: event.payload,
    });
    if (Buffer.byteLength(detail, 'utf8') > MAX_DETAIL_BYTES) {
      throw new Error('EventBridge detail exceeds the controlled 240 KiB application limit.');
    }

    const result = await this.#client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.#eventBusName,
            Source: 'ie.cpf.platform',
            DetailType: event.eventType.slice(0, 128),
            Detail: detail,
            Time: new Date(event.createdAt),
          },
        ],
      }),
    );
    const entry = result.Entries?.[0];
    if ((result.FailedEntryCount ?? 0) > 0 || entry?.EventId === undefined) {
      throw new Error(`EventBridge rejected the event (${entry?.ErrorCode ?? 'unknown'}).`);
    }
  }
}

export class MetadataLogPublisher implements EventPublisher {
  async publish(event: OutboxEvent): Promise<void> {
    process.stdout.write(
      `${JSON.stringify({
        level: 'info',
        message: 'Synthetic UAT outbox event accepted',
        eventId: event.id,
        eventType: event.eventType,
        dataClassification: event.dataClassification,
        correlationId: event.correlationId,
      })}\n`,
    );
  }
}
