import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface IntegrityBody {
  readonly flagId?: unknown;
  readonly status?: unknown;
  readonly resolution?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getIntegrity());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: IntegrityBody;
  try {
    payload = (await request.json()) as IntegrityBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const flagId = typeof payload.flagId === 'string' ? payload.flagId : '';
  if (flagId === '') {
    return Response.json({ error: 'A flag id is required.' }, { status: 422 });
  }
  if (payload.status !== 'dismissed' && payload.status !== 'upheld') {
    return Response.json({ error: 'A valid resolution status is required.' }, { status: 422 });
  }
  const resolution = typeof payload.resolution === 'string' ? payload.resolution.trim() : '';
  if (resolution.length < 3) {
    return Response.json(
      { error: 'A written resolution is required for every integrity decision.' },
      { status: 422 },
    );
  }
  const updated = reviewStore.resolveIntegrity(flagId, payload.status, resolution);
  if (updated === null) {
    return Response.json({ error: 'Flag not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
