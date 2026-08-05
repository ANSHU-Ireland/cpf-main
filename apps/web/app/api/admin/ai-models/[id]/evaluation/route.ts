import { assessmentStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface RecordBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const evaluation = assessmentStore.getEvaluation(params.id);
  if (evaluation === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  return Response.json(evaluation);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (assessmentStore.getEvaluation(params.id) === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  let payload: RecordBody;
  try {
    payload = (await request.json()) as RecordBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const outcome = typeof payload.outcome === 'string' ? payload.outcome.trim() : '';
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (outcome.length < 2) {
    return Response.json({ error: 'An outcome is required.' }, { status: 422 });
  }
  if (rationale.length < 12) {
    return Response.json(
      { error: 'A rationale of at least 12 characters is required.' },
      { status: 422 },
    );
  }
  const recorded = assessmentStore.recordEvaluation(params.id, outcome, rationale);
  if (recorded === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  return Response.json(recorded);
}
