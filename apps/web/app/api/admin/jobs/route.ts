import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface JobBody {
  readonly id?: unknown;
  readonly action?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getJobs());
}

export async function POST(request: Request): Promise<Response> {
  let payload: JobBody;
  try {
    payload = (await request.json()) as JobBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const action = payload.action;
  if (id.length === 0) {
    return Response.json({ error: 'A job id is required.' }, { status: 422 });
  }
  if (action !== 'retry' && action !== 'cancel') {
    return Response.json({ error: 'Action must be retry or cancel.' }, { status: 422 });
  }
  const updated = adminStore.actOnJob(id, action);
  if (updated === null) {
    return Response.json({ error: 'Job not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
