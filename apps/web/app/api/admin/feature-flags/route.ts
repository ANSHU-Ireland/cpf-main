import { adminStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly key?: unknown;
  readonly description?: unknown;
}

interface ToggleBody {
  readonly id?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(adminStore.getFlags());
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  if (!/^[a-z0-9_]{2,}$/.test(key)) {
    return Response.json(
      { error: 'A flag key is required (lowercase letters, numbers and underscores).' },
      { status: 422 },
    );
  }
  if (description.length < 4) {
    return Response.json({ error: 'A description is required.' }, { status: 422 });
  }
  return Response.json(adminStore.createFlag(key, description), { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: ToggleBody;
  try {
    payload = (await request.json()) as ToggleBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (id.length === 0) {
    return Response.json({ error: 'A flag id is required.' }, { status: 422 });
  }
  const updated = adminStore.toggleFlag(id);
  if (updated === null) {
    return Response.json({ error: 'Feature flag not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
