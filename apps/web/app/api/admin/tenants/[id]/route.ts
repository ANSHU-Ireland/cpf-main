import type { TenantStatus } from '../../../../lib/types';
import { adminStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

const STATUSES: readonly TenantStatus[] = ['active', 'trial', 'suspended', 'archived'];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const tenant = adminStore.getTenant(params.id);
  if (tenant === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  return Response.json(tenant);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (adminStore.getTenant(params.id) === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const status = payload.status;
  if (typeof status !== 'string' || !STATUSES.includes(status as TenantStatus)) {
    return Response.json({ error: 'A valid status is required.' }, { status: 422 });
  }
  return Response.json(adminStore.setTenantStatus(params.id, status as TenantStatus));
}
