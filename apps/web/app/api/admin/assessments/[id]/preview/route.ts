import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';
import {
  assessmentPreview,
  type PlatformAssessment,
  type PlatformAssessmentPreview,
} from '../../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const assessment = await callPlatform<PlatformAssessment>({
      request,
      path: `/assessments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    });
    const version = assessment.data.versions?.[0];
    if (version === undefined) {
      return Response.json(
        { error: 'No assessment version is available to preview.' },
        { status: 404 },
      );
    }
    const preview = await callPlatform<PlatformAssessmentPreview>({
      request,
      path: `/assessment-versions/${encodeURIComponent(version.id)}/preview`,
      method: 'GET',
      correlationId: assessment.correlationId,
    });
    return Response.json(assessmentPreview(preview.data, assessment.data.title), {
      headers: { 'x-correlation-id': preview.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
