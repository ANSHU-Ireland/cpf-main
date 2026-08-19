import type { AiModelStatus } from '../../../../lib/types';
import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../../lib/platform-api.server';
import { aiModelDetail, type PlatformAiModel } from '../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

async function findModel(request: Request, id: string): Promise<PlatformAiModel | null> {
  const page = await callPlatform<{ items: readonly PlatformAiModel[] }>({
    request,
    path: '/ai-models?limit=100',
    method: 'GET',
  });
  return page.data.items.find((item) => item.id === id) ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const item = await findModel(request, params.id);
    return item === null
      ? Response.json({ error: 'Model not found.' }, { status: 404 })
      : Response.json(aiModelDetail(item));
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const status = payload.status as AiModelStatus;
  const action = status === 'active' ? 'activate' : status === 'suspended' ? 'suspend' : null;
  if (action === null) {
    return Response.json(
      { error: 'Only activation and suspension are lifecycle commands on this surface.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformAiModel, unknown>(
    {
      request,
      path: `/ai-models/${encodeURIComponent(params.id)}/${action}`,
      method: 'POST',
    },
    aiModelDetail,
  );
}
