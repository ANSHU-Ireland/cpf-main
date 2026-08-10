import { runtimeStore } from '../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface AttemptActionBody {
  readonly action?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  return Response.json(runtimeStore.getAttempt());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  let body: AttemptActionBody;
  try {
    body = (await request.json()) as AttemptActionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (body.action === 'reset') return Response.json(runtimeStore.resetAttempt());
  try {
    await demoPersistence.startAttempt();
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  return Response.json(runtimeStore.startAttempt());
}
