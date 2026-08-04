import { describe, it, expect } from 'vitest';
import {
  handleGetCampaignDashboard,
  handleGetCampaignComparison,
  type CampaignDashboardService,
} from './campaign-dashboard.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

function service(overrides: Partial<CampaignDashboardService> = {}): CampaignDashboardService {
  return {
    getDashboard: () =>
      Promise.resolve({
        ok: true as const,
        dashboard: {
          campaignId: VALID_ID,
          totalApplications: 5,
          totalReviewers: 2,
          averageScore: 70,
          statusBreakdown: {},
        },
      }),
    getComparison: () =>
      Promise.resolve({ ok: true as const, comparison: { campaignId: VALID_ID, candidates: [] } }),
    ...overrides,
  };
}

describe('handleGetCampaignDashboard', () => {
  it('returns 200', async () => {
    const res = await handleGetCampaignDashboard(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422', async () => {
    const res = await handleGetCampaignDashboard(service(), { actor, campaignId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404', async () => {
    const res = await handleGetCampaignDashboard(
      service({
        getDashboard: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleGetCampaignComparison', () => {
  it('returns 200', async () => {
    const res = await handleGetCampaignComparison(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404', async () => {
    const res = await handleGetCampaignComparison(
      service({
        getComparison: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});
