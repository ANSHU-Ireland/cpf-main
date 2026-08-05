import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface RespondBody {
  readonly kind?: unknown;
  readonly note?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: RespondBody;
  try {
    payload = (await request.json()) as RespondBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const kind = payload.kind;
  if (kind !== 'accept' && kind !== 'decline' && kind !== 'conflict') {
    return Response.json({ error: 'A valid response is required.' }, { status: 422 });
  }
  const note = typeof payload.note === 'string' ? payload.note.trim() : '';
  if ((kind === 'decline' || kind === 'conflict') && note.length < 3) {
    return Response.json(
      { error: 'A reason is required when declining or reporting a conflict.' },
      { status: 422 },
    );
  }
  const updated = reviewStore.respond(params.id, kind);
  if (updated === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
