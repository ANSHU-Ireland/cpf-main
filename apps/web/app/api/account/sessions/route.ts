import { forwardPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ['cursor', 'limit']) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardPlatform({ request, path: `/me/sessions?${query.toString()}`, method: 'GET' });
}
