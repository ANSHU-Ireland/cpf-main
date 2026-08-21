import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(body: unknown): Request {
  return new Request('http://web.test/api/auth/sign-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('synthetic demo sign-in', () => {
  it('issues the seeded admin session and selected workspace redirect in demo mode', async () => {
    vi.stubEnv('CPF_DEMO_MODE', 'true');
    const response = await POST(
      request({
        email: 'admin@northstar.invalid',
        password: 'CPF-DEMO-2026',
        workspace: '/governance',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mfaRequired: false,
      redirectTo: '/governance',
    });
    expect(response.headers.get('set-cookie')).toContain('cpf_session=cpf-demo-admin-token-2026');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  });

  it('rejects credentials that are not part of the synthetic seed', async () => {
    vi.stubEnv('CPF_DEMO_MODE', 'true');
    const response = await POST(
      request({ email: 'admin@northstar.invalid', password: 'not-the-demo-password' }),
    );
    expect(response.status).toBe(401);
  });

  it('does not issue a synthetic session when demo mode is disabled', async () => {
    vi.stubEnv('CPF_DEMO_MODE', 'false');
    const response = await POST(
      request({ email: 'admin@northstar.invalid', password: 'CPF-DEMO-2026' }),
    );
    await expect(response.json()).resolves.toEqual({ mfaRequired: true });
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
