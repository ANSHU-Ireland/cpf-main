import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly category?: unknown;
  readonly summary?: unknown;
}

export function GET(): Response {
  return Response.json(candidateStore.getAccommodations());
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (category === '' || summary.length < 5) {
    return Response.json(
      { error: 'Select a category and describe the adjustment you need.' },
      { status: 422 },
    );
  }
  return Response.json(candidateStore.createAccommodation(category, summary), { status: 201 });
}
