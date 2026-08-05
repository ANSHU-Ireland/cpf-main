import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ReleaseBody {
  readonly title?: unknown;
  readonly kind?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getReleases());
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReleaseBody;
  try {
    payload = (await request.json()) as ReleaseBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const kind = payload.kind;
  if (title.length < 2) {
    return Response.json({ error: 'A title is required.' }, { status: 422 });
  }
  if (kind !== 'maintenance' && kind !== 'release') {
    return Response.json({ error: 'Kind must be maintenance or release.' }, { status: 422 });
  }
  return Response.json(adminStore.scheduleRelease(title, kind), { status: 201 });
}
