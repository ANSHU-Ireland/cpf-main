import { projectPlatform } from '../../../../../lib/platform-api.server';
import {
  campaignComparison,
  type PlatformCampaignComparison,
} from '../../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformCampaignComparison, unknown>(
    {
      request,
      path: `/campaigns/${encodeURIComponent(params.id)}/comparison`,
      method: 'GET',
    },
    campaignComparison,
  );
}
