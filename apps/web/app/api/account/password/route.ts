import { forwardPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  return forwardPlatform({
    request,
    path: '/auth/password/change',
    method: 'POST',
    body,
  });
}
