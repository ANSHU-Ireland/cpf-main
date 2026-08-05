import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface AssignBody {
  readonly id?: unknown;
  readonly reviewerName?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getAssignments());
}

export async function POST(request: Request): Promise<Response> {
  let payload: AssignBody;
  try {
    payload = (await request.json()) as AssignBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const reviewerName = typeof payload.reviewerName === 'string' ? payload.reviewerName.trim() : '';
  if (reviewerName.length < 2) {
    return Response.json({ error: 'A reviewer is required.' }, { status: 422 });
  }
  const updated = employerStore.assignReviewer(id, reviewerName);
  if (updated === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
