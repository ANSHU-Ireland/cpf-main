import type { DecisionOutcome } from '../../../../../lib/types';
import { employerStore } from '../../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface DecisionBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
  readonly evidenceLinks?: unknown;
}

const OUTCOMES: readonly DecisionOutcome[] = [
  'progress',
  'hold',
  'live_verification',
  'reattempt',
  'not_progress',
  'withdrawn',
];

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
    const persisted = await demoPersistence.getDecision(params.id);
    if (persisted !== null) return Response.json(persisted);
  } catch (error) {
    const response = persistenceError(error);
    if (response !== null) return response;
    throw error;
  }
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getDecision());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: DecisionBody;
  try {
    payload = (await request.json()) as DecisionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const outcome = payload.outcome;
  if (typeof outcome !== 'string' || !OUTCOMES.includes(outcome as DecisionOutcome)) {
    return Response.json({ error: 'Choose a valid human outcome.' }, { status: 422 });
  }
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (rationale.length < 10) {
    return Response.json(
      { error: 'A written rationale of at least 10 characters is required.' },
      { status: 422 },
    );
  }
  const evidenceLinks = Array.isArray(payload.evidenceLinks)
    ? payload.evidenceLinks.filter((value): value is string => typeof value === 'string')
    : [];
  try {
    const persisted = await demoPersistence.saveDecision(
      params.id,
      outcome as DecisionOutcome,
      rationale,
      evidenceLinks,
    );
    if (persisted !== null) return Response.json(persisted);
  } catch (error) {
    const response = persistenceError(error);
    if (response !== null) return response;
    throw error;
  }
  if (params.id !== employerStore.applicationId) {
    return Response.json({ error: 'Application not found.' }, { status: 404 });
  }
  const draft = employerStore.getDecision();
  if (!draft.reviewComplete) {
    return Response.json(
      { error: 'Review must be complete before a decision can be drafted.' },
      { status: 409 },
    );
  }
  return Response.json(
    employerStore.saveDecision(outcome as DecisionOutcome, rationale, evidenceLinks),
  );
}
