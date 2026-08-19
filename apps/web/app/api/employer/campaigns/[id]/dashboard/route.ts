import { projectPlatform } from '../../../../../lib/platform-api.server';
import {
  campaignOps,
  type PlatformCampaignDashboard,
} from '../../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return projectPlatform<PlatformCampaignDashboard, unknown>(
    {
      request,
      path: `/campaigns/${encodeURIComponent(params.id)}/dashboard`,
      method: 'GET',
    },
    campaignOps,
  );
}
