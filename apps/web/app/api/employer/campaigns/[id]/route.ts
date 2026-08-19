import type { CampaignStatus } from '../../../../lib/types';
import { callPlatform, platformErrorResponse } from '../../../../lib/platform-api.server';
import {
  campaignView,
  type PlatformCampaign,
  type PlatformCampaignDashboard,
  type PlatformPreflight,
} from '../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const campaign = await callPlatform<PlatformCampaign>({
      request,
      path: `/campaigns/${encodeURIComponent(params.id)}`,
      method: 'GET',
    });
    const [dashboard, preflight] = await Promise.all([
      callPlatform<PlatformCampaignDashboard>({
        request,
        path: `/campaigns/${encodeURIComponent(params.id)}/dashboard`,
        method: 'GET',
        correlationId: campaign.correlationId,
      }),
      callPlatform<PlatformPreflight>({
        request,
        path: `/campaigns/${encodeURIComponent(params.id)}/activation-preflight`,
        method: 'GET',
        correlationId: campaign.correlationId,
      }),
    ]);
    return Response.json(
      campaignView(
        campaign.data,
        {
          campaignId: dashboard.data.campaignId,
          totalApplications: dashboard.data.totalApplications,
          byStatus: dashboard.data.statusBreakdown,
        },
        preflight.data,
      ),
      { headers: { 'x-correlation-id': campaign.correlationId } },
    );
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
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const status = payload.status as CampaignStatus;
  const action: Partial<Record<CampaignStatus, string>> = {
    active: 'activate',
    paused: 'pause',
    closed: 'close',
    archived: 'archive',
  };
  const operation = action[status];
  if (operation === undefined) {
    return Response.json(
      { error: 'Only active, paused, closed or archived lifecycle transitions are supported.' },
      { status: 422 },
    );
  }
  try {
    const result = await callPlatform<PlatformCampaign>({
      request,
      path: `/campaigns/${encodeURIComponent(params.id)}/${operation}`,
      method: 'POST',
    });
    return Response.json(campaignView(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
