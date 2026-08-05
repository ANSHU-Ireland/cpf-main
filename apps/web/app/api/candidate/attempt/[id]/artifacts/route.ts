import { runtimeStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ArtifactBody {
  readonly name?: unknown;
  readonly sizeLabel?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  return Response.json(runtimeStore.getArtifacts());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
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
  const sizeLabel = typeof payload.sizeLabel === 'string' ? payload.sizeLabel : '—';
  return Response.json(runtimeStore.uploadArtifact(name, sizeLabel), { status: 201 });
}
