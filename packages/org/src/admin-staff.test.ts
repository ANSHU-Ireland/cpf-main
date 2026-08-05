import { describe, it, expect } from 'vitest';
import {
  listStaff,
  createStaffInvitation,
  resendStaffInvitation,
  revokeStaffInvitation,
  updateStaffRoles,
  updateStaffStatus,
  parseStaffInvitationCreate,
  parseStaffRolesUpdate,
  parseStaffStatusUpdate,
  parseStaffId,
  type StaffRepository,
  type StaffRecord,
  type StaffInvitationRecord,
} from './admin-staff.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const record: StaffRecord = {
  userId: ID,
  email: 'a@b.com',
  displayName: 'A',
  roles: ['platform_support'],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const invitation: StaffInvitationRecord = {
  id: ID,
  email: 'a@b.com',
  roles: ['platform_support'],
  status: 'sent',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<StaffRepository> = {}): StaffRepository {
  return {
    listStaff: () => Promise.resolve({ items: [record], total: 1 }),
    createInvitation: () => Promise.resolve(invitation),
    resendInvitation: () => Promise.resolve(invitation),
    revokeInvitation: () => Promise.resolve(true),
    updateRoles: () => Promise.resolve(record),
    updateStatus: () => Promise.resolve(record),
    ...overrides,
  };
}

function deps(overrides: Partial<StaffRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseStaffInvitationCreate', () => {
  it('accepts valid input', () => {
    expect(parseStaffInvitationCreate({ email: 'a@b.com', roles: ['x'] }).ok).toBe(true);
  });
  it('rejects a bad email', () => {
    expect(parseStaffInvitationCreate({ email: 'bad', roles: ['x'] }).ok).toBe(false);
  });
  it('rejects empty roles', () => {
    expect(parseStaffInvitationCreate({ email: 'a@b.com', roles: [] }).ok).toBe(false);
  });
});

describe('parseStaffRolesUpdate', () => {
  it('accepts valid roles', () => expect(parseStaffRolesUpdate({ roles: ['x'] }).ok).toBe(true));
  it('rejects empty roles', () => expect(parseStaffRolesUpdate({ roles: [] }).ok).toBe(false));
});

describe('parseStaffStatusUpdate', () => {
  it('accepts valid input', () =>
    expect(parseStaffStatusUpdate({ status: 'suspended', reason: 'x' }).ok).toBe(true));
  it('rejects a bad status', () =>
    expect(parseStaffStatusUpdate({ status: 'nope', reason: 'x' }).ok).toBe(false));
});

describe('parseStaffId', () => {
  it('accepts a UUID', () => expect(parseStaffId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseStaffId('nope')).toBeNull());
});

describe('listStaff', () => {
  it('returns items for platform staff', async () => {
    const r = await listStaff(deps(), staff);
    expect(r.ok && r.total).toBe(1);
  });
  it('denies a non-staff actor', async () => {
    expect((await listStaff(deps(), outsider)).ok).toBe(false);
  });
});

describe('createStaffInvitation', () => {
  it('creates an invitation', async () => {
    expect(
      (await createStaffInvitation(deps(), staff, { email: 'a@b.com', roles: ['x'] })).ok,
    ).toBe(true);
  });
  it('denies a non-staff actor', async () => {
    const r = await createStaffInvitation(deps(), outsider, { email: 'a@b.com', roles: ['x'] });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('resendStaffInvitation', () => {
  it('resends', async () => expect((await resendStaffInvitation(deps(), staff, ID)).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await resendStaffInvitation(
      deps({ resendInvitation: () => Promise.resolve(null) }),
      staff,
      ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('revokeStaffInvitation', () => {
  it('revokes', async () => expect((await revokeStaffInvitation(deps(), staff, ID)).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await revokeStaffInvitation(
      deps({ revokeInvitation: () => Promise.resolve(false) }),
      staff,
      ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('updateStaffRoles', () => {
  it('updates roles', async () =>
    expect((await updateStaffRoles(deps(), staff, ID, { roles: ['x'] })).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await updateStaffRoles(
      deps({ updateRoles: () => Promise.resolve(null) }),
      staff,
      ID,
      { roles: ['x'] },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('updateStaffStatus', () => {
  it('updates status', async () => {
    expect(
      (await updateStaffStatus(deps(), staff, ID, { status: 'suspended', reason: 'x' })).ok,
    ).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await updateStaffStatus(
      deps({ updateStatus: () => Promise.resolve(null) }),
      staff,
      ID,
      {
        status: 'suspended',
        reason: 'x',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
