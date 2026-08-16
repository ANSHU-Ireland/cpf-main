import { callPlatform, PlatformApiError } from '../../../../../lib/platform-api.server';
import {
  reviewerObservations,
  type PlatformObservations,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

async function read(request: Request, id: string, requireReveal: boolean): Promise<Response> {
  try {
    const result = await callPlatform<PlatformObservations>({
      request,
      path: `/review-assignments/${encodeURIComponent(id)}/ai-observations`,
      method: 'GET',
    });
    const projected = reviewerObservations(result.data);
    if (requireReveal && projected.revealState === 'concealed') {
      return Response.json(
        { error: 'Complete your independent scoring before revealing AI observations.' },
        { status: 409, headers: { 'x-correlation-id': result.correlationId } },
      );
    }
    return Response.json(projected, {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return read(request, params.id, false);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return read(request, params.id, true);
}
