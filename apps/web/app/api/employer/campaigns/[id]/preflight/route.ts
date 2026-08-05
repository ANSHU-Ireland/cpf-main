import { employerStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface PreflightBody {
  readonly checkId?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (employerStore.getCampaign(params.id) === null) {
    return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getPreflight());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (employerStore.getCampaign(params.id) === null) {
    return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  }
  let payload: PreflightBody;
  try {
    payload = (await request.json()) as PreflightBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const checkId = typeof payload.checkId === 'string' ? payload.checkId : '';
  const updated = employerStore.resolvePreflight(checkId);
  if (updated === null) {
    return Response.json({ error: 'Preflight check not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
