import type { DecisionOutcome } from '../../../../../lib/types';
import { employerStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface DecisionBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
}

const OUTCOMES: readonly DecisionOutcome[] = ['advance', 'hold', 'reject'];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getDecision());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  let payload: DecisionBody;
  try {
    payload = (await request.json()) as DecisionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const outcome = payload.outcome;
  if (typeof outcome !== 'string' || !OUTCOMES.includes(outcome as DecisionOutcome)) {
    return Response.json({ error: 'A valid outcome is required.' }, { status: 422 });
  }
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  // A human decision must carry a written rationale — the platform never decides.
  if (rationale.length < 10) {
    return Response.json(
      { error: 'A written rationale of at least 10 characters is required.' },
      { status: 422 },
    );
  }
  const draft = employerStore.getDecision();
  if (!draft.reviewComplete) {
    return Response.json(
      { error: 'Review must be complete before a decision can be drafted.' },
      { status: 409 },
    );
  }
  return Response.json(employerStore.saveDecision(outcome as DecisionOutcome, rationale));
}
