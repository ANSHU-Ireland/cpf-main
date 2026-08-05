import { describe, it, expect } from 'vitest';
import type { Actor, MemberInvitationRepository, MemberInvitationRecord } from '@cpf/org';
import {
  createMemberInvitationService,
  handleCreateMemberInvitation,
  handleResendMemberInvitation,
  handleRevokeMemberInvitation,
} from './member-invitations.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const record: MemberInvitationRecord = {
  id: VALID_ID,
  email: 'a@b.com',
  roles: ['reviewer'],
  status: 'sent',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<MemberInvitationRepository> = {}): MemberInvitationRepository {
  return {
    createInvitation: () => Promise.resolve(record),
    resendInvitation: () => Promise.resolve(record),
    revokeInvitation: () => Promise.resolve(true),
    ...overrides,
  };
}

function svc(overrides: Partial<MemberInvitationRepository> = {}) {
  return createMemberInvitationService({ repository: repo(overrides) });
}

describe('handleCreateMemberInvitation', () => {
  it('returns 201', async () => {
    const res = await handleCreateMemberInvitation(svc(), {
      actor,
      body: { email: 'a@b.com', roles: ['reviewer'] },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleCreateMemberInvitation(svc(), { actor, body: { email: 'bad' } });
    expect(res.status).toBe(422);
  });
});

describe('handleResendMemberInvitation', () => {
  it('returns 200', async () => {
    const res = await handleResendMemberInvitation(svc(), { actor, invitationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleResendMemberInvitation(svc(), { actor, invitationId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when missing', async () => {
    const res = await handleResendMemberInvitation(
      svc({ resendInvitation: () => Promise.resolve(null) }),
      {
        actor,
        invitationId: VALID_ID,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleRevokeMemberInvitation', () => {
  it('returns 204', async () => {
    const res = await handleRevokeMemberInvitation(svc(), { actor, invitationId: VALID_ID });
    expect(res.status).toBe(204);
  });
  it('returns 404 when missing', async () => {
    const res = await handleRevokeMemberInvitation(
      svc({ revokeInvitation: () => Promise.resolve(false) }),
      {
        actor,
        invitationId: VALID_ID,
      },
    );
    expect(res.status).toBe(404);
  });
});
