import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface SelectBody {
  readonly slotId?: unknown;
}

export function GET(): Response {
  return Response.json(candidateStore.getSchedule());
}

export async function POST(request: Request): Promise<Response> {
  let body: SelectBody;
  try {
    body = (await request.json()) as SelectBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const slotId = typeof body.slotId === 'string' ? body.slotId : '';
  if (slotId === '') {
    return Response.json({ error: 'Choose a time slot.' }, { status: 422 });
  }
  return Response.json(candidateStore.selectSlot(slotId));
}
