import { employerStore } from '../../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface ApprovalBody {
  readonly action?: unknown;
  readonly rationale?: unknown;
}

function persistenceError(error: unknown): Response | null {
  return error instanceof DemoPersistenceError
    ? Response.json({ error: error.message }, { status: error.status })
    : null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const persisted = await demoPersistence.getApproval(params.id);
    if (persisted !== null) return Response.json(persisted);
  } catch (error) {
    const response = persistenceError(error);
    if (response !== null) return response;
    throw error;
  }
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getApproval());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: ApprovalBody;
  try {
    payload = (await request.json()) as ApprovalBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (payload.action !== 'approve' && payload.action !== 'return') {
    return Response.json(
      { error: 'A valid action (approve or return) is required.' },
      { status: 422 },
    );
  }
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (payload.action === 'return' && rationale.length < 10) {
    return Response.json(
      { error: 'Explain why the decision is being returned (at least 10 characters).' },
      { status: 422 },
    );
  }
  try {
    const persisted =
      payload.action === 'approve'
        ? await demoPersistence.approveDecision(params.id)
        : await demoPersistence.returnDecision(params.id, rationale);
    if (persisted !== null) return Response.json(persisted);
  } catch (error) {
    const response = persistenceError(error);
    if (response !== null) return response;
    throw error;
  }
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  const current = employerStore.getApproval();
  if (current.status !== 'awaiting_approval') {
    return Response.json(
      { error: 'No decision is awaiting approval for this application.' },
      { status: 409 },
    );
  }
  return Response.json(
    payload.action === 'approve'
      ? employerStore.approveDecision()
      : employerStore.returnDecision(rationale),
  );
}
