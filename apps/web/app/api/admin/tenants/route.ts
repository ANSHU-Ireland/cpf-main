import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface TenantBody {
  readonly name?: unknown;
  readonly slug?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getTenants());
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
  if (name.length < 2) {
    return Response.json({ error: 'A tenant name is required.' }, { status: 422 });
  }
  if (!/^[a-z0-9-]{2,}$/.test(slug)) {
    return Response.json(
      { error: 'A slug is required (lowercase letters, numbers and hyphens).' },
      { status: 422 },
    );
  }
  return Response.json(adminStore.createTenant(name, slug), { status: 201 });
}
