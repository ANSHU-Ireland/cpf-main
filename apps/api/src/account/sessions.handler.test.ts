import { describe, it, expect } from 'vitest';
import type { Actor, ListSessionsResult, RevokeSessionResult } from '@cpf/account';
import {
  handleDeleteMeSession,
  handleGetMeSessions,
  type SessionsService,
} from './sessions.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const page: ListSessionsResult = {
  ok: true,
  page: {
    items: [
      {
        id: 's1',
        deviceLabel: 'Chrome',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-02T00:00:00.000Z',
        expiresAt: '2999-01-01T00:00:00.000Z',
        status: 'active',
      },
    ],
    nextCursor: null,
    total: 1,
  },
};

function service(list: ListSessionsResult, revoke: RevokeSessionResult): SessionsService {
  return {
    listSessions: () => Promise.resolve(list),
    revokeSession: () => Promise.resolve(revoke),
  };
}

describe('handleGetMeSessions', () => {
  it('returns 200 with the session page and echoes the correlation id', async () => {
    const res = await handleGetMeSessions(service(page, { ok: true }), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeSessions(service(page, { ok: true }), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 list result to problem+json', async () => {
    const res = await handleGetMeSessions(
      service({ ok: false, status: 403, reason: 'denied' }, { ok: true }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handleDeleteMeSession', () => {
  it('returns 200 { revoked: true } on success', async () => {
    const res = await handleDeleteMeSession(service(page, { ok: true }), {
      actor,
      sessionId: 's1',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ revoked: true });
  });

  it('maps a 404 revoke result to problem+json', async () => {
    const res = await handleDeleteMeSession(
      service(page, { ok: false, status: 404, reason: 'not found' }),
      { actor, sessionId: 'missing' },
    );
    expect(res.status).toBe(404);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 revoke result to problem+json', async () => {
    const res = await handleDeleteMeSession(
      service(page, { ok: false, status: 403, reason: 'denied' }),
      { actor, sessionId: 's1' },
    );
    expect(res.status).toBe(403);
  });
});
