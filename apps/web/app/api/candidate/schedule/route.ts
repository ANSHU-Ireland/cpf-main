import type { PlatformCandidateProfile } from '../../../lib/candidate-api.server';
import {
  candidateSchedule,
  type PlatformBooking,
} from '../../../lib/candidate-self-service.server';
import { callPlatform, PlatformApiError } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface BookingBody {
  readonly applicationId?: unknown;
  readonly startAt?: unknown;
  readonly endAt?: unknown;
  readonly timezone?: unknown;
}

async function loadSchedule(
  request: Request,
  correlationId?: string,
): Promise<{ data: ReturnType<typeof candidateSchedule>; correlationId: string }> {
  const profile = await callPlatform<PlatformCandidateProfile>({
    request,
    path: '/candidate/profile',
    method: 'GET',
    ...(correlationId === undefined ? {} : { correlationId }),
  });
  const pages = await Promise.all(
    profile.data.applications.map((application) =>
      callPlatform<{ readonly items: readonly PlatformBooking[] }>({
        request,
        path: `/applications/${encodeURIComponent(application.applicationId)}/bookings`,
        method: 'GET',
        correlationId: profile.correlationId,
      }),
    ),
  );
  return {
    data: candidateSchedule(
      profile.data,
      pages.flatMap((page) => page.data.items),
    ),
    correlationId: profile.correlationId,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const result = await loadSchedule(request);
    return Response.json(result.data, {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim() : '';
  const startAt = typeof body.startAt === 'string' ? body.startAt : '';
  const endAt = typeof body.endAt === 'string' ? body.endAt : '';
  const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : '';
  if (
    applicationId === '' ||
    Number.isNaN(Date.parse(startAt)) ||
    Number.isNaN(Date.parse(endAt)) ||
    Date.parse(endAt) <= Date.parse(startAt) ||
    timezone === ''
  ) {
    return Response.json(
      { error: 'Choose an application and a valid start/end window with timezone.' },
      { status: 422 },
    );
  }
  try {
    const mutation = await callPlatform<PlatformBooking>({
      request,
      path: `/applications/${encodeURIComponent(applicationId)}/bookings`,
      method: 'POST',
      body: { startAt, endAt, candidateTimezone: timezone },
    });
    const result = await loadSchedule(request, mutation.correlationId);
    return Response.json(result.data, {
      status: 201,
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
