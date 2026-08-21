import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function request(body: unknown): Request {
  return new Request('http://web.test/api/auth/sign-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('database-backed sign-in', () => {
  it('sets the API session cookie and selects an authorized workspace', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          accessToken: 'database-session-token',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          mfaRequired: false,
          passwordResetRequired: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          userType: 'tenant_member',
          tenant: { roles: ['employer_admin', 'governance_officer'] },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request({
        email: 'admin@northstar.invalid',
        password: 'CPF-UAT-ChangeMe-2026!',
        workspace: '/governance',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mfaRequired: false,
      passwordResetRequired: true,
      redirectTo: '/governance',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get('set-cookie')).toContain('cpf_session=database-session-token');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  });

  it('passes through an invalid-credentials response without issuing a cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ title: 'Invalid credentials' }, { status: 401 })),
    );
    const response = await POST(
      request({ email: 'admin@northstar.invalid', password: 'not-the-demo-password' }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('does not issue a session cookie until MFA is complete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          accessToken: '',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          mfaRequired: true,
        }),
      ),
    );
    const response = await POST(
      request({ email: 'admin@northstar.invalid', password: 'CPF-UAT-ChangeMe-2026!' }),
    );
    await expect(response.json()).resolves.toEqual({ mfaRequired: true, redirectTo: '/mfa' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
