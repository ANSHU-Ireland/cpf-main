import { forwardPlatform } from '../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const field = typeof body.field === 'string' ? body.field.trim() : '';
  const currentValue = typeof body.currentValue === 'string' ? body.currentValue.trim() : '';
  const correctedValue = typeof body.correctedValue === 'string' ? body.correctedValue.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (field.length < 2) {
    return Response.json({ error: 'field must be at least 2 characters' }, { status: 422 });
  }
  if (currentValue.length < 2) {
    return Response.json({ error: 'currentValue must be at least 2 characters' }, { status: 422 });
  }
  if (correctedValue.length < 2) {
    return Response.json(
      { error: 'correctedValue must be at least 2 characters' },
      { status: 422 },
    );
  }
  if (reason.length < 10) {
    return Response.json({ error: 'reason must be at least 10 characters' }, { status: 422 });
  }

  return forwardPlatform({
    request,
    path: '/candidate/profile/corrections',
    method: 'POST',
    body: { field, requestedValue: correctedValue },
  });
}
