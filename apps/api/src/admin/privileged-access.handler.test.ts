import { describe, it, expect } from 'vitest';
import type { Actor, AdminPrivilegedAccessRepository, PrivilegedAccessGrantRecord } from '@cpf/org';
import {
  createAdminPrivilegedAccessService,
  handleCreatePrivilegedAccessGrant,
  handleRevokePrivilegedAccessGrant,
} from './privileged-access.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
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

function svc(overrides: Partial<AdminPrivilegedAccessRepository> = {}) {
  return createAdminPrivilegedAccessService({ repository: repo(overrides) });
}

describe('handleCreatePrivilegedAccessGrant', () => {
  it('returns 201', async () => {
    const res = await handleCreatePrivilegedAccessGrant(svc(), {
      actor,
      body: {
        userId: ID,
        scope: 'db:read',
        reason: 'incident',
        expiresAt: '2026-02-01T00:00:00.000Z',
      },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for an invalid body', async () =>
    expect((await handleCreatePrivilegedAccessGrant(svc(), { actor, body: {} })).status).toBe(422));
});

describe('handleRevokePrivilegedAccessGrant', () => {
  it('returns 204', async () =>
    expect((await handleRevokePrivilegedAccessGrant(svc(), { actor, grantId: ID })).status).toBe(
      204,
    ));
  it('returns 422 for a bad id', async () =>
    expect((await handleRevokePrivilegedAccessGrant(svc(), { actor, grantId: 'bad' })).status).toBe(
      422,
    ));
  it('returns 404 when not removed', async () =>
    expect(
      (
        await handleRevokePrivilegedAccessGrant(
          svc({ revokeGrant: () => Promise.resolve(false) }),
          {
            actor,
            grantId: ID,
          },
        )
      ).status,
    ).toBe(404));
});
