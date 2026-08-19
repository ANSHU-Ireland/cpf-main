import {
  candidateSupportCases,
  type PlatformSupportCase,
} from '../../../lib/candidate-self-service.server';
import { callPlatform, PlatformApiError, projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface SupportBody {
  readonly subject?: unknown;
  readonly category?: unknown;
  readonly description?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<
    { readonly items: readonly PlatformSupportCase[]; readonly total: number },
    object
  >({ request, path: '/me/support-cases', method: 'GET' }, candidateSupportCases);
}

export async function POST(request: Request): Promise<Response> {
  let body: SupportBody;
  try {
    body = (await request.json()) as SupportBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (subject.length < 4 || category === '' || description.length < 20) {
    return Response.json(
      {
        error: 'A category, subject (4+ characters) and description (20+ characters) are required.',
      },
      { status: 422 },
    );
  }
  try {
    const result = await callPlatform<PlatformSupportCase>({
      request,
      path: '/me/support-cases',
      method: 'POST',
      body: {
        category,
        severity: 'medium',
        subject,
        description,
        purpose: 'Candidate-requested support for an application or controlled assessment.',
      },
    });
    return Response.json(candidateSupportCases({ items: [result.data], total: 1 }).items[0], {
      status: 201,
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
