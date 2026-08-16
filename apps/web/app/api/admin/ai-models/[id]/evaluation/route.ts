import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../../../lib/platform-api.server';
import { aiEvaluation, type PlatformAiModel } from '../../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface RecordBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const page = await callPlatform<{ items: readonly PlatformAiModel[] }>({
      request,
      path: '/ai-models?limit=100',
      method: 'GET',
    });
    const item = page.data.items.find((model) => model.id === params.id);
    return item === undefined
      ? Response.json({ error: 'Model not found.' }, { status: 404 })
      : Response.json(aiEvaluation(item), {
          headers: { 'x-correlation-id': page.correlationId },
        });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: RecordBody;
  try {
    payload = (await request.json()) as RecordBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const outcome = typeof payload.outcome === 'string' ? payload.outcome.trim() : '';
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (outcome.length < 2 || rationale.length < 12) {
    return Response.json(
      { error: 'An outcome and rationale of at least 12 characters are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformAiModel, unknown>(
    {
      request,
      path: `/ai-models/${encodeURIComponent(params.id)}/evaluations`,
      method: 'POST',
      body: { outcome, rationale },
    },
    aiEvaluation,
  );
}
