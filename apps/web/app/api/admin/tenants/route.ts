import { projectPlatform } from '../../../lib/platform-api.server';
import { tenant, tenants, type PlatformTenant } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface TenantBody {
  readonly name?: unknown;
  readonly slug?: unknown;
  readonly dataRegion?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformTenant[]; total: number }, unknown>(
    { request, path: '/admin/tenants', method: 'GET' },
    tenants,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: TenantBody;
  try {
    payload = (await request.json()) as TenantBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const slug = typeof payload.slug === 'string' ? payload.slug.trim().toLowerCase() : '';
  const dataRegion = typeof payload.dataRegion === 'string' ? payload.dataRegion.trim() : '';
  if (
    name.length < 2 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ||
    dataRegion === ''
  ) {
    return Response.json(
      { error: 'A tenant name, DNS-safe slug and data region are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformTenant, unknown>(
    {
      request,
      path: '/admin/tenants',
      method: 'POST',
      body: { legalName: name, slug, dataRegion },
    },
    tenant,
    201,
  );
}
