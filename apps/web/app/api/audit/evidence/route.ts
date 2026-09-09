import { forwardPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return forwardPlatform({
    request,
    path: '/audit/evidence-collections',
    method: 'GET',
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: { readonly title?: unknown; readonly purpose?: unknown };
  try {
    body = (await request.json()) as { readonly title?: unknown; readonly purpose?: unknown };
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  if (title.length < 4 || purpose.length < 4) {
    return Response.json(
      { error: 'title and purpose must each contain at least 4 characters.' },
      { status: 422 },
    );
  }
  return forwardPlatform({
    request,
    path: '/audit/evidence-collections',
    method: 'POST',
    body: {
      reason: 'Create a purpose-scoped evidence collection.',
      expectedVersion: 0,
      data: { title, purpose, framework: 'EU AI Act' },
    },
  });
}
