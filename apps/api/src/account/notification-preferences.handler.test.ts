import { describe, it, expect } from 'vitest';
import type { Actor, ListPreferencesResult, UpdatePreferencesResult } from '@cpf/account';
import {
  handleGetMeNotificationPreferences,
  handlePutMeNotificationPreferences,
  type NotificationPreferencesService,
} from './notification-preferences.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const page: ListPreferencesResult = {
  ok: true,
  page: {
    items: [
      {
        id: 'p1',
        channel: 'email',
        category: 'security',
        enabled: true,
        mandatory: true,
        digestFrequency: 'immediate',
      },
    ],
    nextCursor: null,
    total: 1,
  },
};

function service(
  list: ListPreferencesResult,
  update: UpdatePreferencesResult,
): NotificationPreferencesService {
  return {
    listPreferences: () => Promise.resolve(list),
    updatePreferences: () => Promise.resolve(update),
  };
}

describe('handleGetMeNotificationPreferences', () => {
  it('returns 200 with the page and echoes the correlation id', async () => {
    const res = await handleGetMeNotificationPreferences(service(page, page), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeNotificationPreferences(service(page, page), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMeNotificationPreferences(
      service({ ok: false, status: 403, reason: 'denied' }, page),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePutMeNotificationPreferences', () => {
  it('returns 200 with the refreshed page on success', async () => {
    const res = await handlePutMeNotificationPreferences(service(page, page), {
      actor,
      body: { items: [{ channel: 'email', category: 'security', enabled: false }] },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid body', async () => {
    const res = await handlePutMeNotificationPreferences(service(page, page), {
      actor,
      body: { items: [{ channel: 'fax', category: 'x', enabled: true }] },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 update result to problem+json', async () => {
    const res = await handlePutMeNotificationPreferences(
      service(page, { ok: false, status: 403, reason: 'denied' }),
      { actor, body: { items: [{ channel: 'email', category: 'security', enabled: false }] } },
    );
    expect(res.status).toBe(403);
  });
});
