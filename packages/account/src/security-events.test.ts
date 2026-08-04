import { describe, it, expect } from 'vitest';
import { listSecurityEvents, parseSecurityEventQuery } from './list-security-events.js';
import { encodeCursor } from './cursor.js';
import type {
  SecurityEventListResult,
  SecurityEventRepository,
} from './security-event-repository.js';
import type { SecurityEventRecord } from './security-event-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(id: string, over: Partial<SecurityEventRecord> = {}): SecurityEventRecord {
  return {
    id,
    eventType: 'password_changed',
    outcome: 'success',
    occurredAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(result: SecurityEventListResult): SecurityEventRepository {
  return { listSecurityEvents: () => Promise.resolve(result) };
}

describe('parseSecurityEventQuery', () => {
  it('defaults limit to 25 and cursor to null', () => {
    expect(parseSecurityEventQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseSecurityEventQuery({ limit: 0 }).ok).toBe(false);
    expect(parseSecurityEventQuery({ limit: 101 }).ok).toBe(false);
    expect(parseSecurityEventQuery({ limit: 'x' }).ok).toBe(false);
  });

  it('decodes a valid cursor and rejects a malformed one', () => {
    const cursor = encodeCursor({ ts: '2026-01-01T00:00:00.000Z', id: 'e1' });
    const ok = parseSecurityEventQuery({ cursor });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.cursor).toEqual({ ts: '2026-01-01T00:00:00.000Z', id: 'e1' });
    }
    expect(parseSecurityEventQuery({ cursor: 'not-base64-json' }).ok).toBe(false);
  });
});

describe('listSecurityEvents', () => {
  it('projects records without surfacing hash material', async () => {
    const result = await listSecurityEvents(
      { repository: repo({ items: [record('e1')], total: 1, hasMore: false }) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.total).toBe(1);
      expect(result.page.nextCursor).toBeNull();
      expect(result.page.items[0]).toEqual({
        id: 'e1',
        eventType: 'password_changed',
        outcome: 'success',
        occurredAt: '2026-01-01T00:00:00.000Z',
      });
    }
  });

  it('emits a nextCursor when more pages remain', async () => {
    const result = await listSecurityEvents(
      { repository: repo({ items: [record('e1'), record('e2')], total: 5, hasMore: true }) },
      actor,
      { limit: 2, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).not.toBeNull();
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await listSecurityEvents(
      { repository: repo({ items: [], total: 0, hasMore: false }), permissions: [] },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
