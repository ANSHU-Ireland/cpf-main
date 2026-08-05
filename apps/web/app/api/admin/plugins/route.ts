import { assessmentStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  readonly name?: unknown;
  readonly capabilities?: unknown;
  readonly dataScope?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(assessmentStore.getPlugins());
}

export async function POST(request: Request): Promise<Response> {
  let payload: RegisterBody;
  try {
    payload = (await request.json()) as RegisterBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const dataScope = typeof payload.dataScope === 'string' ? payload.dataScope.trim() : '';
  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  if (name.length < 2) {
    return Response.json({ error: 'A plugin name is required.' }, { status: 422 });
  }
  if (capabilities.length === 0) {
    return Response.json({ error: 'At least one capability is required.' }, { status: 422 });
  }
  if (dataScope.length < 2) {
    return Response.json({ error: 'A data scope is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.registerPlugin(name, capabilities, dataScope), {
    status: 201,
  });
}
