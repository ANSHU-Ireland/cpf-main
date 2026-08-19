import { projectPlatform } from '../../../lib/platform-api.server';
import {
  integration,
  integrations,
  type PlatformIntegration,
} from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface IntegrationBody {
  readonly name?: unknown;
  readonly kind?: unknown;
  readonly endpoint?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformIntegration[]; total: number }, unknown>(
    { request, path: '/organization/integrations', method: 'GET' },
    integrations,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: IntegrationBody;
  try {
    payload = (await request.json()) as IntegrationBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const kind = typeof payload.kind === 'string' ? payload.kind.trim() : '';
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : '';
  if (name.length < 2 || kind === '' || !endpoint.startsWith('https://')) {
    return Response.json(
      { error: 'A name, integration kind and secure HTTPS endpoint are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformIntegration, unknown>(
    {
      request,
      path: '/organization/integrations',
      method: 'POST',
      body: { connectionType: kind, provider: name, config: { endpoint } },
    },
    integration,
    201,
  );
}
