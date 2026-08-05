import { assessmentStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ResolveBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
}

// The reviewable version for an assessment is its draft/validated (non-active) version.
function versionIdFor(assessmentId: string): string | null {
  const detail = assessmentStore.getAssessment(assessmentId);
  if (detail === null) return null;
  const target = detail.versions.find((v) => v.status === 'draft' || v.status === 'validated');
  return target?.id ?? detail.versions[0]?.id ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const versionId = versionIdFor(params.id);
  if (versionId === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  const validation = assessmentStore.getValidation(versionId);
  if (validation === null) {
    return Response.json({ error: 'No validation record for this assessment.' }, { status: 404 });
  }
  return Response.json(validation);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const versionId = versionIdFor(params.id);
  if (versionId === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  let payload: ResolveBody;
  try {
    payload = (await request.json()) as ResolveBody;
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
  const resolved = assessmentStore.resolveValidation(versionId, outcome, rationale);
  if (resolved === null) {
    return Response.json({ error: 'No validation record for this assessment.' }, { status: 404 });
  }
  return Response.json(resolved);
}
