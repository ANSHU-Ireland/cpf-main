import { describe, it, expect } from 'vitest';
import type { Actor, AuthRepository } from '@cpf/account';
import {
  createAuthService,
  handleAuthLogin,
  handleAuthPasswordForgot,
  handleAuthPasswordReset,
  handleAuthEmailVerify,
  handleAuthEmailResend,
  handleAuthMfaChallenge,
  handleAuthLogout,
  handleAuthLogoutAll,
  handleAuthPasswordChange,
  handleAuthEmailChange,
  handleAuthEmailChangeConfirm,
  handleGetAuthMfaMethods,
  handlePostAuthMfaMethod,
  handleDeleteAuthMfaMethod,
  handleAuthRotateRecoveryCodes,
} from './auth.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };
const UUID = '11111111-1111-1111-1111-111111111111';
const PASSWORD = 'sup3r-secret-pw';

const session = {
  sessionId: UUID,
  userId: 'user-1',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '',
  mfaRequired: false,
};
const method = {
  id: UUID,
  userId: 'user-1',
  methodType: 'totp' as const,
  label: null,
  confirmedAt: null,
  createdAt: '',
};

function repo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    login: () => Promise.resolve(session),
    logout: () => Promise.resolve(true),
    logoutAll: () => Promise.resolve(true),
    requestPasswordReset: () => Promise.resolve(),
    resetPassword: () => Promise.resolve(true),
    changePassword: () => Promise.resolve(true),
    verifyEmail: () => Promise.resolve(true),
    resendVerification: () => Promise.resolve(),
    changeEmail: () => Promise.resolve(true),
    confirmEmailChange: () => Promise.resolve(true),
    listMfaMethods: () => Promise.resolve({ items: [method], nextCursor: null, total: 1 }),
    enrollMfaMethod: () => Promise.resolve(method),
    removeMfaMethod: () => Promise.resolve(true),
    challengeMfa: () => Promise.resolve(session),
    rotateRecoveryCodes: () => Promise.resolve({ codes: ['a'], generatedAt: '' }),
    ...overrides,
  };
}

function svc(overrides: Partial<AuthRepository> = {}) {
  return createAuthService({ repository: repo(overrides) });
}

describe('public auth handlers', () => {
  it('login 200 / 422 / 401', async () => {
    expect(
      (await handleAuthLogin(svc(), { body: { email: 'a@b.co', password: PASSWORD } })).status,
    ).toBe(200);
    expect((await handleAuthLogin(svc(), { body: {} })).status).toBe(422);
    expect(
      (
        await handleAuthLogin(svc({ login: () => Promise.resolve(null) }), {
          body: { email: 'a@b.co', password: PASSWORD },
        })
      ).status,
    ).toBe(401);
  });
  it('passwordForgot 200', async () =>
    expect((await handleAuthPasswordForgot(svc(), { body: { email: 'a@b.co' } })).status).toBe(
      200,
    ));
  it('passwordReset 200 / 400', async () => {
    expect(
      (await handleAuthPasswordReset(svc(), { body: { token: 't', newPassword: PASSWORD } }))
        .status,
    ).toBe(200);
    expect(
      (
        await handleAuthPasswordReset(svc({ resetPassword: () => Promise.resolve(false) }), {
          body: { token: 't', newPassword: PASSWORD },
        })
      ).status,
    ).toBe(400);
  });
  it('emailVerify 200 / 400', async () => {
    expect((await handleAuthEmailVerify(svc(), { body: { token: 't' } })).status).toBe(200);
    expect(
      (
        await handleAuthEmailVerify(svc({ verifyEmail: () => Promise.resolve(false) }), {
          body: { token: 't' },
        })
      ).status,
    ).toBe(400);
  });
  it('emailResend 200', async () =>
    expect((await handleAuthEmailResend(svc(), { body: { email: 'a@b.co' } })).status).toBe(200));
  it('mfaChallenge 200 / 401', async () => {
    expect(
      (await handleAuthMfaChallenge(svc(), { body: { challengeId: 'c', code: '1' } })).status,
    ).toBe(200);
    expect(
      (
        await handleAuthMfaChallenge(svc({ challengeMfa: () => Promise.resolve(null) }), {
          body: { challengeId: 'c', code: '1' },
        })
      ).status,
    ).toBe(401);
  });
});

describe('authenticated auth handlers', () => {
  it('logout 200 / 404', async () => {
    expect((await handleAuthLogout(svc(), { actor, body: {} })).status).toBe(200);
    expect(
      (await handleAuthLogout(svc({ logout: () => Promise.resolve(false) }), { actor, body: {} }))
        .status,
    ).toBe(404);
  });
  it('logoutAll 200', async () =>
    expect((await handleAuthLogoutAll(svc(), { actor, body: {} })).status).toBe(200));
  it('passwordChange 200 / 400 / 422', async () => {
    expect(
      (
        await handleAuthPasswordChange(svc(), {
          actor,
          body: { currentPassword: 'x', newPassword: PASSWORD },
        })
      ).status,
    ).toBe(200);
    expect((await handleAuthPasswordChange(svc(), { actor, body: {} })).status).toBe(422);
    expect(
      (
        await handleAuthPasswordChange(svc({ changePassword: () => Promise.resolve(false) }), {
          actor,
          body: { currentPassword: 'x', newPassword: PASSWORD },
        })
      ).status,
    ).toBe(400);
  });
  it('emailChange 200 / 409', async () => {
    expect(
      (await handleAuthEmailChange(svc(), { actor, body: { newEmail: 'a@b.co' } })).status,
    ).toBe(200);
    expect(
      (
        await handleAuthEmailChange(svc({ changeEmail: () => Promise.resolve(false) }), {
          actor,
          body: { newEmail: 'a@b.co' },
        })
      ).status,
    ).toBe(409);
  });
  it('emailChangeConfirm 200 / 400', async () => {
    expect(
      (await handleAuthEmailChangeConfirm(svc(), { actor, body: { token: 't' } })).status,
    ).toBe(200);
    expect(
      (
        await handleAuthEmailChangeConfirm(
          svc({ confirmEmailChange: () => Promise.resolve(false) }),
          {
            actor,
            body: { token: 't' },
          },
        )
      ).status,
    ).toBe(400);
  });
  it('listMfaMethods 200', async () =>
    expect((await handleGetAuthMfaMethods(svc(), { actor, query: {} })).status).toBe(200));
  it('enrollMfaMethod 201 / 422', async () => {
    expect(
      (await handlePostAuthMfaMethod(svc(), { actor, body: { methodType: 'totp' } })).status,
    ).toBe(201);
    expect(
      (await handlePostAuthMfaMethod(svc(), { actor, body: { methodType: 'nope' } })).status,
    ).toBe(422);
  });
  it('removeMfaMethod 200 / 422 / 404', async () => {
    expect((await handleDeleteAuthMfaMethod(svc(), { actor, methodId: UUID })).status).toBe(200);
    expect((await handleDeleteAuthMfaMethod(svc(), { actor, methodId: 'bad' })).status).toBe(422);
    expect(
      (
        await handleDeleteAuthMfaMethod(svc({ removeMfaMethod: () => Promise.resolve(false) }), {
          actor,
          methodId: UUID,
        })
      ).status,
    ).toBe(404);
  });
  it('rotateRecoveryCodes 200 / 404', async () => {
    expect((await handleAuthRotateRecoveryCodes(svc(), { actor })).status).toBe(200);
    expect(
      (
        await handleAuthRotateRecoveryCodes(
          svc({ rotateRecoveryCodes: () => Promise.resolve(null) }),
          {
            actor,
          },
        )
      ).status,
    ).toBe(404);
  });
});
