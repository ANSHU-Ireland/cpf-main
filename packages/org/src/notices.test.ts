import { describe, it, expect } from 'vitest';
import {
  listNotices,
  createNotice,
  parseNoticeCreate,
  parseNoticeApplicationId,
} from './notices.js';
import type { NoticeRepository } from './notice-repository.js';
import type { NoticeCreate, NoticeRecord, NoticeListResult } from './notice-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const APP_ID = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}

const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

function notice(): NoticeRecord {
  return {
    id: 'n-1',
    applicationId: APP_ID,
    noticeType: 'privacy',
    noticeVersion: '1.0',
    acknowledgedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

function repo(overrides: Partial<NoticeRepository> = {}): NoticeRepository {
  const listResult: NoticeListResult = { items: [notice()], total: 1 };
  return {
    listNotices: () => Promise.resolve(listResult),
    createNotice: (_a: Actor, _appId: string, _input: NoticeCreate) => Promise.resolve(notice()),
    ...overrides,
  };
}

describe('parseNoticeCreate', () => {
  it('accepts valid', () => {
    expect(parseNoticeCreate({ noticeType: 'privacy', noticeVersion: '1.0' }).ok).toBe(true);
  });
  it('rejects invalid type', () => {
    expect(parseNoticeCreate({ noticeType: 'bad', noticeVersion: '1.0' }).ok).toBe(false);
  });
  it('rejects missing version', () => {
    expect(parseNoticeCreate({ noticeType: 'privacy' }).ok).toBe(false);
  });
});

describe('parseNoticeApplicationId', () => {
  it('accepts UUID', () => {
    expect(parseNoticeApplicationId(APP_ID)).not.toBeNull();
  });
  it('rejects bad', () => {
    expect(parseNoticeApplicationId('bad')).toBeNull();
  });
});

describe('listNotices', () => {
  it('returns list for admin', async () => {
    const r = await listNotices({ repository: repo() }, admin, APP_ID);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listNotices({ repository: repo() }, noRole, APP_ID);
    expect(r.ok).toBe(false);
  });
});

describe('createNotice', () => {
  it('creates for admin', async () => {
    const r = await createNotice({ repository: repo() }, admin, APP_ID, {
      noticeType: 'privacy',
      noticeVersion: '1.0',
    });
    expect(r.ok).toBe(true);
  });
  it('denies non-admin', async () => {
    const r = await createNotice({ repository: repo() }, noRole, APP_ID, {
      noticeType: 'privacy',
      noticeVersion: '1.0',
    });
    expect(r.ok).toBe(false);
  });
});
