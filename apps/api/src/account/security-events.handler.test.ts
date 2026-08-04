import { describe, it, expect } from 'vitest';
import type { Actor, ListSecurityEventsResult } from '@cpf/account';
import {
  handleGetMeSecurityEvents,
  type SecurityEventsService,
} from './security-events.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const page: ListSecurityEventsResult = {
  ok: true,
  page: {
    items: [
      {
        id: 'e1',
        eventType: 'password_changed',
        outcome: 'success',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    total: 1,
  },
};

function service(result: ListSecurityEventsResult): SecurityEventsService {
  return { listSecurityEvents: () => Promise.resolve(result) };
}

describe('handleGetMeSecurityEvents', () => {
  it('returns 200 with the event page and echoes the correlation id', async () => {
    const res = await handleGetMeSecurityEvents(service(page), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeSecurityEvents(service(page), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMeSecurityEvents(
      service({ ok: false, status: 403, reason: 'denied' }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});
