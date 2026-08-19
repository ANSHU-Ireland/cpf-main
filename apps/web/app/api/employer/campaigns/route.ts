import { randomUUID } from 'node:crypto';
import { callPlatform, platformErrorResponse } from '../../../lib/platform-api.server';
import {
  campaignView,
  type PlatformCampaign,
  type PlatformCampaignPage,
  type PlatformCampaignDashboard,
  type PlatformPreflight,
} from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface CampaignBody {
  readonly name?: unknown;
  readonly roleTitle?: unknown;
}

function campaignCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return `${slug || 'campaign'}-${randomUUID().slice(0, 8)}`;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const page = await callPlatform<PlatformCampaignPage>({
      request,
      path: '/campaigns?limit=100',
      method: 'GET',
    });
    const items = await Promise.all(
      page.data.items.map(async (campaign) => {
        const [dashboard, preflight] = await Promise.all([
          callPlatform<PlatformCampaignDashboard>({
            request,
            path: `/campaigns/${encodeURIComponent(campaign.id)}/dashboard`,
            method: 'GET',
            correlationId: page.correlationId,
          }),
          callPlatform<PlatformPreflight>({
            request,
            path: `/campaigns/${encodeURIComponent(campaign.id)}/activation-preflight`,
            method: 'GET',
            correlationId: page.correlationId,
          }),
        ]);
        return campaignView(
          campaign,
          {
            campaignId: dashboard.data.campaignId,
            totalApplications: dashboard.data.totalApplications,
            byStatus: dashboard.data.statusBreakdown,
          },
          preflight.data,
        );
      }),
    );
    return Response.json(
      { items, total: page.data.total },
      { headers: { 'x-correlation-id': page.correlationId } },
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: CampaignBody;
  try {
    payload = (await request.json()) as CampaignBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const roleTitle = typeof payload.roleTitle === 'string' ? payload.roleTitle.trim() : '';
  if (name.length < 2 || roleTitle.length < 2) {
    return Response.json(
      { error: 'A campaign name and role title are required.' },
      { status: 422 },
    );
  }
  try {
    const result = await callPlatform<PlatformCampaign>({
      request,
      path: '/campaigns',
      method: 'POST',
      body: {
        code: campaignCode(name),
        title: name,
        roleName: roleTitle,
        seniority: 'unspecified',
      },
      idempotencyKey: request.headers.get('idempotency-key') ?? randomUUID(),
    });
    return Response.json(campaignView(result.data), {
      status: 201,
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
