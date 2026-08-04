import { createHash } from 'node:crypto';

/** Canonical, hashed fields of an audit event (excludes the surrogate id). */
export interface AuditEventCore {
  readonly tenantId: string | null;
  readonly occurredAt: string;
  readonly actorType: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: string;
  readonly purpose: string | null;
  readonly metadata: Record<string, unknown>;
}

/** Deterministically orders object keys so the hash is stable regardless of insertion order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = canonicalize(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * SHA-256 of the previous hash plus the canonical event fields, forming a tamper-evident chain:
 * altering any earlier event breaks every subsequent `event_hash`.
 */
export function computeEventHash(previousHash: string | null, event: AuditEventCore): string {
  const canonical = JSON.stringify([
    previousHash,
    event.tenantId,
    event.occurredAt,
    event.actorType,
    event.actorId,
    event.action,
    event.resourceType,
    event.resourceId,
    event.outcome,
    event.purpose,
    canonicalize(event.metadata),
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}
