import { attemptView, type PlatformAttempt } from '../../../../lib/attempt-api.server';
import {
  forwardPlatform,
  mutateThenProject,
  projectPlatform,
} from '../../../../lib/platform-api.server';
import { functionalDemoEnabled } from '../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

interface AttemptActionBody {
  readonly action?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformAttempt, object>(
    { request, path: `/attempts/${encodeURIComponent(params.id)}`, method: 'GET' },
    attemptView,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let body: AttemptActionBody;
  try {
    body = (await request.json()) as AttemptActionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = encodeURIComponent(params.id);
  if (body.action === 'reset') {
    return forwardPlatform({ request, path: `/attempts/${id}/ai/reset`, method: 'POST', body: {} });
  }
  const response = await mutateThenProject<PlatformAttempt, object>({
    mutation: { request, path: `/attempts/${id}/start`, method: 'POST', body: {} },
    read: { request, path: `/attempts/${id}`, method: 'GET' },
    project: attemptView,
  });
  if (functionalDemoEnabled() && response.status === 404) {
    return GET(request, { params });
  }
  return response;
}
