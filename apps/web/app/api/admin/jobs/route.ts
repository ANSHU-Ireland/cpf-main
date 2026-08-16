import { projectPlatform } from '../../../lib/platform-api.server';
import { job, type PlatformJob } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface JobBody {
  readonly id?: unknown;
  readonly action?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformJob[]; total: number }, unknown>(
    { request, path: '/admin/jobs', method: 'GET' },
    (data) => ({ items: data.items.map(job), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: JobBody;
  try {
    payload = (await request.json()) as JobBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (id === '' || (payload.action !== 'retry' && payload.action !== 'cancel')) {
    return Response.json(
      { error: 'A job id and retry or cancel action are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformJob, unknown>(
    {
      request,
      path: `/admin/jobs/${encodeURIComponent(id)}/${payload.action}`,
      method: 'POST',
    },
    job,
  );
}
