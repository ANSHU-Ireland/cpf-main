import { projectPlatform } from '../../../../lib/platform-api.server';
import { candidateRecord, type PlatformCandidate } from '../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformCandidate, unknown>(
    {
      request,
      path: `/candidates/${encodeURIComponent(params.id)}`,
      method: 'GET',
    },
    candidateRecord,
  );
}
