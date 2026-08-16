import { describe, it, expect } from 'vitest';
import {
  getCampaignDashboard,
  getCampaignComparison,
  parseCampaignIdForDashboard,
} from './campaign-dashboard.js';
import type {
  CampaignDashboardRepository,
  CampaignDashboardData,
  CampaignComparisonData,
} from './campaign-dashboard.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const CAMPAIGN = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

const dashboard: CampaignDashboardData = {
  campaignId: CAMPAIGN,
  totalApplications: 10,
  totalReviewers: 3,
  unassignedReviews: 1,
  averageScore: 72.5,
  statusBreakdown: { submitted: 5, under_review: 5 },
};
const comparison: CampaignComparisonData = {
  campaignId: CAMPAIGN,
  candidates: [
    {
      candidateId: 'c1',
      applicationId: 'a1',
      candidateReference: 'candidate-c1',
      reviewStatus: 'in_review',
      criteriaScored: 2,
      criteriaTotal: 4,
      score: 80,
      rank: 1,
    },
  ],
};

function repo(overrides: Partial<CampaignDashboardRepository> = {}): CampaignDashboardRepository {
  return {
    getDashboard: () => Promise.resolve(dashboard),
    getComparison: () => Promise.resolve(comparison),
    ...overrides,
  };
}

describe('parseCampaignIdForDashboard', () => {
  it('accepts UUID', () => expect(parseCampaignIdForDashboard(CAMPAIGN)).not.toBeNull());
  it('rejects bad', () => expect(parseCampaignIdForDashboard('x')).toBeNull());
});

describe('getCampaignDashboard', () => {
  it('returns dashboard', async () => {
    const r = await getCampaignDashboard({ repository: repo() }, admin, CAMPAIGN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dashboard.totalApplications).toBe(10);
  });
  it('returns 404', async () => {
    const r = await getCampaignDashboard(
      { repository: repo({ getDashboard: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
  it('denies non-admin', async () => {
    const r = await getCampaignDashboard({ repository: repo() }, noRole, CAMPAIGN);
    expect(r.ok).toBe(false);
  });
});

describe('getCampaignComparison', () => {
  it('returns comparison', async () => {
    const r = await getCampaignComparison({ repository: repo() }, admin, CAMPAIGN);
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getCampaignComparison(
      { repository: repo({ getComparison: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});
