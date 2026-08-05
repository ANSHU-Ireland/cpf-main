import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface AssignBody {
  readonly id?: unknown;
  readonly assignee?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getCases());
}

export async function POST(request: Request): Promise<Response> {
  let payload: AssignBody;
  try {
    payload = (await request.json()) as AssignBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const assignee = typeof payload.assignee === 'string' ? payload.assignee.trim() : '';
  if (id.length === 0) {
    return Response.json({ error: 'A case id is required.' }, { status: 422 });
  }
  if (assignee.length < 2) {
    return Response.json({ error: 'An assignee is required.' }, { status: 422 });
  }
  const updated = adminStore.assignCase(id, assignee);
  if (updated === null) {
    return Response.json({ error: 'Support case not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
