import {
  callPlatform,
  PlatformApiError,
  projectPlatform,
} from '../../../../../lib/platform-api.server';
import { reviewerScorecard, type PlatformScorecard } from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface ScorecardBody {
  readonly criterionId?: unknown;
  readonly score?: unknown;
  readonly rationale?: unknown;
  readonly evidenceLink?: unknown;
  readonly insufficientEvidence?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformScorecard, unknown>(
    {
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}/scorecard`,
      method: 'GET',
    },
    reviewerScorecard,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: ScorecardBody;
  try {
    payload = (await request.json()) as ScorecardBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const criterionId = typeof payload.criterionId === 'string' ? payload.criterionId : '';
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  const evidenceLink = typeof payload.evidenceLink === 'string' ? payload.evidenceLink.trim() : '';
  const insufficientEvidence = payload.insufficientEvidence === true;
  if (criterionId === '') {
    return Response.json({ error: 'A criterion id is required.' }, { status: 422 });
  }
  if (typeof payload.score !== 'number' || Number.isNaN(payload.score) || payload.score < 0) {
    return Response.json({ error: 'A valid score is required.' }, { status: 422 });
  }
  if (rationale.length < 3) {
    return Response.json(
      { error: 'A rationale is required for every score you record.' },
      { status: 422 },
    );
  }
  if (!insufficientEvidence && evidenceLink.length < 3) {
    return Response.json(
      { error: 'Link the source evidence or choose insufficient evidence.' },
      { status: 422 },
    );
  }
  try {
    const result = await callPlatform<PlatformScorecard>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}/scorecard`,
      method: 'PUT',
      body: {
        criterion: {
          criterionId,
          humanScore: payload.score,
          insufficientEvidence,
          evidenceLinks: evidenceLink === '' ? [] : [{ source: evidenceLink }],
          reviewerComment: rationale,
        },
      },
    });
    const criterion = reviewerScorecard(result.data).items.find((item) => item.id === criterionId);
    if (criterion === undefined) {
      return Response.json({ error: 'Criterion not found.' }, { status: 404 });
    }
    return Response.json(criterion, {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
