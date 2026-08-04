import { getCampaignStats } from '@cpf/org';
import type { Actor, CampaignStatsRecord, CampaignStatsRepository } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StatsResult =
  { ok: true; stats: CampaignStatsRecord } | { ok: false; status: number; reason: string };

export interface CampaignStatsService {
  getCampaignStats(actor: Actor, campaignId: string): Promise<StatsResult>;
}

export function createCampaignStatsService(deps: {
  repository: CampaignStatsRepository;
}): CampaignStatsService {
  return {
    getCampaignStats: (actor, id) => getCampaignStats(deps, actor, id),
  };
}

export async function handleGetCampaignStats(
  svc: CampaignStatsService,
  req: { actor: Actor; campaignId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  if (!UUID_RE.test(req.campaignId)) {
    return problemResponse({
      status: 422,
      title: 'Invalid campaign ID',
      correlationId,
      detail: 'bad uuid',
    });
  }

  const result = await svc.getCampaignStats(req.actor, req.campaignId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.stats, correlationId);
}
