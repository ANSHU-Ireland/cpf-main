import { projectPlatform } from '../../../lib/platform-api.server';
import {
  reviewerAvailability,
  type PlatformAvailabilityWindow,
} from '../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface AvailabilityBody {
  readonly state?: unknown;
  readonly weeklyCapacity?: unknown;
  readonly note?: unknown;
}

export async function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: PlatformAvailabilityWindow[] }, unknown>(
    { request, path: '/reviewer/availability?limit=100', method: 'GET' },
    reviewerAvailability,
  );
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: AvailabilityBody;
  try {
    payload = (await request.json()) as AvailabilityBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (
    payload.state !== 'available' &&
    payload.state !== 'limited' &&
    payload.state !== 'unavailable'
  ) {
    return Response.json({ error: 'A valid availability state is required.' }, { status: 422 });
  }
  if (
    typeof payload.weeklyCapacity !== 'number' ||
    !Number.isInteger(payload.weeklyCapacity) ||
    payload.weeklyCapacity < 0 ||
    payload.weeklyCapacity > 100
  ) {
    return Response.json(
      { error: 'Weekly capacity must be an integer from 0 to 100.' },
      { status: 422 },
    );
  }
  const availableFrom = new Date();
  const availableTo = new Date(availableFrom.getTime() + 7 * 24 * 60 * 60 * 1000);
  return projectPlatform<{ windows: PlatformAvailabilityWindow[] }, unknown>(
    {
      request,
      path: '/reviewer/availability',
      method: 'PUT',
      body: {
        windows: [
          {
            availableFrom: availableFrom.toISOString(),
            availableTo: availableTo.toISOString(),
            capacity: payload.state === 'unavailable' ? 0 : payload.weeklyCapacity,
            status:
              payload.state === 'limited'
                ? 'tentative'
                : payload.state === 'unavailable'
                  ? 'unavailable'
                  : 'available',
            note: typeof payload.note === 'string' ? payload.note : null,
          },
        ],
      },
    },
    reviewerAvailability,
  );
}
