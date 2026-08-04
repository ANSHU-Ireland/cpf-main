import { describe, it, expect } from 'vitest';
import { listMembers, parseMemberListQuery } from './members.js';
import type { MemberRepository, MemberListResult } from './member-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { MemberRecord } from './member-types.js';
import { encodeCursor } from './cursor.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };

function member(over: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'mem-1',
    userId: 'user-2',
    email: 'test@example.com',
    displayName: 'Test User',
    status: 'active',
    roles: ['employer_admin'],
    departmentId: null,
    teamId: null,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(result: MemberListResult): MemberRepository {
  return {
    listMembers: () => Promise.resolve(result),
    updateMemberStatus: () => Promise.resolve(null),
    replaceMemberRoles: () => Promise.resolve(null),
  };
}

describe('parseMemberListQuery', () => {
  it('applies the default limit when nothing is supplied', () => {
    expect(parseMemberListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseMemberListQuery({ limit: '0' }).ok).toBe(false);
    expect(parseMemberListQuery({ limit: 101 }).ok).toBe(false);
  });

  it('rejects an over-long cursor', () => {
    expect(parseMemberListQuery({ cursor: 'x'.repeat(513) }).ok).toBe(false);
  });

  it('decodes a valid cursor', () => {
    const cursor = encodeCursor({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    const result = parseMemberListQuery({ cursor });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cursor).toEqual({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    }
  });

  it('rejects a malformed cursor', () => {
    expect(parseMemberListQuery({ cursor: 'not-valid-base64url-json' }).ok).toBe(false);
  });
});

describe('listMembers', () => {
  it('returns a page of members for an Employer Admin', async () => {
    const items = [member()];
    const result = await listMembers(
      { repository: repo({ items, total: 1, hasMore: false }) },
      admin,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items).toHaveLength(1);
      expect(result.page.total).toBe(1);
      expect(result.page.nextCursor).toBeNull();
    }
  });

  it('produces a nextCursor when there are more results', async () => {
    const items = [member({ id: 'mem-1' }), member({ id: 'mem-2' })];
    const result = await listMembers(
      { repository: repo({ items, total: 5, hasMore: true }) },
      admin,
      { limit: 2, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).not.toBeNull();
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await listMembers(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
