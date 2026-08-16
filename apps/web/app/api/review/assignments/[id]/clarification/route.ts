import {
  callPlatform,
  PlatformApiError,
  projectPlatform,
} from '../../../../../lib/platform-api.server';
import {
  reviewerClarifications,
  type PlatformClarification,
  type PlatformReviewAssignment,
} from '../../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface ClarificationBody {
  readonly topic?: unknown;
  readonly body?: unknown;
  readonly escalate?: unknown;
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
    reviewerClarifications,
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: ClarificationBody;
  try {
    payload = (await request.json()) as ClarificationBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (topic.length < 3 || body.length < 3) {
    return Response.json({ error: 'A topic and a message are both required.' }, { status: 422 });
  }
  const question = `${payload.escalate === true ? '[Escalation] ' : ''}${topic}: ${body}`;
  try {
    const result = await callPlatform<{
      id: string;
      assignmentId: string;
      question: string;
      status: string;
      createdAt: string;
    }>({
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}/clarifications`,
      method: 'POST',
      body: { question },
    });
    const item: PlatformClarification = {
      id: result.data.id,
      requestType: payload.escalate === true ? 'escalation' : topic,
      question: result.data.question,
      status: result.data.status,
      createdAt: result.data.createdAt,
    };
    const projected = reviewerClarifications({
      id: params.id,
      status: 'accepted',
      assignedAt: result.data.createdAt,
      dueAt: null,
      submittedAt: null,
      clarifications: [item],
    }).items[0];
    return Response.json(projected, {
      status: 201,
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
