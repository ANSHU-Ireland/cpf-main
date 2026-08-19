import {
  candidateAccommodations,
  type PlatformAccommodation,
} from '../../../lib/candidate-self-service.server';
import { callPlatform, PlatformApiError, projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly category?: unknown;
  readonly summary?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<
    { readonly items: readonly PlatformAccommodation[]; readonly total: number },
    object
  >({ request, path: '/candidate/accommodations', method: 'GET' }, candidateAccommodations);
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (category === '' || summary.length < 5) {
    return Response.json(
      { error: 'Select a category and describe the adjustment you need.' },
      { status: 422 },
    );
  }
  try {
    const result = await callPlatform<PlatformAccommodation>({
      request,
      path: '/candidate/accommodations',
      method: 'POST',
      body: { requestSummary: summary, operationalAdjustments: { category } },
    });
    return Response.json(candidateAccommodations({ items: [result.data], total: 1 }).items[0], {
      status: 201,
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
