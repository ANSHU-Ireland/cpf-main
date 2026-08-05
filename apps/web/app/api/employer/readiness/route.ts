import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ReadinessBody {
  readonly itemId?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getReadiness());
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReadinessBody;
  try {
    payload = (await request.json()) as ReadinessBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : '';
  const updated = employerStore.resolveReadiness(itemId);
  if (updated === null) {
    return Response.json({ error: 'Readiness item not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
