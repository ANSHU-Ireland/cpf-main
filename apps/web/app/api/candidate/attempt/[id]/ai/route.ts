import { attemptAiMessages, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import { mutateThenProject, projectPlatform } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface AiBody {
  readonly body?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformAttempt, object>(
    { request, path: `/attempts/${encodeURIComponent(params.id)}`, method: 'GET' },
    attemptAiMessages,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: AiBody;
  try {
    payload = (await request.json()) as AiBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const message = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (message.length < 2) {
    return Response.json({ error: 'Enter a message to send.' }, { status: 422 });
  }
  const id = encodeURIComponent(params.id);
  return mutateThenProject<PlatformAttempt, object>({
    mutation: {
      request,
      path: `/attempts/${id}/ai/messages`,
      method: 'POST',
      body: { content: message },
    },
    read: { request, path: `/attempts/${id}`, method: 'GET' },
    project: attemptAiMessages,
  });
}
