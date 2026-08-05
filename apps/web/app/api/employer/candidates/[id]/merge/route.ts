import { employerStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface MergeBody {
  readonly duplicateId?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (employerStore.getCandidate(params.id) === null) {
    return Response.json({ error: 'Candidate not found.' }, { status: 404 });
  }
  let payload: MergeBody;
  try {
    payload = (await request.json()) as MergeBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const duplicateId = typeof payload.duplicateId === 'string' ? payload.duplicateId.trim() : '';
  if (duplicateId.length === 0) {
    return Response.json({ error: 'A duplicate candidate is required.' }, { status: 422 });
  }
  if (duplicateId === params.id) {
    return Response.json({ error: 'A record cannot be merged with itself.' }, { status: 422 });
  }
  const record = employerStore.mergeCandidate(params.id, duplicateId);
  if (record === null) {
    return Response.json({ error: 'Candidate not found.' }, { status: 404 });
  }
  return Response.json(record);
}
