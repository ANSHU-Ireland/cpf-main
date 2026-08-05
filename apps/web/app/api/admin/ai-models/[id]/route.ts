import type { AiModelStatus } from '../../../../lib/types';
import { assessmentStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

const STATUSES: readonly AiModelStatus[] = [
  'registered',
  'in_evaluation',
  'approved',
  'active',
  'suspended',
];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const detail = assessmentStore.getModel(params.id);
  if (detail === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  return Response.json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const before = assessmentStore.getModel(params.id);
  if (before === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const status = payload.status;
  if (typeof status !== 'string' || !STATUSES.includes(status as AiModelStatus)) {
    return Response.json({ error: 'A valid status is required.' }, { status: 422 });
  }
  const updated = assessmentStore.setModelStatus(params.id, status as AiModelStatus);
  if (updated === null) {
    return Response.json({ error: 'Model not found.' }, { status: 404 });
  }
  // Activation requires a recorded evaluation and the required human approvals.
  if (status === 'active' && updated.status !== 'active') {
    return Response.json(
      { error: 'Record the evaluation and required approvals before activating this model.' },
      { status: 409 },
    );
  }
  return Response.json(updated);
}
