import { describe, it, expect } from 'vitest';
import {
  listInvitations,
  getInvitation,
  createInvitation,
  revokeInvitation,
  parseInvitationListQuery,
  parseInvitationCreate,
  parseInvitationId,
} from './invitations.js';
import type { InvitationRepository, InvitationListResult } from './invitation-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { InvitationRecord, InvitationCreate } from './invitation-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function inv(over: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    id: 'inv-1',
    applicationId: 'app-1',
    tokenHash: 'hash-1',
    status: 'created',
    maxAttempts: 1,
    validFrom: null,
    expiresAt: '2026-12-31T23:59:59.000Z',
    sentAt: null,
    revokedAt: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<InvitationRepository> = {}): InvitationRepository {
  const listResult: InvitationListResult = { items: [inv()], total: 1, hasMore: false };
  return {
    listInvitations: () => Promise.resolve(listResult),
    getInvitation: () => Promise.resolve(inv()),
    createInvitation: (_a: Actor, _appId: string, _input: InvitationCreate, tokenHash: string) =>
      Promise.resolve(inv({ tokenHash })),
    revokeInvitation: () => Promise.resolve(inv({ status: 'revoked' })),
    ...overrides,
  };
}

describe('parseInvitationListQuery', () => {
  it('applies default limit', () => {
    expect(parseInvitationListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseInvitationListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('parseInvitationCreate', () => {
  it('accepts valid input', () => {
    const r = parseInvitationCreate({ expiresAt: '2026-12-31T23:59:59Z' });
    expect(r.ok).toBe(true);
  });
  it('accepts with optional fields', () => {
    const r = parseInvitationCreate({
      expiresAt: '2026-12-31T23:59:59Z',
      validFrom: '2026-01-01T00:00:00Z',
      maxAttempts: 3,
    });
    expect(r.ok).toBe(true);
  });
  it('rejects missing expiresAt', () => {
    expect(parseInvitationCreate({}).ok).toBe(false);
  });
  it('rejects non-object', () => {
    expect(parseInvitationCreate(null).ok).toBe(false);
  });
});

describe('parseInvitationId', () => {
  it('accepts UUID', () => {
    expect(parseInvitationId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects non-UUID', () => {
    expect(parseInvitationId('bad')).toBeNull();
  });
});

describe('listInvitations', () => {
  it('returns page for admin', async () => {
    const r = await listInvitations({ repository: repo() }, admin, 'app-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listInvitations({ repository: repo() }, noRole, 'app-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(false);
  });
});

describe('getInvitation', () => {
  it('returns invitation for admin', async () => {
    const r = await getInvitation({ repository: repo() }, admin, 'inv-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await getInvitation(
      { repository: repo({ getInvitation: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createInvitation', () => {
  it('creates for admin', async () => {
    const r = await createInvitation(
      { repository: repo(), generateTokenHash: () => 'test-hash' },
      admin,
      'app-1',
      { expiresAt: '2026-12-31T23:59:59Z' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.invitation.tokenHash).toBe('test-hash');
  });
  it('denies non-admin', async () => {
    const r = await createInvitation({ repository: repo() }, noRole, 'app-1', {
      expiresAt: '2026-12-31T23:59:59Z',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});

describe('revokeInvitation', () => {
  it('revokes for admin', async () => {
    const r = await revokeInvitation({ repository: repo() }, admin, 'inv-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.invitation.status).toBe('revoked');
  });
  it('returns 404 when not found', async () => {
    const r = await revokeInvitation(
      { repository: repo({ getInvitation: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
  it('returns 409 when already revoked', async () => {
    const r = await revokeInvitation(
      {
        repository: repo({
          getInvitation: () => Promise.resolve(inv({ status: 'revoked' })),
          revokeInvitation: () => Promise.resolve(null),
        }),
      },
      admin,
      'inv-1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});
