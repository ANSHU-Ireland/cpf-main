import { assessmentStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly name?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(assessmentStore.getPrompts());
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A prompt name is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.createPromptVersion(name), { status: 201 });
}
