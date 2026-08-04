import { describe, it, expect } from 'vitest';
import { listSessions, parseSessionListQuery } from './list-sessions.js';
import { revokeSession } from './revoke-session.js';
import {
  encodeSessionCursor,
  type SessionListResult,
  type SessionRepository,
} from './session-repository.js';
import type { Actor } from './types.js';
import type { SessionRecord } from './session-types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(id: string, over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    deviceLabel: 'Firefox on Linux',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSeenAt: '2026-01-02T00:00:00.000Z',
    expiresAt: '2999-01-01T00:00:00.000Z',
    revokedAt: null,
    revocationReason: null,
    ...over,
  };
}

function listRepo(result: SessionListResult): SessionRepository {
  return {
    listSessions: () => Promise.resolve(result),
    revokeSession: () => Promise.resolve(true),
  };
}

describe('parseSessionListQuery', () => {
  it('defaults limit to 25 and cursor to null', () => {
    expect(parseSessionListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseSessionListQuery({ limit: 0 }).ok).toBe(false);
    expect(parseSessionListQuery({ limit: 101 }).ok).toBe(false);
    expect(parseSessionListQuery({ limit: 'x' }).ok).toBe(false);
  });

  it('decodes a valid cursor and rejects a malformed one', () => {
    const cursor = encodeSessionCursor({ createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' });
    const ok = parseSessionListQuery({ cursor });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.cursor).toEqual({ createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' });
    }
    expect(parseSessionListQuery({ cursor: 'not-base64-json' }).ok).toBe(false);
  });
});

describe('listSessions', () => {
  it('projects records, derives status, and omits token material', async () => {
    const result = await listSessions(
      { repository: listRepo({ items: [record('s1')], total: 1, hasMore: false }) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.total).toBe(1);
      expect(result.page.nextCursor).toBeNull();
      expect(result.page.items[0]).toEqual({
        id: 's1',
        deviceLabel: 'Firefox on Linux',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-02T00:00:00.000Z',
        expiresAt: '2999-01-01T00:00:00.000Z',
        status: 'active',
      });
    }
  });

  it('marks expired and revoked sessions', async () => {
    const items = [
      record('expired', { expiresAt: '2000-01-01T00:00:00.000Z' }),
      record('revoked', { revokedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const result = await listSessions(
      { repository: listRepo({ items, total: 2, hasMore: false }) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items.map((s) => s.status)).toEqual(['expired', 'revoked']);
    }
  });

  it('emits a nextCursor when more pages remain', async () => {
    const result = await listSessions(
      { repository: listRepo({ items: [record('s1'), record('s2')], total: 5, hasMore: true }) },
      actor,
      { limit: 2, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).not.toBeNull();
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await listSessions(
      { repository: listRepo({ items: [], total: 0, hasMore: false }), permissions: [] },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('revokeSession', () => {
  it('revokes an existing session', async () => {
    let seen: [string, string] | undefined;
    const repository: SessionRepository = {
      listSessions: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
      revokeSession: (_actor, id, reason) => {
        seen = [id, reason];
        return Promise.resolve(true);
      },
    };
    const result = await revokeSession({ repository }, actor, 'sess-9', 'user_revoked');
    expect(result).toEqual({ ok: true });
    expect(seen).toEqual(['sess-9', 'user_revoked']);
  });

  it('returns 404 when nothing was revoked', async () => {
    const repository: SessionRepository = {
      listSessions: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
      revokeSession: () => Promise.resolve(false),
    };
    const result = await revokeSession({ repository }, actor, 'missing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const repository: SessionRepository = {
      listSessions: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
      revokeSession: () => Promise.resolve(true),
    };
    const result = await revokeSession({ repository, permissions: [] }, actor, 'sess-9');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
