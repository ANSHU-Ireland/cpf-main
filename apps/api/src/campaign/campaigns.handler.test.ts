import { describe, it, expect } from 'vitest';
import type {
  Actor,
  CreateCampaignResult,
  GetCampaignResult,
  ListCampaignsResult,
  UpdateCampaignResult,
} from '@cpf/org';
import {
  handleGetCampaign,
  handleGetCampaigns,
  handlePatchCampaign,
  handlePostCampaign,
  type CampaignService,
} from './campaigns.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const campaignDto = {
  id: 'camp-1',
  code: 'FE-2026',
  title: 'Frontend Engineer',
  roleName: 'Frontend Engineer',
  seniority: 'Senior',
  status: 'draft' as const,
  departmentId: null,
  teamId: null,
  ownerUserId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [campaignDto], nextCursor: null, total: 1 };

function service(
  list: ListCampaignsResult = { ok: true, page },
  get: GetCampaignResult = { ok: true, campaign: campaignDto },
  create: CreateCampaignResult = { ok: true, campaign: campaignDto },
  update: UpdateCampaignResult = { ok: true, campaign: campaignDto },
): CampaignService {
  return {
    listCampaigns: () => Promise.resolve(list),
    getCampaign: () => Promise.resolve(get),
    createCampaign: () => Promise.resolve(create),
    updateCampaign: () => Promise.resolve(update),
  };
}

describe('handleGetCampaigns', () => {
  it('returns 200 with campaigns page', async () => {
    const res = await handleGetCampaigns(service(), { actor, query: {}, correlationId: 'c1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(page);
  });

  it('returns 422 for invalid limit', async () => {
    const res = await handleGetCampaigns(service(), { actor, query: { limit: '0' } });
    expect(res.status).toBe(422);
  });

  it('returns 403 on denied', async () => {
    const res = await handleGetCampaigns(service({ ok: false, status: 403, reason: 'denied' }), {
      actor,
      query: {},
    });
    expect(res.status).toBe(403);
  });
});

describe('handleGetCampaign', () => {
  it('returns 200 with campaign', async () => {
    const res = await handleGetCampaign(service(), {
      actor,
      campaignId: '11111111-1111-1111-1111-111111111111',
      correlationId: 'c2',
    });
    expect(res.status).toBe(200);
  });

  it('returns 422 for bad campaignId', async () => {
    const res = await handleGetCampaign(service(), { actor, campaignId: 'bad' });
    expect(res.status).toBe(422);
  });

  it('returns 404 when not found', async () => {
    const res = await handleGetCampaign(
      service(undefined, { ok: false, status: 404, reason: 'not found' }),
      { actor, campaignId: '11111111-1111-1111-1111-111111111111' },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostCampaign', () => {
  it('returns 200 with created campaign', async () => {
    const res = await handlePostCampaign(service(), {
      actor,
      body: { code: 'FE-2026', title: 'Frontend', roleName: 'FE', seniority: 'Senior' },
      correlationId: 'c3',
    });
    expect(res.status).toBe(200);
  });

  it('returns 422 for missing fields', async () => {
    const res = await handlePostCampaign(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });

  it('returns 409 on duplicate code', async () => {
    const res = await handlePostCampaign(
      service(undefined, undefined, { ok: false, status: 409, reason: 'dup' }),
      { actor, body: { code: 'FE-2026', title: 'Frontend', roleName: 'FE', seniority: 'Senior' } },
    );
    expect(res.status).toBe(409);
  });
});

describe('handlePatchCampaign', () => {
  it('returns 200 with updated campaign', async () => {
    const res = await handlePatchCampaign(service(), {
      actor,
      campaignId: '11111111-1111-1111-1111-111111111111',
      body: { title: 'Updated' },
      correlationId: 'c4',
    });
    expect(res.status).toBe(200);
  });

  it('returns 422 for empty body', async () => {
    const res = await handlePatchCampaign(service(), {
      actor,
      campaignId: '11111111-1111-1111-1111-111111111111',
      body: {},
    });
    expect(res.status).toBe(422);
  });

  it('returns 404 when not found', async () => {
    const res = await handlePatchCampaign(
      service(undefined, undefined, undefined, { ok: false, status: 404, reason: 'not found' }),
      { actor, campaignId: '11111111-1111-1111-1111-111111111111', body: { title: 'X' } },
    );
    expect(res.status).toBe(404);
  });
});
