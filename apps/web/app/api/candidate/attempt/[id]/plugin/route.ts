import { runtimeStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface PluginBody {
  readonly name?: unknown;
  readonly input?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  return Response.json(runtimeStore.getPluginRuns());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  let payload: PluginBody;
  try {
    payload = (await request.json()) as PluginBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name =
    typeof payload.name === 'string' && payload.name.trim() !== ''
      ? payload.name.trim()
      : 'Sample test runner';
  const input = typeof payload.input === 'string' ? payload.input : '';
  return Response.json(runtimeStore.runPlugin(name, input), { status: 201 });
}
