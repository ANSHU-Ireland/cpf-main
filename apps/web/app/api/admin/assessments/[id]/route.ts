import type { AssessmentStatus } from '../../../../lib/types';
import { assessmentStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

const STATUSES: readonly AssessmentStatus[] = [
  'draft',
  'in_review',
  'active',
  'suspended',
  'retired',
];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const detail = assessmentStore.getAssessment(params.id);
  if (detail === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  return Response.json(detail);
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
  const status = payload.status;
  if (typeof status !== 'string' || !STATUSES.includes(status as AssessmentStatus)) {
    return Response.json({ error: 'A valid status is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.setAssessmentStatus(params.id, status as AssessmentStatus));
}
