import { contractGapResponse } from '../../../../lib/contract-gap.server';
import { projectPlatform } from '../../../../lib/platform-api.server';
import { assessmentDetail, type PlatformAssessment } from '../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformAssessment, unknown>(
    {
      request,
      path: `/assessments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    },
    assessmentDetail,
  );
}

export function PATCH(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Assessment lifecycle command not exposed',
    detail:
      'The baseline governs immutable assessment versions, but it does not expose a direct assessment-level status command for this control.',
    requirementIds: ['FR-AA-01', 'FR-AA-02'],
  });
}
