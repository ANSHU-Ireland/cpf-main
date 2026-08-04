import { describe, it, expect } from 'vitest';
import { handleGetCampaignStats, type CampaignStatsService } from './campaign-stats.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = {
  tenantId: VALID_ID,
  userId: VALID_ID,
  roles: ['employer_admin'],
};

function service(overrides: Partial<CampaignStatsService> = {}): CampaignStatsService {
  return {
    getCampaignStats: () =>
      Promise.resolve({
        ok: true as const,
        stats: { campaignId: VALID_ID, totalApplications: 3, byStatus: { submitted: 3 } },
      }),
    ...overrides,
  };
}

describe('handleGetCampaignStats', () => {
  it('returns 200', async () => {
    const res = await handleGetCampaignStats(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetCampaignStats(service(), { actor, campaignId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleGetCampaignStats(
      service({
        getCampaignStats: () => Promise.resolve({ ok: false, status: 404, reason: 'not_found' }),
      }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
  it('returns 403 when forbidden', async () => {
    const res = await handleGetCampaignStats(
      service({
        getCampaignStats: () => Promise.resolve({ ok: false, status: 403, reason: 'forbidden' }),
      }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(403);
  });
});
