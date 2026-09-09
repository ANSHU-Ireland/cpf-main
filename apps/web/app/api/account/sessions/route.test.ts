import { afterEach, expect, it, vi } from 'vitest';
import { GET } from './route';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('forwards pagination and caller authentication, not arbitrary query fields', async () => {
  vi.stubEnv('CPF_API_BASE_URL', 'https://platform.test');
  const payload = { items: [], total: 42, nextCursor: 'next' };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
  vi.stubGlobal('fetch', fetchMock);
  const response = await GET(
    new Request('http://web.test/api/account/sessions?limit=10&cursor=a%2Bb&userId=other', {
      headers: { cookie: 'cpf_session=test-caller' },
    }),
  );
  await expect(response.json()).resolves.toEqual(payload);
  const url = fetchMock.mock.calls[0]?.[0] as URL;
  expect(url.pathname).toBe('/me/sessions');
  expect(url.searchParams.get('cursor')).toBe('a+b');
  expect(url.searchParams.get('limit')).toBe('10');
  expect(url.searchParams.has('userId')).toBe(false);
  expect(
    ((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('authorization'),
  ).toBe('Bearer test-caller');
});
