import { runtimeStore } from '../../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface SaveTaskBody {
  readonly taskId?: unknown;
  readonly response?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  let body: SaveTaskBody;
  try {
    body = (await request.json()) as SaveTaskBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const taskId = typeof body.taskId === 'string' ? body.taskId : '';
  if (taskId === '') {
    return Response.json({ error: 'A task id is required.' }, { status: 422 });
  }
  const response = typeof body.response === 'string' ? body.response : '';
  try {
    await demoPersistence.saveTask(taskId, response);
    const persisted = await demoPersistence.getAttempt(params.id);
    if (persisted !== null) return Response.json(persisted);
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  return Response.json(runtimeStore.saveTask(taskId, response));
}
