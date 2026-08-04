import {
  getCampaignDashboard,
  getCampaignComparison,
  parseCampaignIdForDashboard,
  type CampaignDashboardRepository,
  type GetDashboardResult,
  type GetComparisonResult,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CampaignDashboardService {
  getDashboard(actor: Actor, campaignId: string): Promise<GetDashboardResult>;
  getComparison(actor: Actor, campaignId: string): Promise<GetComparisonResult>;
}

export function createCampaignDashboardService(deps: {
  repository: CampaignDashboardRepository;
}): CampaignDashboardService {
  return {
    getDashboard: (actor, id) => getCampaignDashboard(deps, actor, id),
    getComparison: (actor, id) => getCampaignComparison(deps, actor, id),
  };
}

export async function handleGetCampaignDashboard(
  svc: CampaignDashboardService,
  req: { actor: Actor; campaignId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseCampaignIdForDashboard(req.campaignId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.getDashboard(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.dashboard, correlationId);
}

export async function handleGetCampaignComparison(
  svc: CampaignDashboardService,
  req: { actor: Actor; campaignId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseCampaignIdForDashboard(req.campaignId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.getComparison(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.comparison, correlationId);
}
