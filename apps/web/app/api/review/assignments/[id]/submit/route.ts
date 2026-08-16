import { callPlatform, PlatformApiError } from '../../../../../lib/platform-api.server';
import {
  reviewerSubmission,
  type PlatformReviewAssignment,
  type PlatformScorecard,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

async function response(
  request: Request,
  id: string,
  submittedScorecard?: PlatformScorecard,
  correlationId?: string,
): Promise<Response> {
  const assignment = await callPlatform<PlatformReviewAssignment>({
    request,
    path: `/review-assignments/${encodeURIComponent(id)}`,
    method: 'GET',
    ...(correlationId === undefined ? {} : { correlationId }),
  });
  const scorecard =
    submittedScorecard === undefined
      ? await callPlatform<PlatformScorecard>({
          request,
          path: `/review-assignments/${encodeURIComponent(id)}/scorecard`,
          method: 'GET',
          correlationId: assignment.correlationId,
        })
      : { data: submittedScorecard, correlationId: assignment.correlationId };
  return Response.json(reviewerSubmission(assignment.data, scorecard.data), {
    headers: { 'x-correlation-id': scorecard.correlationId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    return await response(request, params.id);
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const result = await callPlatform<PlatformScorecard>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}/submit`,
      method: 'POST',
      body: {},
    });
    return await response(request, params.id, result.data, result.correlationId);
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
