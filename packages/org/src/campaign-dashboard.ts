import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCampaignIdForDashboard(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface CampaignDashboardData {
  readonly campaignId: string;
  readonly totalApplications: number;
  readonly totalReviewers: number;
  readonly averageScore: number | null;
  readonly statusBreakdown: Record<string, number>;
}

export interface CampaignComparisonData {
  readonly campaignId: string;
  readonly candidates: readonly { candidateId: string; score: number | null; rank: number }[];
}

export interface CampaignDashboardRepository {
  getDashboard(actor: Actor, campaignId: string): Promise<CampaignDashboardData | null>;
  getComparison(actor: Actor, campaignId: string): Promise<CampaignComparisonData | null>;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };
export type GetDashboardResult = Result<{ dashboard: CampaignDashboardData }>;
export type GetComparisonResult = Result<{ comparison: CampaignComparisonData }>;

export async function getCampaignDashboard(
  deps: { repository: CampaignDashboardRepository },
  actor: Actor,
  campaignId: string,
): Promise<GetDashboardResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const data = await deps.repository.getDashboard(actor, campaignId);
  if (data === null) return { ok: false, status: 404, reason: 'Campaign not found.' };
  return { ok: true, dashboard: data };
}

export async function getCampaignComparison(
  deps: { repository: CampaignDashboardRepository },
  actor: Actor,
  campaignId: string,
): Promise<GetComparisonResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const data = await deps.repository.getComparison(actor, campaignId);
  if (data === null) return { ok: false, status: 404, reason: 'Campaign not found.' };
  return { ok: true, comparison: data };
}
