import { attemptArtifacts, type PlatformAttempt } from '../../../../../lib/attempt-api.server';
import { projectPlatform } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface ArtifactBody {
  readonly name?: unknown;
  readonly sizeLabel?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformAttempt, object>(
    { request, path: `/attempts/${encodeURIComponent(params.id)}`, method: 'GET' },
    attemptArtifacts,
  );
}

export async function POST(
  request: Request,
  _context: { params: { id: string } },
): Promise<Response> {
  let payload: ArtifactBody;
  try {
    payload = (await request.json()) as ArtifactBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name === '') {
    return Response.json({ error: 'A file name is required.' }, { status: 422 });
  }
  return Response.json(
    {
      type: 'about:blank',
      title: 'Object storage is not configured',
      status: 503,
      detail:
        'A signed upload target and malware scanner are required before files can be accepted.',
    },
    { status: 503 },
  );
}
