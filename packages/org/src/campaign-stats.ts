import { can } from '@cpf/policy';
import type { Actor } from './types.js';
import { ORG_PERMISSIONS } from './permissions.js';

export interface CampaignStatsRecord {
  readonly campaignId: string;
  readonly totalApplications: number;
  readonly byStatus: Record<string, number>;
}

export interface CampaignStatsRepository {
  getCampaignStats(actor: Actor, campaignId: string): Promise<CampaignStatsRecord | null>;
}

interface StatsDeps {
  readonly repository: CampaignStatsRepository;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function getCampaignStats(
  deps: StatsDeps,
  actor: Actor,
  campaignId: string,
): Promise<Result<{ stats: CampaignStatsRecord }>> {
  if (
    !can(
      { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
      'read',
      { type: 'campaign', tenantId: actor.tenantId },
      ORG_PERMISSIONS,
    ).allowed
  ) {
    return { ok: false, status: 403, reason: 'forbidden' };
  }
  const stats = await deps.repository.getCampaignStats(actor, campaignId);
  if (stats === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, stats };
}
