import { runtimeStore } from '../../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface ControlsBody {
  readonly action?: unknown;
  readonly taskId?: unknown;
}

async function persistedControls(routeId: string) {
  const attempt = await demoPersistence.getAttempt(routeId);
  if (attempt === null) return null;
  return {
    ...runtimeStore.getControls(),
    flaggedTaskIds: attempt.tasks.filter((task) => task.flagged).map((task) => task.id),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  try {
    const persisted = await persistedControls(params.id);
    return Response.json(persisted ?? runtimeStore.getControls());
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  let payload: ControlsBody;
  try {
    payload = (await request.json()) as ControlsBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const action = typeof payload.action === 'string' ? payload.action : '';
  if (action === 'flag') {
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
    if (taskId === '') {
      return Response.json({ error: 'A task id is required to flag.' }, { status: 422 });
    }
    try {
      const before = await persistedControls(params.id);
      const flagged = !(before ?? runtimeStore.getControls()).flaggedTaskIds.includes(taskId);
      await demoPersistence.setTaskFlag(taskId, flagged);
      const after = await persistedControls(params.id);
      if (after !== null) return Response.json(after);
    } catch (error) {
      if (error instanceof DemoPersistenceError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    return Response.json(runtimeStore.toggleFlag(taskId));
  }
  if (action === 'break') {
    try {
      await demoPersistence.startBreak();
    } catch (error) {
      if (error instanceof DemoPersistenceError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    return Response.json(runtimeStore.requestBreak());
  }
  if (action === 'end_break') {
    try {
      await demoPersistence.endBreak();
    } catch (error) {
      if (error instanceof DemoPersistenceError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    return Response.json(runtimeStore.endBreak());
  }
  return Response.json({ error: 'Unsupported action.' }, { status: 422 });
}
