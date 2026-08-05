import { reviewStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface AvailabilityBody {
  readonly state?: unknown;
  readonly weeklyCapacity?: unknown;
  readonly note?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(reviewStore.getAvailability());
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: AvailabilityBody;
  try {
    payload = (await request.json()) as AvailabilityBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const patch: {
    state?: 'available' | 'limited' | 'unavailable';
    weeklyCapacity?: number;
    note?: string;
  } = {};
  if (payload.state !== undefined) {
    if (
      payload.state !== 'available' &&
      payload.state !== 'limited' &&
      payload.state !== 'unavailable'
    ) {
      return Response.json({ error: 'A valid availability state is required.' }, { status: 422 });
    }
    patch.state = payload.state;
  }
  if (payload.weeklyCapacity !== undefined) {
    if (
      typeof payload.weeklyCapacity !== 'number' ||
      Number.isNaN(payload.weeklyCapacity) ||
      payload.weeklyCapacity < 0
    ) {
      return Response.json({ error: 'Weekly capacity must be zero or more.' }, { status: 422 });
    }
    patch.weeklyCapacity = payload.weeklyCapacity;
  }
  if (typeof payload.note === 'string') {
    patch.note = payload.note;
  }
  return Response.json(reviewStore.updateAvailability(patch));
}
