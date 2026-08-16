import { projectPlatform } from '../../../lib/platform-api.server';
import { aiModel, type PlatformAiModel } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  readonly name?: unknown;
  readonly provider?: unknown;
  readonly modelKey?: unknown;
  readonly modelVersion?: unknown;
  readonly useCase?: unknown;
  readonly limitations?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAiModel[]; total: number }, unknown>(
    { request, path: '/ai-models?limit=100', method: 'GET' },
    (data) => ({ items: data.items.map(aiModel), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: RegisterBody;
  try {
    payload = (await request.json()) as RegisterBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const provider = typeof payload.provider === 'string' ? payload.provider.trim() : '';
  const modelKey = typeof payload.modelKey === 'string' ? payload.modelKey.trim() : '';
  const modelVersion = typeof payload.modelVersion === 'string' ? payload.modelVersion.trim() : '';
  const useCase = typeof payload.useCase === 'string' ? payload.useCase.trim() : '';
  const limitations = typeof payload.limitations === 'string' ? payload.limitations.trim() : '';
  if (
    name.length < 2 ||
    provider.length < 2 ||
    modelKey === '' ||
    modelVersion === '' ||
    useCase.length < 4 ||
    limitations.length < 4
  ) {
    return Response.json(
      { error: 'Name, provider, model key, version, use case and limitations are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformAiModel, unknown>(
    {
      request,
      path: '/ai-models',
      method: 'POST',
      body: {
        provider,
        modelKey,
        displayName: name,
        modelVersion,
        intendedPurpose: useCase,
        limitations,
      },
    },
    aiModel,
    201,
  );
}
