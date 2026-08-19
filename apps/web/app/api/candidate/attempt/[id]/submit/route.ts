import { attemptView, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import { mutateThenProject } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const id = encodeURIComponent(params.id);
  return mutateThenProject<PlatformAttempt, object>({
    mutation: { request, path: `/attempts/${id}/submit`, method: 'POST', body: {} },
    read: { request, path: `/attempts/${id}`, method: 'GET' },
    project: attemptView,
  });
}
