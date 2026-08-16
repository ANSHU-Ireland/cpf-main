import {
  callPlatform,
  PlatformApiError,
  projectPlatform,
} from '../../../../../lib/platform-api.server';
import {
  reviewerEvidence,
  type PlatformReviewAssignment,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface EvidenceBody {
  readonly evidenceId?: unknown;
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
    reviewerEvidence,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: EvidenceBody;
  try {
    payload = (await request.json()) as EvidenceBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const evidenceId = typeof payload.evidenceId === 'string' ? payload.evidenceId : '';
  if (evidenceId === '') {
    return Response.json({ error: 'An evidence id is required.' }, { status: 422 });
  }
  const id = encodeURIComponent(params.id);
  try {
    const mutation = await callPlatform({
      request,
      path: `/review-assignments/${id}/annotations`,
      method: 'POST',
      body: { itemId: evidenceId, body: 'Reviewer marked this evidence as reviewed.' },
    });
    const result = await callPlatform<PlatformReviewAssignment>({
      request,
      path: `/review-assignments/${id}`,
      method: 'GET',
      correlationId: mutation.correlationId,
    });
    const item = reviewerEvidence(result.data).items.find((entry) => entry.id === evidenceId);
    if (item === undefined) {
      return Response.json({ error: 'Evidence not found.' }, { status: 404 });
    }
    return Response.json(item, { headers: { 'x-correlation-id': result.correlationId } });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
