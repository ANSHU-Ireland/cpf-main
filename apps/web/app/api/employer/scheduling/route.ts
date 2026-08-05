import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

// NOTE: EMP-15 scheduling is a known baseline API gap (see coverage/ui_api_gaps.csv). This handler
// serves the synthetic seam so the screen can be built; the real contract is unresolved.

interface WindowBody {
  readonly label?: unknown;
  readonly capacity?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getWindows());
}

export async function POST(request: Request): Promise<Response> {
  let payload: WindowBody;
  try {
    payload = (await request.json()) as WindowBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const label = typeof payload.label === 'string' ? payload.label.trim() : '';
  const capacity = typeof payload.capacity === 'number' ? payload.capacity : Number.NaN;
  if (label.length < 2) {
    return Response.json({ error: 'A window label is required.' }, { status: 422 });
  }
  if (!Number.isInteger(capacity) || capacity < 1) {
    return Response.json({ error: 'Capacity must be a positive whole number.' }, { status: 422 });
  }
  return Response.json(employerStore.addWindow(label, capacity), { status: 201 });
}
