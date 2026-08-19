import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../lib/platform-api.server';
import { featureFlag, featureFlags, type PlatformFlag } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly key?: unknown;
  readonly description?: unknown;
}

interface ToggleBody {
  readonly id?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformFlag[]; total: number }, unknown>(
    { request, path: '/admin/feature-flags', method: 'GET' },
    featureFlags,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(key) || description.length < 4) {
    return Response.json({ error: 'A valid key and description are required.' }, { status: 422 });
  }
  return projectPlatform<PlatformFlag, unknown>(
    {
      request,
      path: '/admin/feature-flags',
      method: 'POST',
      body: { key, description, enabled: false },
    },
    featureFlag,
    201,
  );
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: ToggleBody;
  try {
    payload = (await request.json()) as ToggleBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (id === '') return Response.json({ error: 'A flag id is required.' }, { status: 422 });
  try {
    const list = await callPlatform<{ items: readonly PlatformFlag[] }>({
      request,
      path: '/admin/feature-flags',
      method: 'GET',
    });
    const current = list.data.items.find((item) => item.id === id);
    if (current === undefined) {
      return Response.json({ error: 'Feature flag not found.' }, { status: 404 });
    }
    const result = await callPlatform<PlatformFlag>({
      request,
      path: `/admin/feature-flags/${encodeURIComponent(id)}`,
      method: 'PUT',
      body: { enabled: !current.enabled },
      correlationId: list.correlationId,
    });
    return Response.json(featureFlag(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
