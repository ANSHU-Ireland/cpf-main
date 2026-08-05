import { employerStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ApprovalBody {
  readonly action?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getApproval());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  let payload: ApprovalBody;
  try {
    payload = (await request.json()) as ApprovalBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const current = employerStore.getApproval();
  // Segregation of duties: only a submitted draft awaiting approval can be acted on.
  if (current.status !== 'awaiting_approval') {
    return Response.json(
      { error: 'No decision is awaiting approval for this application.' },
      { status: 409 },
    );
  }
  if (payload.action === 'approve') {
    return Response.json(employerStore.approveDecision());
  }
  if (payload.action === 'return') {
    return Response.json(employerStore.returnDecision());
  }
  return Response.json(
    { error: 'A valid action (approve or return) is required.' },
    { status: 422 },
  );
}
