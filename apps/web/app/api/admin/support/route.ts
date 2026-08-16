import { projectPlatform } from '../../../lib/platform-api.server';
import { adminSupportCase, type PlatformAdminSupportCase } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface AssignBody {
  readonly id?: unknown;
  readonly assignee?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAdminSupportCase[]; total: number }, unknown>(
    { request, path: '/admin/support-cases', method: 'GET' },
    (data) => ({ items: data.items.map(adminSupportCase), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: AssignBody;
  try {
    payload = (await request.json()) as AssignBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const assignee = typeof payload.assignee === 'string' ? payload.assignee.trim() : '';
  if (id.length === 0) {
    return Response.json({ error: 'A case id is required.' }, { status: 422 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignee)) {
    return Response.json({ error: 'A valid assignee user ID is required.' }, { status: 422 });
  }
  return projectPlatform<PlatformAdminSupportCase, unknown>(
    {
      request,
      path: `/admin/support-cases/${encodeURIComponent(id)}/assignment`,
      method: 'PUT',
      body: { assigneeId: assignee },
    },
    adminSupportCase,
  );
}
