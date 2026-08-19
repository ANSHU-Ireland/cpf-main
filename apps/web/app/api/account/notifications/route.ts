import { forwardPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return forwardPlatform({ request, path: '/me/notification-preferences', method: 'GET' });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { updates } = body;

  if (!Array.isArray(updates)) {
    return Response.json({ error: 'updates must be an array' }, { status: 422 });
  }

  return forwardPlatform({
    request,
    path: '/me/notification-preferences',
    method: 'PUT',
    body: { updates },
  });
}
