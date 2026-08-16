import {
  callPlatform,
  PlatformApiError,
  projectPlatform,
} from '../../../../../lib/platform-api.server';
import {
  reviewerIntegrity,
  type PlatformReviewAssignment,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface IntegrityBody {
  readonly flagId?: unknown;
  readonly status?: unknown;
  readonly resolution?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformReviewAssignment, unknown>(
    {
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    },
    reviewerIntegrity,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: IntegrityBody;
  try {
    payload = (await request.json()) as IntegrityBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const flagId = typeof payload.flagId === 'string' ? payload.flagId : '';
  const resolution = typeof payload.resolution === 'string' ? payload.resolution.trim() : '';
  if (flagId === '') {
    return Response.json({ error: 'A flag id is required.' }, { status: 422 });
  }
  if (payload.status !== 'dismissed' && payload.status !== 'upheld') {
    return Response.json({ error: 'A valid resolution status is required.' }, { status: 422 });
  }
  if (resolution.length < 3) {
    return Response.json(
      { error: 'A written resolution is required for every integrity decision.' },
      { status: 422 },
    );
  }
  try {
    const mutation = await callPlatform({
      request,
      path: `/integrity-events/${encodeURIComponent(flagId)}/resolution`,
      method: 'PUT',
      body: {
        resolution: payload.status === 'upheld' ? 'material_integrity_concern' : 'immaterial',
        note: resolution,
      },
    });
    const result = await callPlatform<PlatformReviewAssignment>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}`,
      method: 'GET',
      correlationId: mutation.correlationId,
    });
    const item = reviewerIntegrity(result.data).items.find((entry) => entry.id === flagId);
    if (item === undefined) {
      return Response.json({ error: 'Flag not found.' }, { status: 404 });
    }
    return Response.json(item, { headers: { 'x-correlation-id': result.correlationId } });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
