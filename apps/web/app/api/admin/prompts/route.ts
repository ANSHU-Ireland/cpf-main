import { projectPlatform } from '../../../lib/platform-api.server';
import { prompt, type PlatformPrompt } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly promptCode?: unknown;
  readonly purpose?: unknown;
  readonly body?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformPrompt[]; total: number }, unknown>(
    { request, path: '/prompt-versions', method: 'GET' },
    (data) => ({ items: data.items.map(prompt), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const promptCode = typeof payload.promptCode === 'string' ? payload.promptCode.trim() : '';
  const purpose = typeof payload.purpose === 'string' ? payload.purpose.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (promptCode.length < 2 || purpose.length < 4 || body.length < 8) {
    return Response.json(
      { error: 'Prompt code, purpose and a substantive system prompt are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformPrompt, unknown>(
    {
      request,
      path: '/prompt-versions',
      method: 'POST',
      body: { promptCode, purpose, body, safetyPolicy: {} },
    },
    prompt,
    201,
  );
}
