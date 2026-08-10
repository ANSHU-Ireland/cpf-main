import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ScorecardBody {
  readonly criterionId?: unknown;
  readonly score?: unknown;
  readonly rationale?: unknown;
  readonly evidenceLink?: unknown;
  readonly insufficientEvidence?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getScorecard());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: ScorecardBody;
  try {
    payload = (await request.json()) as ScorecardBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const criterionId = typeof payload.criterionId === 'string' ? payload.criterionId : '';
  if (criterionId === '') {
    return Response.json({ error: 'A criterion id is required.' }, { status: 422 });
  }
  if (typeof payload.score !== 'number' || Number.isNaN(payload.score) || payload.score < 0) {
    return Response.json({ error: 'A valid score is required.' }, { status: 422 });
  }
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (rationale.length < 3) {
    return Response.json(
      { error: 'A rationale is required for every score you record.' },
      { status: 422 },
    );
  }
  const evidenceLink = typeof payload.evidenceLink === 'string' ? payload.evidenceLink.trim() : '';
  const insufficientEvidence = payload.insufficientEvidence === true;
  if (!insufficientEvidence && evidenceLink.length < 3) {
    return Response.json(
      { error: 'Link the source evidence or choose insufficient evidence.' },
      { status: 422 },
    );
  }
  const updated = reviewStore.saveCriterion(
    criterionId,
    payload.score,
    rationale,
    evidenceLink,
    insufficientEvidence,
  );
  if (updated === null) {
    return Response.json({ error: 'Criterion not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
