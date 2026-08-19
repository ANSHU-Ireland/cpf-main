import { callPlatform, PlatformApiError } from '../../../../../lib/platform-api.server';
import {
  reviewerSubmission,
  type PlatformReviewAssignment,
  type PlatformScorecard,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface AmendBody {
  readonly reason?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: AmendBody;
  try {
    payload = (await request.json()) as AmendBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  if (reason.length < 3) {
    return Response.json(
      { error: 'A reason for the amendment is required and is recorded in the audit trail.' },
      { status: 422 },
    );
  }
  try {
    const scorecard = await callPlatform<PlatformScorecard>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}/scorecard`,
      method: 'GET',
    });
    const amendment = await callPlatform({
      request,
      path: `/scorecards/${encodeURIComponent(scorecard.data.id)}/amendments`,
      method: 'POST',
      body: { rationale: reason, changes: 'Reviewer-requested scorecard amendment.' },
      correlationId: scorecard.correlationId,
    });
    const assignment = await callPlatform<PlatformReviewAssignment>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}`,
      method: 'GET',
      correlationId: amendment.correlationId,
    });
    return Response.json(reviewerSubmission(assignment.data, scorecard.data), {
      headers: { 'x-correlation-id': assignment.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
