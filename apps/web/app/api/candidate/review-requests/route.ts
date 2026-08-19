import type { PlatformCandidateProfile } from '../../../lib/candidate-api.server';
import { candidateReviewableDecisions } from '../../../lib/candidate-self-service.server';
import { forwardPlatform, projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface ReviewRequestBody {
  readonly decisionId?: unknown;
  readonly grounds?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformCandidateProfile, object>(
    { request, path: '/candidate/profile', method: 'GET' },
    candidateReviewableDecisions,
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: ReviewRequestBody;
  try {
    body = (await request.json()) as ReviewRequestBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const applicationId = typeof body.decisionId === 'string' ? body.decisionId.trim() : '';
  const grounds = typeof body.grounds === 'string' ? body.grounds.trim() : '';
  if (applicationId === '') {
    return Response.json({ error: 'decisionId is required' }, { status: 422 });
  }
  if (grounds.length < 20) {
    return Response.json({ error: 'grounds must be at least 20 characters' }, { status: 422 });
  }
  return forwardPlatform({
    request,
    path: `/candidate/applications/${encodeURIComponent(applicationId)}/human-review`,
    method: 'POST',
    body: { reason: grounds },
  });
}
