import { projectPlatform } from '../../../lib/platform-api.server';
import {
  accommodation,
  accommodations,
  type PlatformAccommodation,
} from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface DecideBody {
  readonly id?: unknown;
  readonly status?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAccommodation[]; total: number }, unknown>(
    { request, path: '/accommodations?limit=100', method: 'GET' },
    accommodations,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: DecideBody;
  try {
    payload = (await request.json()) as DecideBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  const status = payload.status;
  if (id === '' || (status !== 'approved' && status !== 'declined' && status !== 'more_info')) {
    return Response.json({ error: 'A request and valid decision are required.' }, { status: 422 });
  }
  return projectPlatform<PlatformAccommodation, unknown>(
    {
      request,
      path: `/accommodations/${encodeURIComponent(id)}/decision`,
      method: 'PUT',
      body: { status: status === 'more_info' ? 'under_review' : status },
    },
    accommodation,
  );
}
