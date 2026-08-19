import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

interface RequestBody {
  readonly scope?: unknown;
  readonly justification?: unknown;
}

interface ActionBody {
  readonly id?: unknown;
  readonly action?: unknown;
}

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Privileged access directory contract is incomplete',
    detail:
      'The approved API can create and revoke grants but cannot list or approve them, while this screen requires the complete lifecycle.',
    requirementIds: ['SUP-03', 'FR-SA-21'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
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
  return gap(request);
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
  return gap(request);
}
