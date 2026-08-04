import { randomUUID } from 'node:crypto';

/** Header carrying the end-to-end trace id (OpenAPI `X-Correlation-ID`). */
export const CORRELATION_HEADER = 'X-Correlation-ID';

/** Returns a non-empty inbound correlation id, or a freshly generated one. */
export function ensureCorrelationId(inbound?: string): string {
  const trimmed = inbound?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : randomUUID();
}
