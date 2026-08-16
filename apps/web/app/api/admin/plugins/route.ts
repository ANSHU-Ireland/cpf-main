import { projectPlatform } from '../../../lib/platform-api.server';
import { plugin, type PlatformPlugin } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  readonly code?: unknown;
  readonly provider?: unknown;
  readonly name?: unknown;
  readonly version?: unknown;
  readonly capabilities?: unknown;
  readonly dataScope?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformPlugin[]; total: number }, unknown>(
    { request, path: '/plugins', method: 'GET' },
    (data) => ({ items: data.items.map(plugin), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: RegisterBody;
  try {
    payload = (await request.json()) as RegisterBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const code = typeof payload.code === 'string' ? payload.code.trim().toLowerCase() : '';
  const provider = typeof payload.provider === 'string' ? payload.provider.trim() : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const version = typeof payload.version === 'string' ? payload.version.trim() : '';
  const dataScope = typeof payload.dataScope === 'string' ? payload.dataScope.trim() : '';
  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/.test(code)) {
    return Response.json({ error: 'A lowercase plugin code is required.' }, { status: 422 });
  }
  if (provider.length < 2 || name.length < 2 || version.length < 1) {
    return Response.json(
      { error: 'Provider, plugin name and version are required.' },
      { status: 422 },
    );
  }
  if (capabilities.length === 0) {
    return Response.json({ error: 'At least one capability is required.' }, { status: 422 });
  }
  if (dataScope.length < 2) {
    return Response.json({ error: 'A data scope is required.' }, { status: 422 });
  }
  return projectPlatform<PlatformPlugin, unknown>(
    {
      request,
      path: '/plugins',
      method: 'POST',
      body: {
        code,
        provider,
        name,
        version,
        permissions: { capabilities, dataScope },
      },
    },
    plugin,
    201,
  );
}
