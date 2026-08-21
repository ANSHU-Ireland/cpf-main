import { projectPlatform } from '../../../../../lib/platform-api.server';
import {
  adminSupportCase,
  type PlatformAdminSupportCase,
} from '../../../../../lib/admin-api.server';
import {
  functionalDemoEnabled,
  updateDemoSupportStatus,
} from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

const STATUS: Readonly<Record<string, string>> = {
  new: 'open',
  assigned: 'open',
  in_progress: 'awaiting_internal',
  escalated: 'escalated',
  resolved: 'resolved',
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const requested =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>).status : undefined;
  const status = typeof requested === 'string' ? STATUS[requested] : undefined;
  if (status === undefined) {
    return Response.json({ error: 'A valid support status is required.' }, { status: 422 });
  }
  if (functionalDemoEnabled()) {
    updateDemoSupportStatus(
      params.id,
      requested as 'new' | 'assigned' | 'in_progress' | 'escalated' | 'resolved',
    );
    return new Response(null, { status: 204 });
  }
  return projectPlatform<PlatformAdminSupportCase, unknown>(
    {
      request,
      path: `/admin/support-cases/${encodeURIComponent(params.id)}/status`,
      method: 'PUT',
      body: { status },
    },
    adminSupportCase,
  );
}
