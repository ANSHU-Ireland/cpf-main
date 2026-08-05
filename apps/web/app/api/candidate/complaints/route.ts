import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly subject?: unknown;
  readonly detail?: unknown;
}

export function GET(): Response {
  return Response.json(candidateStore.getComplaints());
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
  if (subject === '' || detail.length < 10) {
    return Response.json(
      { error: 'Add a subject and describe your complaint (10+ characters).' },
      { status: 422 },
    );
  }
  return Response.json(candidateStore.createComplaint(subject), { status: 201 });
}
