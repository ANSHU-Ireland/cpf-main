import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface AmendBody {
  readonly reason?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: AmendBody;
  try {
    payload = (await request.json()) as AmendBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  if (reason.length < 3) {
    return Response.json(
      { error: 'A reason for the amendment is required and is recorded in the audit trail.' },
      { status: 422 },
    );
  }
  return Response.json(reviewStore.amend());
}
