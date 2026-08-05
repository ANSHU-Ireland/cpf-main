import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface DecideBody {
  readonly id?: unknown;
  readonly status?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getAccommodations());
}

export async function POST(request: Request): Promise<Response> {
  let payload: DecideBody;
  try {
    payload = (await request.json()) as DecideBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const status = payload.status;
  if (status !== 'approved' && status !== 'declined' && status !== 'more_info') {
    return Response.json({ error: 'A valid decision is required.' }, { status: 422 });
  }
  const updated = employerStore.decideAccommodation(id, status);
  if (updated === null) {
    return Response.json({ error: 'Accommodation request not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
