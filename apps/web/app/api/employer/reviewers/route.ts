import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ReviewerBody {
  readonly name?: unknown;
  readonly discipline?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getReviewers());
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReviewerBody;
  try {
    payload = (await request.json()) as ReviewerBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const discipline = typeof payload.discipline === 'string' ? payload.discipline.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A reviewer name is required.' }, { status: 422 });
  }
  if (discipline.length < 2) {
    return Response.json({ error: 'A discipline is required.' }, { status: 422 });
  }
  return Response.json(employerStore.inviteReviewer(name, discipline), { status: 201 });
}
