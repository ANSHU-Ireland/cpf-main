import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';
import { assessmentValidation, type PlatformAssessment } from '../../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface ResolveBody {
  readonly outcome?: unknown;
  readonly rationale?: unknown;
}

const REQUIRED_VALIDATIONS = [
  'job_relevance',
  'accessibility',
  'privacy',
  'security',
  'fairness',
  'technical',
] as const;

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const result = await callPlatform<PlatformAssessment>({
      request,
      path: `/assessments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    });
    const version = result.data.versions?.find((item) => item.status !== 'retired');
    return version === undefined
      ? Response.json({ error: 'No assessment version is available.' }, { status: 404 })
      : Response.json(assessmentValidation(version), {
          headers: { 'x-correlation-id': result.correlationId },
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
  let payload: ResolveBody;
  try {
    payload = (await request.json()) as ResolveBody;
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
  try {
    const assessment = await callPlatform<PlatformAssessment>({
      request,
      path: `/assessments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    });
    const version = assessment.data.versions?.find((item) => item.status !== 'retired');
    if (version === undefined) {
      return Response.json({ error: 'No assessment version is available.' }, { status: 404 });
    }
    const normalized = outcome.toLowerCase();
    const status =
      normalized.includes('pass') || normalized.includes('approv') ? 'passed' : 'failed';
    let traceId = assessment.correlationId;
    for (const validationType of REQUIRED_VALIDATIONS) {
      const result = await callPlatform<unknown>({
        request,
        path: `/assessment-versions/${encodeURIComponent(version.id)}/validations`,
        method: 'POST',
        body: { validationType, status, summary: rationale },
        correlationId: traceId,
      });
      traceId = result.correlationId;
    }
    const refreshed = await callPlatform<PlatformAssessment>({
      request,
      path: `/assessments/${encodeURIComponent(params.id)}`,
      method: 'GET',
      correlationId: traceId,
    });
    const refreshedVersion = refreshed.data.versions?.find((item) => item.id === version.id);
    if (refreshedVersion === undefined) {
      return Response.json(
        { error: 'Assessment version not found after validation.' },
        { status: 404 },
      );
    }
    return Response.json(assessmentValidation(refreshedVersion), {
      headers: { 'x-correlation-id': refreshed.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
