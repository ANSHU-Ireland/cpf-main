import { forwardPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return forwardPlatform({ request, path: '/me/sessions', method: 'GET' });
}
