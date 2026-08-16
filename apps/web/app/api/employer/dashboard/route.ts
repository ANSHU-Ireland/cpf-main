import { callPlatform, platformErrorResponse } from '../../../lib/platform-api.server';
import type { EmployerDashboardView } from '../../../lib/types';
import type {
  PlatformAccommodation,
  PlatformCampaignDashboard,
  PlatformCampaignPage,
  PlatformOrganization,
  PlatformPreflight,
  PlatformReadiness,
} from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

const TERMINAL_APPLICATION_STATUSES = new Set([
  'progressed',
  'not_progressed',
  'withdrawn',
  'cancelled',
]);

export async function GET(request: Request): Promise<Response> {
  try {
    const [organization, campaigns, accommodations, deployerReadiness] = await Promise.all([
      callPlatform<PlatformOrganization>({ request, path: '/organization', method: 'GET' }),
      callPlatform<PlatformCampaignPage>({
        request,
        path: '/campaigns?limit=100',
        method: 'GET',
      }),
      callPlatform<{ items: readonly PlatformAccommodation[]; total: number }>({
        request,
        path: '/accommodations?limit=100',
        method: 'GET',
      }),
      callPlatform<PlatformReadiness>({
        request,
        path: '/organization/deployer-readiness',
        method: 'GET',
      }),
    ]);
    const campaignDetails = await Promise.all(
      campaigns.data.items.map(async (campaign) => {
        const [dashboard, preflight] = await Promise.all([
          callPlatform<PlatformCampaignDashboard>({
            request,
            path: `/campaigns/${encodeURIComponent(campaign.id)}/dashboard`,
            method: 'GET',
            correlationId: campaigns.correlationId,
          }),
          callPlatform<PlatformPreflight>({
            request,
            path: `/campaigns/${encodeURIComponent(campaign.id)}/activation-preflight`,
            method: 'GET',
            correlationId: campaigns.correlationId,
          }),
        ]);
        return { campaign, dashboard: dashboard.data, preflight: preflight.data };
      }),
    );
    const readinessBlockers =
      Number(!deployerReadiness.data.humanOversightConfirmed) +
      Number(!deployerReadiness.data.monitoringConfirmed) +
      Number(!deployerReadiness.data.recordKeepingConfirmed) +
      campaignDetails.reduce(
        (total, item) =>
          total +
          (item.campaign.status === 'closed' || item.campaign.status === 'archived'
            ? 0
            : item.preflight.checks.filter((check) => !check.resolved).length),
        0,
      );
    const result: EmployerDashboardView = {
      orgName: organization.data.displayName,
      activeCampaigns: campaigns.data.items.filter((item) => item.status === 'active').length,
      openApplications: campaignDetails.reduce(
        (total, item) =>
          total +
          Object.entries(item.dashboard.statusBreakdown)
            .filter(([status]) => !TERMINAL_APPLICATION_STATUSES.has(status))
            .reduce((subtotal, [, count]) => subtotal + count, 0),
        0,
      ),
      pendingDecisions: campaignDetails.reduce(
        (total, item) => total + (item.dashboard.statusBreakdown.reviewed ?? 0),
        0,
      ),
      pendingAccommodations: accommodations.data.items.filter(
        (item) => item.status === 'requested' || item.status === 'under_review',
      ).length,
      unassignedReviews: campaignDetails.reduce(
        (total, item) => total + item.dashboard.unassignedReviews,
        0,
      ),
      readinessBlockers,
    };
    return Response.json(result, {
      headers: { 'x-correlation-id': organization.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
