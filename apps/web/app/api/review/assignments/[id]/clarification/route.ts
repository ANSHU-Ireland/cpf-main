import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ClarificationBody {
  readonly topic?: unknown;
  readonly body?: unknown;
  readonly escalate?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getClarifications());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  let payload: ClarificationBody;
  try {
    payload = (await request.json()) as ClarificationBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (topic.length < 3 || body.length < 3) {
    return Response.json({ error: 'A topic and a message are both required.' }, { status: 422 });
  }
  const escalate = payload.escalate === true;
  return Response.json(reviewStore.sendClarification(topic, body, escalate), { status: 201 });
}
