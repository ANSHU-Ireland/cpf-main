import { assessmentStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  readonly name?: unknown;
  readonly provider?: unknown;
  readonly useCase?: unknown;
  readonly limitations?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(assessmentStore.getModels());
}

export async function POST(request: Request): Promise<Response> {
  let payload: RegisterBody;
  try {
    payload = (await request.json()) as RegisterBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const provider = typeof payload.provider === 'string' ? payload.provider.trim() : '';
  const useCase = typeof payload.useCase === 'string' ? payload.useCase.trim() : '';
  const limitations = typeof payload.limitations === 'string' ? payload.limitations.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A model name is required.' }, { status: 422 });
  }
  if (provider.length < 2) {
    return Response.json({ error: 'A provider is required.' }, { status: 422 });
  }
  if (useCase.length < 4) {
    return Response.json({ error: 'A use case is required.' }, { status: 422 });
  }
  if (limitations.length < 4) {
    return Response.json({ error: 'Documented limitations are required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.registerModel(name, provider, useCase, limitations), {
    status: 201,
  });
}
