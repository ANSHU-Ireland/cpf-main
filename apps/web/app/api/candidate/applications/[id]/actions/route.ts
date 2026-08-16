import { forwardPlatform } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

const ACTIONS = new Set(['withdraw', 'explanation', 'human_review']);

interface ActionBody {
  readonly action?: unknown;
  readonly reason?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (!ACTIONS.has(action)) {
    return Response.json({ error: 'Unsupported action.' }, { status: 422 });
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if ((action === 'explanation' || action === 'human_review') && reason.length < 5) {
    return Response.json(
      { error: 'Please describe your request in a little more detail.' },
      { status: 422 },
    );
  }

  const suffix =
    action === 'withdraw'
      ? 'withdrawal'
      : action === 'human_review'
        ? 'human-review'
        : 'explanations';
  return forwardPlatform({
    request,
    path: `/candidate/applications/${encodeURIComponent(params.id)}/${suffix}`,
    method: 'POST',
    body: { reason: reason || 'Withdrawn by candidate.' },
  });
}
