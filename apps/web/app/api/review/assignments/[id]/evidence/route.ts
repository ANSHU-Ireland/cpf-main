import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface EvidenceBody {
  readonly evidenceId?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getEvidence());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: EvidenceBody;
  try {
    payload = (await request.json()) as EvidenceBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const evidenceId = typeof payload.evidenceId === 'string' ? payload.evidenceId : '';
  if (evidenceId === '') {
    return Response.json({ error: 'An evidence id is required.' }, { status: 422 });
  }
  const updated = reviewStore.markEvidenceReviewed(evidenceId);
  if (updated === null) {
    return Response.json({ error: 'Evidence not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
