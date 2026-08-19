import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import { projectPlatform } from '../../../../../lib/platform-api.server';
import { preflightChecks, type PlatformPreflight } from '../../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformPreflight, unknown>(
    {
      request,
      path: `/campaigns/${encodeURIComponent(params.id)}/activation-preflight`,
      method: 'GET',
    },
    preflightChecks,
  );
}

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Preflight controls cannot be manually overridden',
    detail:
      'Each blocker is resolved by completing its authoritative assessment, governance, reviewer, notice or retention record.',
    requirementIds: ['FR-EA-05', 'FR-EA-19'],
  });
}
