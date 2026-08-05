import { describe, it, expect } from 'vitest';
import {
  MFA_METHOD_TYPES,
  parseUuid,
  parseLogin,
  parsePasswordForgot,
  parsePasswordReset,
  parsePasswordChange,
  parseEmailChange,
  parseToken,
  parseEmailRequest,
  parseMfaChallenge,
  parseMfaEnroll,
  parseAuthListQuery,
  authenticate,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerification,
  challengeMfa,
  logout,
  logoutAll,
  changePassword,
  changeEmail,
  confirmEmailChange,
  listMfaMethods,
  enrollMfaMethod,
  removeMfaMethod,
  rotateRecoveryCodes,
  type AuthRepository,
  type AuthSessionRecord,
  type AuthMethodRecord,
  type AuthMethodPage,
  type RecoveryCodesRecord,
} from './auth.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };
const UUID = '11111111-1111-1111-1111-111111111111';
const PASSWORD = 'sup3r-secret-pw';

const session: AuthSessionRecord = {
  sessionId: UUID,
  userId: 'user-1',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '',
  mfaRequired: false,
};
const method: AuthMethodRecord = {
  id: UUID,
  userId: 'user-1',
  methodType: 'totp',
  label: null,
  confirmedAt: null,
  createdAt: '',
};
const page: AuthMethodPage = { items: [method], nextCursor: null, total: 1 };
const recovery: RecoveryCodesRecord = { codes: ['a', 'b'], generatedAt: '' };

function repo(overrides: Partial<AuthRepository> = {}): { repository: AuthRepository } {
  return {
    repository: {
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
      listMfaMethods: () => Promise.resolve(page),
      enrollMfaMethod: () => Promise.resolve(method),
      removeMfaMethod: () => Promise.resolve(true),
      challengeMfa: () => Promise.resolve(session),
      rotateRecoveryCodes: () => Promise.resolve(recovery),
      ...overrides,
    },
  };
}

const deny = { permissions: [] };

describe('parsers', () => {
  it('parseUuid validates a UUID', () => {
    expect(parseUuid(UUID)).toBe(UUID);
    expect(parseUuid('bad')).toBeNull();
  });
  it('parseLogin requires email + password', () => {
    expect(parseLogin({ email: 'a@b.co', password: PASSWORD }).ok).toBe(true);
    expect(parseLogin({ email: 'bad', password: PASSWORD }).ok).toBe(false);
    expect(parseLogin({ email: 'a@b.co' }).ok).toBe(false);
  });
  it('parsePasswordForgot requires an email', () => {
    expect(parsePasswordForgot({ email: 'a@b.co' }).ok).toBe(true);
    expect(parsePasswordForgot({}).ok).toBe(false);
  });
  it('parsePasswordReset enforces a minimum length', () => {
    expect(parsePasswordReset({ token: 't', newPassword: PASSWORD }).ok).toBe(true);
    expect(parsePasswordReset({ token: 't', newPassword: 'short' }).ok).toBe(false);
  });
  it('parsePasswordChange requires both fields', () => {
    expect(parsePasswordChange({ currentPassword: 'x', newPassword: PASSWORD }).ok).toBe(true);
    expect(parsePasswordChange({ currentPassword: 'x' }).ok).toBe(false);
  });
  it('parseEmailChange validates the new email', () => {
    expect(parseEmailChange({ newEmail: 'a@b.co' }).ok).toBe(true);
    expect(parseEmailChange({ newEmail: 'bad' }).ok).toBe(false);
  });
  it('parseToken requires a token', () => {
    expect(parseToken({ token: 't' }).ok).toBe(true);
    expect(parseToken({}).ok).toBe(false);
  });
  it('parseEmailRequest validates the email', () => {
    expect(parseEmailRequest({ email: 'a@b.co' }).ok).toBe(true);
    expect(parseEmailRequest({ email: 'bad' }).ok).toBe(false);
  });
  it('parseMfaChallenge requires challengeId + code', () => {
    expect(parseMfaChallenge({ challengeId: 'c', code: '123' }).ok).toBe(true);
    expect(parseMfaChallenge({ challengeId: 'c' }).ok).toBe(false);
  });
  it('parseMfaEnroll validates methodType', () => {
    expect(parseMfaEnroll({ methodType: 'totp' }).ok).toBe(true);
    expect(parseMfaEnroll({ methodType: 'totp', label: 'phone' }).ok).toBe(true);
    expect(parseMfaEnroll({ methodType: 'nope' }).ok).toBe(false);
    expect(MFA_METHOD_TYPES).toContain('passkey');
  });
  it('parseAuthListQuery defaults and validates', () => {
    const r = parseAuthListQuery({});
    expect(r.ok && r.value.limit).toBe(25);
    expect(parseAuthListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('public operations', () => {
  it('authenticate returns a session or 401', async () => {
    expect((await authenticate(repo(), { email: 'a@b.co', password: PASSWORD })).ok).toBe(true);
    const bad = await authenticate(repo({ login: () => Promise.resolve(null) }), {
      email: 'a@b.co',
      password: PASSWORD,
    });
    expect(bad.ok === false && bad.status).toBe(401);
  });
  it('requestPasswordReset always succeeds', async () => {
    expect((await requestPasswordReset(repo(), { email: 'a@b.co' })).ok).toBe(true);
  });
  it('resetPassword maps an invalid token to 400', async () => {
    const bad = await resetPassword(repo({ resetPassword: () => Promise.resolve(false) }), {
      token: 't',
      newPassword: PASSWORD,
    });
    expect(bad.ok === false && bad.status).toBe(400);
  });
  it('verifyEmail maps an invalid token to 400', async () => {
    const bad = await verifyEmail(repo({ verifyEmail: () => Promise.resolve(false) }), {
      token: 't',
    });
    expect(bad.ok === false && bad.status).toBe(400);
  });
  it('resendVerification always succeeds', async () => {
    expect((await resendVerification(repo(), { email: 'a@b.co' })).ok).toBe(true);
  });
  it('challengeMfa returns a session or 401', async () => {
    expect((await challengeMfa(repo(), { challengeId: 'c', code: '1' })).ok).toBe(true);
    const bad = await challengeMfa(repo({ challengeMfa: () => Promise.resolve(null) }), {
      challengeId: 'c',
      code: '1',
    });
    expect(bad.ok === false && bad.status).toBe(401);
  });
});

describe('authenticated operations', () => {
  it('logout succeeds, 404 without a session, 403 when denied', async () => {
    expect((await logout(repo(), actor)).ok).toBe(true);
    const missing = await logout(repo({ logout: () => Promise.resolve(false) }), actor);
    expect(missing.ok === false && missing.status).toBe(404);
    const denied = await logout({ ...repo(), ...deny }, actor);
    expect(denied.ok === false && denied.status).toBe(403);
  });
  it('logoutAll succeeds', async () => {
    expect((await logoutAll(repo(), actor)).ok).toBe(true);
  });
  it('changePassword maps a wrong password to 400', async () => {
    const bad = await changePassword(
      repo({ changePassword: () => Promise.resolve(false) }),
      actor,
      {
        currentPassword: 'x',
        newPassword: PASSWORD,
      },
    );
    expect(bad.ok === false && bad.status).toBe(400);
  });
  it('changeEmail maps a conflict to 409', async () => {
    const bad = await changeEmail(repo({ changeEmail: () => Promise.resolve(false) }), actor, {
      newEmail: 'a@b.co',
    });
    expect(bad.ok === false && bad.status).toBe(409);
  });
  it('confirmEmailChange maps an invalid token to 400', async () => {
    const bad = await confirmEmailChange(
      repo({ confirmEmailChange: () => Promise.resolve(false) }),
      actor,
      { token: 't' },
    );
    expect(bad.ok === false && bad.status).toBe(400);
  });
  it('listMfaMethods returns a page, 403 when denied', async () => {
    const ok = await listMfaMethods(repo(), actor, { limit: 25, cursor: null });
    expect(ok.ok && ok.page.total).toBe(1);
    const denied = await listMfaMethods({ ...repo(), ...deny }, actor, { limit: 25, cursor: null });
    expect(denied.ok === false && denied.status).toBe(403);
  });
  it('enrollMfaMethod returns the method', async () => {
    const ok = await enrollMfaMethod(repo(), actor, { methodType: 'totp' });
    expect(ok.ok && ok.method.methodType).toBe('totp');
  });
  it('removeMfaMethod maps a missing method to 404', async () => {
    const bad = await removeMfaMethod(
      repo({ removeMfaMethod: () => Promise.resolve(false) }),
      actor,
      UUID,
    );
    expect(bad.ok === false && bad.status).toBe(404);
  });
  it('rotateRecoveryCodes returns codes, 404 when none', async () => {
    const ok = await rotateRecoveryCodes(repo(), actor);
    expect(ok.ok && ok.codes.codes.length).toBe(2);
    const none = await rotateRecoveryCodes(
      repo({ rotateRecoveryCodes: () => Promise.resolve(null) }),
      actor,
    );
    expect(none.ok === false && none.status).toBe(404);
  });
});
