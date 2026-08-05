import { describe, it, expect } from 'vitest';
import type { Actor, StaffRepository, StaffRecord, StaffInvitationRecord } from '@cpf/org';
import {
  createStaffService,
  handleListStaff,
  handleCreateStaffInvitation,
  handleResendStaffInvitation,
  handleRevokeStaffInvitation,
  handleUpdateStaffRoles,
  handleUpdateStaffStatus,
} from './staff.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
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

function svc(overrides: Partial<StaffRepository> = {}) {
  return createStaffService({ repository: repo(overrides) });
}

describe('handleListStaff', () => {
  it('returns 200', async () => expect((await handleListStaff(svc(), { actor })).status).toBe(200));
});

describe('handleCreateStaffInvitation', () => {
  it('returns 201', async () => {
    const res = await handleCreateStaffInvitation(svc(), {
      actor,
      body: { email: 'a@b.com', roles: ['x'] },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () =>
    expect(
      (await handleCreateStaffInvitation(svc(), { actor, body: { email: 'bad' } })).status,
    ).toBe(422));
});

describe('handleResendStaffInvitation', () => {
  it('returns 200', async () =>
    expect((await handleResendStaffInvitation(svc(), { actor, invitationId: ID })).status).toBe(
      200,
    ));
  it('returns 422 for bad id', async () =>
    expect((await handleResendStaffInvitation(svc(), { actor, invitationId: 'bad' })).status).toBe(
      422,
    ));
  it('returns 404 when missing', async () => {
    const res = await handleResendStaffInvitation(
      svc({ resendInvitation: () => Promise.resolve(null) }),
      {
        actor,
        invitationId: ID,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleRevokeStaffInvitation', () => {
  it('returns 204', async () =>
    expect((await handleRevokeStaffInvitation(svc(), { actor, invitationId: ID })).status).toBe(
      204,
    ));
  it('returns 404 when missing', async () => {
    const res = await handleRevokeStaffInvitation(
      svc({ revokeInvitation: () => Promise.resolve(false) }),
      {
        actor,
        invitationId: ID,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleUpdateStaffRoles', () => {
  it('returns 200', async () => {
    const res = await handleUpdateStaffRoles(svc(), { actor, userId: ID, body: { roles: ['x'] } });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleUpdateStaffRoles(svc(), { actor, userId: ID, body: { roles: [] } });
    expect(res.status).toBe(422);
  });
});

describe('handleUpdateStaffStatus', () => {
  it('returns 200', async () => {
    const res = await handleUpdateStaffStatus(svc(), {
      actor,
      userId: ID,
      body: { status: 'suspended', reason: 'x' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleUpdateStaffStatus(svc(), {
      actor,
      userId: 'bad',
      body: { status: 'suspended', reason: 'x' },
    });
    expect(res.status).toBe(422);
  });
});
