import { candidateStore } from '../../../../../lib/synthetic.server';

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

  const updated = candidateStore.applicationAction(
    params.id,
    action as 'withdraw' | 'explanation' | 'human_review',
  );
  if (updated === null) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
