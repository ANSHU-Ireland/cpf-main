import { runtimeStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface AiBody {
  readonly body?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  return Response.json(runtimeStore.getAiMessages());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
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
  return Response.json(runtimeStore.sendAiMessage(message));
}
