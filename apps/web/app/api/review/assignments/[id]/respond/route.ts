import { mutateThenProject } from '../../../../../lib/platform-api.server';
import {
  reviewerAssignment,
  type PlatformReviewAssignment,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface RespondBody {
  readonly kind?: unknown;
  readonly note?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: RespondBody;
  try {
    payload = (await request.json()) as RespondBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const kind = payload.kind;
  if (kind !== 'accept' && kind !== 'decline' && kind !== 'conflict') {
    return Response.json({ error: 'A valid response is required.' }, { status: 422 });
  }
  const note = typeof payload.note === 'string' ? payload.note.trim() : '';
  if ((kind === 'decline' || kind === 'conflict') && note.length < 3) {
    return Response.json(
      { error: 'A reason is required when declining or reporting a conflict.' },
      { status: 422 },
    );
  }
  const id = encodeURIComponent(params.id);
  return mutateThenProject<PlatformReviewAssignment, unknown>({
    mutation: {
      request,
      path: `/review-assignments/${id}/${kind}`,
      method: kind === 'conflict' ? 'PUT' : 'POST',
      body:
        kind === 'accept'
          ? {}
          : kind === 'conflict'
            ? { declared: true, reason: note }
            : { reason: note },
    },
    read: { request, path: `/review-assignments/${id}`, method: 'GET' },
    project: reviewerAssignment,
  });
}
