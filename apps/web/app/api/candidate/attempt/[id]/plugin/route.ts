import { attemptPluginRuns, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import { mutateThenProject, projectPlatform } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface PluginBody {
  readonly name?: unknown;
  readonly input?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformAttempt, object>(
    { request, path: `/attempts/${encodeURIComponent(params.id)}`, method: 'GET' },
    attemptPluginRuns,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: PluginBody;
  try {
    payload = (await request.json()) as PluginBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name =
    typeof payload.name === 'string' && payload.name.trim() !== ''
      ? payload.name.trim()
      : 'cpf.demo.workspace';
  const input = typeof payload.input === 'string' ? payload.input : '';
  const pluginCode = name === 'Sample test runner' ? 'cpf.demo.workspace' : name;
  const id = encodeURIComponent(params.id);
  return mutateThenProject<PlatformAttempt, object>({
    mutation: {
      request,
      path: `/attempts/${id}/plugins/${encodeURIComponent(pluginCode)}/execute`,
      method: 'POST',
      body: { input: { text: input } },
    },
    read: { request, path: `/attempts/${id}`, method: 'GET' },
    project: attemptPluginRuns,
  });
}
