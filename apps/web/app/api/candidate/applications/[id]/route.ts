import type { PlatformCandidateApplication } from '../../../../lib/candidate-api.server';
import { projectPlatform } from '../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformCandidateApplication, object>(
    {
      request,
      path: `/candidate/applications/${encodeURIComponent(params.id)}/status`,
      method: 'GET',
    },
    (application) => ({
      id: application.applicationId,
      campaignTitle: application.assessmentTitle,
      roleTitle: application.roleName,
      appliedAt: application.appliedAt,
      status: application.status === 'withdrawn' ? 'withdrawn' : 'under_review',
    }),
  );
}
