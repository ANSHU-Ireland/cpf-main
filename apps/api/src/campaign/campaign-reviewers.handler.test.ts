import { describe, it, expect } from 'vitest';
import type {
  Actor,
  ListReviewersResult,
  AddReviewerResult,
  DeactivateReviewerResult,
  UpdateReviewerResult,
} from '@cpf/org';
import {
  handleGetCampaignReviewers,
  handlePostCampaignReviewer,
  handleDeleteCampaignReviewer,
  handlePatchCampaignReviewer,
  type CampaignReviewerService,
} from './campaign-reviewers.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const reviewerDto = {
  id: 'rev-1',
  campaignId: 'camp-1',
  reviewerProfileId: 'prof-1',
  role: 'primary' as const,
  conflictStatus: 'pending' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [reviewerDto], nextCursor: null, total: 1 };

function service(overrides: Partial<CampaignReviewerService> = {}): CampaignReviewerService {
  const listOk: ListReviewersResult = { ok: true, page };
  const addOk: AddReviewerResult = { ok: true, reviewer: reviewerDto };
  const deactivateOk: DeactivateReviewerResult = {
    ok: true,
    reviewer: { ...reviewerDto, active: false },
  };
  const updateOk: UpdateReviewerResult = { ok: true, reviewer: reviewerDto };
  return {
    listReviewers: () => Promise.resolve(listOk),
    addReviewer: () => Promise.resolve(addOk),
    deactivateReviewer: () => Promise.resolve(deactivateOk),
    updateReviewer: () => Promise.resolve(updateOk),
    ...overrides,
  };
}

describe('handleGetCampaignReviewers', () => {
  it('returns 200 with page', async () => {
    const res = await handleGetCampaignReviewers(service(), {
      actor,
      campaignId: VALID_ID,
      query: {},
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad campaignId', async () => {
    const res = await handleGetCampaignReviewers(service(), {
      actor,
      campaignId: 'bad',
      query: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 403 on denied', async () => {
    const res = await handleGetCampaignReviewers(
      service({ listReviewers: () => Promise.resolve({ ok: false, status: 403, reason: 'no' }) }),
      { actor, campaignId: VALID_ID, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostCampaignReviewer', () => {
  it('returns 200 on success', async () => {
    const res = await handlePostCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      body: { reviewerProfileId: VALID_ID, role: 'primary' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate', async () => {
    const res = await handlePostCampaignReviewer(
      service({ addReviewer: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }) }),
      { actor, campaignId: VALID_ID, body: { reviewerProfileId: VALID_ID, role: 'primary' } },
    );
    expect(res.status).toBe(409);
  });
});

describe('handleDeleteCampaignReviewer', () => {
  it('returns 200 on success', async () => {
    const res = await handleDeleteCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      reviewerId: VALID_ID,
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad reviewerId', async () => {
    const res = await handleDeleteCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      reviewerId: 'bad',
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleDeleteCampaignReviewer(
      service({
        deactivateReviewer: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }),
      }),
      { actor, campaignId: VALID_ID, reviewerId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePatchCampaignReviewer', () => {
  it('returns 200 on success', async () => {
    const res = await handlePatchCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      reviewerId: VALID_ID,
      body: { role: 'secondary' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for empty body', async () => {
    const res = await handlePatchCampaignReviewer(service(), {
      actor,
      campaignId: VALID_ID,
      reviewerId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePatchCampaignReviewer(
      service({ updateReviewer: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, campaignId: VALID_ID, reviewerId: VALID_ID, body: { role: 'qa' } },
    );
    expect(res.status).toBe(404);
  });
});
