import type { AssessmentVersionStatus } from '../../../../../lib/types';
import { assessmentStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface SaveBody {
  readonly label?: unknown;
  readonly rationale?: unknown;
}

interface StatusBody {
  readonly versionId?: unknown;
  readonly status?: unknown;
}

const STATUSES: readonly AssessmentVersionStatus[] = ['draft', 'validated', 'active', 'suspended'];

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (assessmentStore.getAssessment(params.id) === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  let payload: SaveBody;
  try {
    payload = (await request.json()) as SaveBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const label = typeof payload.label === 'string' ? payload.label.trim() : '';
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (label.length < 1) {
    return Response.json({ error: 'A version label is required.' }, { status: 422 });
  }
  if (rationale.length < 4) {
    return Response.json({ error: 'A rationale is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.saveVersion(params.id, label, rationale), { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (assessmentStore.getAssessment(params.id) === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const versionId = typeof payload.versionId === 'string' ? payload.versionId : '';
  const status = payload.status;
  if (versionId.length === 0) {
    return Response.json({ error: 'A version id is required.' }, { status: 422 });
  }
  if (typeof status !== 'string' || !STATUSES.includes(status as AssessmentVersionStatus)) {
    return Response.json({ error: 'A valid status is required.' }, { status: 422 });
  }
  const updated = assessmentStore.setVersionStatus(versionId, status as AssessmentVersionStatus);
  if (updated === null) {
    return Response.json({ error: 'Version not found.' }, { status: 404 });
  }
  // Activation is gated on resolved validation; the store leaves status unchanged when blocked.
  if (status === 'active' && updated.status !== 'active') {
    return Response.json(
      { error: 'Resolve validation before activating this immutable version.' },
      { status: 409 },
    );
  }
  return Response.json(updated);
}
