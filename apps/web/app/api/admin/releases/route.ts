import { projectPlatform } from '../../../lib/platform-api.server';
import {
  releases,
  type PlatformMaintenance,
  type PlatformRelease,
} from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface MaintenanceBody {
  readonly description?: unknown;
  readonly startsAt?: unknown;
  readonly endsAt?: unknown;
}

export async function GET(request: Request): Promise<Response> {
  const releaseResult = await projectPlatform<
    { items: readonly PlatformRelease[]; total: number },
    unknown
  >({ request, path: '/admin/releases', method: 'GET' }, (releaseData) => releaseData);
  if (!releaseResult.ok) return releaseResult;
  const releaseData = (await releaseResult.json()) as {
    items: readonly PlatformRelease[];
    total: number;
  };
  return projectPlatform<{ items: readonly PlatformMaintenance[]; total: number }, unknown>(
    { request, path: '/admin/maintenance-windows', method: 'GET' },
    (maintenanceData) => releases(releaseData.items, maintenanceData.items),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: MaintenanceBody;
  try {
    payload = (await request.json()) as MaintenanceBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const startsAt = typeof payload.startsAt === 'string' ? payload.startsAt : '';
  const endsAt = typeof payload.endsAt === 'string' ? payload.endsAt : '';
  if (
    description.length < 2 ||
    !Number.isFinite(Date.parse(startsAt)) ||
    !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(endsAt) <= Date.parse(startsAt)
  ) {
    return Response.json(
      { error: 'A description and a valid maintenance window are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformMaintenance, unknown>(
    {
      request,
      path: '/admin/maintenance-windows',
      method: 'POST',
      body: { startsAt, endsAt, description },
    },
    (item) => releases([], [item]).items[0],
    201,
  );
}
