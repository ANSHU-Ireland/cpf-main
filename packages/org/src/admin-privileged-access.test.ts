import { describe, it, expect } from 'vitest';
import {
  createPrivilegedAccessGrant,
  revokePrivilegedAccessGrant,
  parsePrivilegedAccessGrantCreate,
  parsePrivilegedAccessGrantId,
  type AdminPrivilegedAccessRepository,
  type PrivilegedAccessGrantRecord,
} from './admin-privileged-access.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const grant: PrivilegedAccessGrantRecord = {
  id: ID,
  userId: ID,
  scope: 'db:read',
  reason: 'incident',
  expiresAt: '2026-02-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(
  overrides: Partial<AdminPrivilegedAccessRepository> = {},
): AdminPrivilegedAccessRepository {
  return {
    createGrant: () => Promise.resolve(grant),
    revokeGrant: () => Promise.resolve(true),
    ...overrides,
  };
}

function deps(overrides: Partial<AdminPrivilegedAccessRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parsePrivilegedAccessGrantCreate', () => {
  it('accepts valid input', () =>
    expect(
      parsePrivilegedAccessGrantCreate({
        userId: ID,
        scope: 'db:read',
        reason: 'incident',
        expiresAt: '2026-02-01T00:00:00.000Z',
      }).ok,
    ).toBe(true));
  it('rejects a bad userId', () =>
    expect(
      parsePrivilegedAccessGrantCreate({
        userId: 'nope',
        scope: 'db:read',
        reason: 'incident',
        expiresAt: '2026-02-01T00:00:00.000Z',
      }).ok,
    ).toBe(false));
  it('rejects a bad expiry', () =>
    expect(
      parsePrivilegedAccessGrantCreate({
        userId: ID,
        scope: 'db:read',
        reason: 'incident',
        expiresAt: 'nope',
      }).ok,
    ).toBe(false));
});

describe('parsePrivilegedAccessGrantId', () => {
  it('accepts a UUID', () => expect(parsePrivilegedAccessGrantId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parsePrivilegedAccessGrantId('nope')).toBeNull());
});

describe('createPrivilegedAccessGrant', () => {
  it('creates for staff', async () => {
    const r = await createPrivilegedAccessGrant(deps(), staff, {
      userId: ID,
      scope: 'db:read',
      reason: 'incident',
      expiresAt: '2026-02-01T00:00:00.000Z',
    });
    expect(r.ok).toBe(true);
  });
  it('denies an outsider', async () => {
    const r = await createPrivilegedAccessGrant(deps(), outsider, {
      userId: ID,
      scope: 'db:read',
      reason: 'incident',
      expiresAt: '2026-02-01T00:00:00.000Z',
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('revokePrivilegedAccessGrant', () => {
  it('revokes for staff', async () =>
    expect((await revokePrivilegedAccessGrant(deps(), staff, ID)).ok).toBe(true));
  it('returns 404 when not removed', async () => {
    const r = await revokePrivilegedAccessGrant(
      deps({ revokeGrant: () => Promise.resolve(false) }),
      staff,
      ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
  it('denies an outsider', async () => {
    const r = await revokePrivilegedAccessGrant(deps(), outsider, ID);
    expect(r.ok === false && r.status).toBe(403);
  });
});
