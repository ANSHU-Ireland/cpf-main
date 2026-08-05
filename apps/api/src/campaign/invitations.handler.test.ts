import { describe, it, expect } from 'vitest';
import type {
  Actor,
  ListInvitationsResult,
  GetInvitationResult,
  CreateInvitationResult,
  RevokeInvitationResult,
  ResendInvitationResult,
  ExtendInvitationResult,
} from '@cpf/org';
import {
  handleGetInvitations,
  handleGetInvitation,
  handlePostInvitation,
  handleRevokeInvitation,
  handleResendInvitation,
  handleExtendInvitation,
  type InvitationService,
} from './invitations.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const invDto = {
  id: 'inv-1',
  applicationId: 'app-1',
  tokenHash: 'hash-1',
  status: 'created' as const,
  maxAttempts: 1,
  validFrom: null,
  expiresAt: '2026-12-31T23:59:59.000Z',
  sentAt: null,
  revokedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [invDto], nextCursor: null, total: 1 };

function service(overrides: Partial<InvitationService> = {}): InvitationService {
  const listOk: ListInvitationsResult = { ok: true, page };
  const getOk: GetInvitationResult = { ok: true, invitation: invDto };
  const createOk: CreateInvitationResult = { ok: true, invitation: invDto };
  const revokeOk: RevokeInvitationResult = {
    ok: true,
    invitation: { ...invDto, status: 'revoked' },
  };
  return {
    listInvitations: () => Promise.resolve(listOk),
    getInvitation: () => Promise.resolve(getOk),
    createInvitation: () => Promise.resolve(createOk),
    revokeInvitation: () => Promise.resolve(revokeOk),
    resendInvitation: () =>
      Promise.resolve({
        ok: true,
        invitation: { ...invDto, status: 'sent' },
      } as ResendInvitationResult),
    extendInvitation: () =>
      Promise.resolve({ ok: true, invitation: invDto } as ExtendInvitationResult),
    ...overrides,
  };
}

describe('handleGetInvitations', () => {
  it('returns 200 with page', async () => {
    const res = await handleGetInvitations(service(), {
      actor,
      applicationId: VALID_ID,
      query: {},
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad applicationId', async () => {
    const res = await handleGetInvitations(service(), {
      actor,
      applicationId: 'bad',
      query: {},
    });
    expect(res.status).toBe(422);
  });
});

describe('handleGetInvitation', () => {
  it('returns 200', async () => {
    const res = await handleGetInvitation(service(), { actor, invitationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404 when not found', async () => {
    const res = await handleGetInvitation(
      service({
        getInvitation: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }),
      }),
      { actor, invitationId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostInvitation', () => {
  it('returns 200 on success', async () => {
    const res = await handlePostInvitation(service(), {
      actor,
      applicationId: VALID_ID,
      body: { expiresAt: '2026-12-31T23:59:59Z' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostInvitation(service(), {
      actor,
      applicationId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
});

describe('handleRevokeInvitation', () => {
  it('returns 200 on success', async () => {
    const res = await handleRevokeInvitation(service(), { actor, invitationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 409 on invalid state', async () => {
    const res = await handleRevokeInvitation(
      service({
        revokeInvitation: () => Promise.resolve({ ok: false, status: 409, reason: 'x' }),
      }),
      { actor, invitationId: VALID_ID },
    );
    expect(res.status).toBe(409);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleRevokeInvitation(service(), { actor, invitationId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handleResendInvitation', () => {
  it('returns 200 on success', async () => {
    const res = await handleResendInvitation(service(), { actor, invitationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404 when missing', async () => {
    const res = await handleResendInvitation(
      service({ resendInvitation: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, invitationId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleResendInvitation(service(), { actor, invitationId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handleExtendInvitation', () => {
  it('returns 200 on success', async () => {
    const res = await handleExtendInvitation(service(), {
      actor,
      invitationId: VALID_ID,
      applicationId: VALID_ID,
      body: { expiresAt: '2026-12-31T23:59:59Z' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleExtendInvitation(service(), {
      actor,
      invitationId: VALID_ID,
      applicationId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleExtendInvitation(service(), {
      actor,
      invitationId: 'bad',
      applicationId: VALID_ID,
      body: { expiresAt: '2026-12-31T23:59:59Z' },
    });
    expect(res.status).toBe(422);
  });
});
