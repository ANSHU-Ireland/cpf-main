import { describe, it, expect } from 'vitest';
import {
  listNotificationPreferences,
  parsePreferenceQuery,
  parsePreferenceUpdate,
  updateNotificationPreferences,
} from './notification-preferences.js';
import type {
  NotificationPreferenceListResult,
  NotificationPreferenceRepository,
} from './notification-preference-repository.js';
import type {
  NotificationPreferenceRecord,
  NotificationPreferenceSetting,
} from './notification-preference-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(over: Partial<NotificationPreferenceRecord> = {}): NotificationPreferenceRecord {
  return {
    id: 'p1',
    channel: 'email',
    category: 'security',
    enabled: true,
    mandatory: false,
    digestFrequency: 'immediate',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(
  list: NotificationPreferenceListResult,
  onApply?: (settings: readonly NotificationPreferenceSetting[]) => void,
): NotificationPreferenceRepository {
  return {
    listPreferences: () => Promise.resolve(list),
    applyPreferenceUpdate: (_actor, settings) => {
      onApply?.(settings);
      return Promise.resolve();
    },
  };
}

describe('parsePreferenceQuery', () => {
  it('defaults limit to 25', () => {
    expect(parsePreferenceQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parsePreferenceQuery({ limit: 0 }).ok).toBe(false);
    expect(parsePreferenceQuery({ limit: 101 }).ok).toBe(false);
  });
});

describe('parsePreferenceUpdate', () => {
  it('accepts a valid items array', () => {
    const result = parsePreferenceUpdate({
      items: [{ channel: 'email', category: 'security', enabled: false, digestFrequency: 'daily' }],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        items: [
          { channel: 'email', category: 'security', enabled: false, digestFrequency: 'daily' },
        ],
      },
    });
  });

  it('rejects unknown top-level and item properties', () => {
    expect(parsePreferenceUpdate({ items: [], bogus: 1 }).ok).toBe(false);
    const bad = parsePreferenceUpdate({
      items: [{ channel: 'email', category: 'x', enabled: true, extra: 1 }],
    });
    expect(bad.ok).toBe(false);
  });

  it('rejects an invalid channel or digestFrequency', () => {
    expect(
      parsePreferenceUpdate({ items: [{ channel: 'fax', category: 'x', enabled: true }] }).ok,
    ).toBe(false);
    expect(
      parsePreferenceUpdate({
        items: [{ channel: 'email', category: 'x', enabled: true, digestFrequency: 'hourly' }],
      }).ok,
    ).toBe(false);
  });

  it('rejects an empty items array and duplicate channel/category', () => {
    expect(parsePreferenceUpdate({ items: [] }).ok).toBe(false);
    const dup = parsePreferenceUpdate({
      items: [
        { channel: 'email', category: 'security', enabled: true },
        { channel: 'email', category: 'security', enabled: false },
      ],
    });
    expect(dup.ok).toBe(false);
  });

  it('rejects non-object bodies', () => {
    expect(parsePreferenceUpdate(null).ok).toBe(false);
    expect(parsePreferenceUpdate([]).ok).toBe(false);
  });
});

describe('listNotificationPreferences', () => {
  it('projects records including the mandatory flag', async () => {
    const result = await listNotificationPreferences(
      { repository: repo({ items: [record({ mandatory: true })], total: 1, hasMore: false }) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items[0]).toEqual({
        id: 'p1',
        channel: 'email',
        category: 'security',
        enabled: true,
        mandatory: true,
        digestFrequency: 'immediate',
      });
    }
  });

  it('emits a nextCursor when more pages remain', async () => {
    const result = await listNotificationPreferences(
      { repository: repo({ items: [record()], total: 3, hasMore: true }) },
      actor,
      { limit: 1, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).not.toBeNull();
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await listNotificationPreferences(
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

describe('updateNotificationPreferences', () => {
  it('applies the update and returns the refreshed page', async () => {
    let applied: readonly NotificationPreferenceSetting[] | undefined;
    const result = await updateNotificationPreferences(
      {
        repository: repo(
          { items: [record({ enabled: false })], total: 1, hasMore: false },
          (s) => (applied = s),
        ),
      },
      actor,
      { items: [{ channel: 'email', category: 'security', enabled: false }] },
    );
    expect(applied).toEqual([{ channel: 'email', category: 'security', enabled: false }]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items[0]?.enabled).toBe(false);
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await updateNotificationPreferences(
      { repository: repo({ items: [], total: 0, hasMore: false }), permissions: [] },
      actor,
      { items: [{ channel: 'email', category: 'security', enabled: false }] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
