import { afterEach, describe, expect, it, vi } from 'vitest';
import { callPlatform, forwardPlatform, PlatformApiError } from './platform-api.server.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('platform API adapter', () => {
  it('fails closed before transport when no session is present', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new Request('http://web.test/api/account/profile');

    await expect(callPlatform({ request, path: '/me' })).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<PlatformApiError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the bearer session, correlation id, and idempotency key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { ok: true },
          { status: 201, headers: { 'x-correlation-id': 'upstream-correlation' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CPF_API_BASE_URL', 'https://platform.example.test');
    const request = new Request('http://web.test/api/example', {
      method: 'POST',
      headers: {
        authorization: 'Bearer session-token',
        'x-correlation-id': 'incoming-correlation',
        'idempotency-key': 'request-key',
      },
    });

    const result = await callPlatform<{ readonly ok: boolean }>({
      request,
      path: '/resource',
      method: 'POST',
      body: { value: 1 },
    });

    expect(result).toEqual({
      data: { ok: true },
      status: 201,
      correlationId: 'upstream-correlation',
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe('https://platform.example.test/resource');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer session-token');
    expect(headers.get('x-correlation-id')).toBe('incoming-correlation');
    expect(headers.get('idempotency-key')).toBe('request-key');
    expect(init.body).toBe('{"value":1}');
    expect(init.redirect).toBe('error');
  });

  it('accepts an encoded HttpOnly session cookie without forwarding other cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new Request('http://web.test/api/example', {
      headers: { cookie: 'analytics=yes; cpf_session=demo%20token; preference=compact' },
    });

    await callPlatform({ request, path: '/me' });

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);
    expect(headers.get('authorization')).toBe('Bearer demo token');
    expect(headers.has('cookie')).toBe(false);
  });

  it('maps RFC 9457 upstream errors without leaking response content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          { title: 'Forbidden', detail: 'Role denied.' },
          {
            status: 403,
            headers: {
              'content-type': 'application/problem+json',
              'x-correlation-id': 'upstream-id',
            },
          },
        ),
      ),
    );
    const request = new Request('http://web.test/api/example', {
      headers: { authorization: 'Bearer token' },
    });

    const response = await forwardPlatform({ request, path: '/admin/tenants' });

    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(response.headers.get('x-correlation-id')).toBe('upstream-id');
    await expect(response.json()).resolves.toMatchObject({
      status: 403,
      correlationId: 'upstream-id',
      detail: 'Role denied.',
    });
  });
});
