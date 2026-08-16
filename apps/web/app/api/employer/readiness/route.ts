import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../lib/platform-api.server';
import {
  readiness,
  readinessUpdate,
  type PlatformReadiness,
} from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface ReadinessBody {
  readonly itemId?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformReadiness, unknown>(
    { request, path: '/organization/deployer-readiness', method: 'GET' },
    readiness,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReadinessBody;
  try {
    payload = (await request.json()) as ReadinessBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : '';
  try {
    const current = await callPlatform<PlatformReadiness>({
      request,
      path: '/organization/deployer-readiness',
      method: 'GET',
    });
    const body = readinessUpdate(current.data, itemId);
    if (body === null) {
      return Response.json({ error: 'Readiness item not found.' }, { status: 404 });
    }
    const updated = await callPlatform<PlatformReadiness>({
      request,
      path: '/organization/deployer-readiness',
      method: 'PUT',
      body,
      correlationId: current.correlationId,
    });
    const projected = readiness(updated.data).items.find((item) => item.id === itemId);
    if (projected === undefined) {
      return Response.json({ error: 'Readiness item not found.' }, { status: 404 });
    }
    return Response.json(projected, {
      headers: { 'x-correlation-id': updated.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
