import { attemptView, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import { mutateThenProject } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface SaveTaskBody {
  readonly taskId?: unknown;
  readonly response?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
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
  const id = encodeURIComponent(params.id);
  return mutateThenProject<PlatformAttempt, object>({
    mutation: {
      request,
      path: `/attempts/${id}/responses/${encodeURIComponent(taskId)}`,
      method: 'PUT',
      body: { value: response },
    },
    read: { request, path: `/attempts/${id}`, method: 'GET' },
    project: attemptView,
  });
}
