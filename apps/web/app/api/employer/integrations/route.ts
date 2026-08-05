import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface IntegrationBody {
  readonly name?: unknown;
  readonly kind?: unknown;
  readonly endpoint?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getIntegrations());
}

export async function POST(request: Request): Promise<Response> {
  let payload: IntegrationBody;
  try {
    payload = (await request.json()) as IntegrationBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const kind = typeof payload.kind === 'string' ? payload.kind.trim() : '';
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'An integration name is required.' }, { status: 422 });
  }
  if (kind.length === 0) {
    return Response.json({ error: 'An integration kind is required.' }, { status: 422 });
  }
  if (!endpoint.startsWith('https://')) {
    return Response.json({ error: 'A secure https endpoint is required.' }, { status: 422 });
  }
  return Response.json(employerStore.addIntegration(name, kind, endpoint), { status: 201 });
}
