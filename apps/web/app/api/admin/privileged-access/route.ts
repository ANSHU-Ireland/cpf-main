import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface RequestBody {
  readonly scope?: unknown;
  readonly justification?: unknown;
}

interface ActionBody {
  readonly id?: unknown;
  readonly action?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getGrants());
}

export async function POST(request: Request): Promise<Response> {
  let payload: RequestBody;
  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const scope = typeof payload.scope === 'string' ? payload.scope.trim() : '';
  const justification =
    typeof payload.justification === 'string' ? payload.justification.trim() : '';
  if (scope.length < 2) {
    return Response.json({ error: 'A scope is required.' }, { status: 422 });
  }
  // JIT access must be justified; require a substantive rationale.
  if (justification.length < 12) {
    return Response.json(
      { error: 'A justification of at least 12 characters is required for time-bound access.' },
      { status: 422 },
    );
  }
  return Response.json(adminStore.requestGrant(scope, justification), { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: ActionBody;
  try {
    payload = (await request.json()) as ActionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const action = payload.action;
  if (id.length === 0) {
    return Response.json({ error: 'A grant id is required.' }, { status: 422 });
  }
  if (action !== 'approve' && action !== 'revoke') {
    return Response.json({ error: 'Action must be approve or revoke.' }, { status: 422 });
  }
  const updated = adminStore.actOnGrant(id, action);
  if (updated === null) {
    return Response.json({ error: 'Access grant not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
