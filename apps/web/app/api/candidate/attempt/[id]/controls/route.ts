import { attemptControls, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import {
  callPlatform,
  mutateThenProject,
  PlatformApiError,
  projectPlatform,
} from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface ControlsBody {
  readonly action?: unknown;
  readonly taskId?: unknown;
}

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformAttempt, object>(
    { request, path: `/attempts/${encodeURIComponent(params.id)}`, method: 'GET' },
    attemptControls,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: ControlsBody;
  try {
    payload = (await request.json()) as ControlsBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const action = typeof payload.action === 'string' ? payload.action : '';
  const id = encodeURIComponent(params.id);
  if (action === 'flag') {
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
    if (taskId === '') {
      return Response.json({ error: 'A task id is required to flag.' }, { status: 422 });
    }
    try {
      const before = await callPlatform<PlatformAttempt>({
        request,
        path: `/attempts/${id}`,
        method: 'GET',
      });
      const flagged = !before.data.tasks.find((task) => task.id === taskId)?.flagged;
      await callPlatform({
        request,
        path: `/attempts/${id}/item-flags/${encodeURIComponent(taskId)}`,
        method: 'PUT',
        body: { flagged },
        correlationId: before.correlationId,
      });
      const after = await callPlatform<PlatformAttempt>({
        request,
        path: `/attempts/${id}`,
        method: 'GET',
        correlationId: before.correlationId,
      });
      return Response.json(attemptControls(after.data), {
        headers: { 'x-correlation-id': after.correlationId },
      });
    } catch (error) {
      if (error instanceof PlatformApiError) return error.toResponse();
      throw error;
    }
  }
  if (action === 'break') {
    return mutateThenProject<PlatformAttempt, object>({
      mutation: {
        request,
        path: `/attempts/${id}/breaks`,
        method: 'POST',
        body: { reason: 'Candidate requested a scheduled break.' },
      },
      read: { request, path: `/attempts/${id}`, method: 'GET' },
      project: attemptControls,
    });
  }
  if (action === 'end_break') {
    return mutateThenProject<PlatformAttempt, object>({
      mutation: { request, path: `/attempts/${id}/start`, method: 'POST', body: {} },
      read: { request, path: `/attempts/${id}`, method: 'GET' },
      project: attemptControls,
    });
  }
  return Response.json({ error: 'Unsupported action.' }, { status: 422 });
}
