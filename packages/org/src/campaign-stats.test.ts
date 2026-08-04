import { describe, it, expect } from 'vitest';
import { getCampaignStats } from './campaign-stats.js';
import type { CampaignStatsRepository, CampaignStatsRecord } from './campaign-stats.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const CAMPAIGN = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}

const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

const statsRecord: CampaignStatsRecord = {
  campaignId: CAMPAIGN,
  totalApplications: 5,
  byStatus: { submitted: 3, under_review: 2 },
};

function repo(overrides: Partial<CampaignStatsRepository> = {}): CampaignStatsRepository {
  return {
    getCampaignStats: () => Promise.resolve(statsRecord),
    ...overrides,
  };
}

describe('getCampaignStats', () => {
  it('returns stats for admin', async () => {
    const r = await getCampaignStats({ repository: repo() }, admin, CAMPAIGN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stats.totalApplications).toBe(5);
  });
  it('returns 404 when campaign not found', async () => {
    const r = await getCampaignStats(
      { repository: repo({ getCampaignStats: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
  it('denies non-admin', async () => {
    const r = await getCampaignStats({ repository: repo() }, noRole, CAMPAIGN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});
