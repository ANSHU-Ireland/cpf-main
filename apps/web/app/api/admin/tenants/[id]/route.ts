import type { TenantStatus } from '../../../../lib/types';
import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../../lib/platform-api.server';
import { tenantDetail, type PlatformTenant } from '../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

const STATUS_MAP: Readonly<Record<TenantStatus, string>> = {
  active: 'active',
  trial: 'pending_approval',
  suspended: 'suspended',
  archived: 'terminated',
};

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformTenant, unknown>(
    { request, path: `/admin/tenants/${encodeURIComponent(params.id)}`, method: 'GET' },
    tenantDetail,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const requested = payload.status;
  if (
    requested !== 'active' &&
    requested !== 'trial' &&
    requested !== 'suspended' &&
    requested !== 'archived'
  ) {
    return Response.json({ error: 'A valid tenant status is required.' }, { status: 422 });
  }
  const status = STATUS_MAP[requested];
  const reason = `Platform administrator requested the ${requested} tenant lifecycle state.`;
  try {
    const preview = await callPlatform<{ allowed: boolean; effects: readonly string[] }>({
      request,
      path: `/admin/tenants/${encodeURIComponent(params.id)}/status-preview`,
      method: 'POST',
      body: { status, reason },
    });
    if (!preview.data.allowed) {
      return Response.json(
        { error: `Tenant transition is blocked: ${preview.data.effects.join('; ')}` },
        { status: 409 },
      );
    }
    const result = await callPlatform<PlatformTenant>({
      request,
      path: `/admin/tenants/${encodeURIComponent(params.id)}/status`,
      method: 'PUT',
      body: { status, reason },
      correlationId: preview.correlationId,
    });
    return Response.json(tenantDetail(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
