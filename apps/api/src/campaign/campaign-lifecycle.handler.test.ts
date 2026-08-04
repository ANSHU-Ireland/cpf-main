import { describe, it, expect } from 'vitest';
import type { Actor, TransitionCampaignResult, DuplicateCampaignResult } from '@cpf/org';
import {
  handleActivateCampaign,
  handlePauseCampaign,
  handleCloseCampaign,
  handleArchiveCampaign,
  handleDuplicateCampaign,
  type CampaignLifecycleService,
} from './campaign-lifecycle.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const campaignDto = {
  id: 'camp-1',
  code: 'FE-2026',
  title: 'Frontend Engineer',
  roleName: 'Frontend Engineer',
  seniority: 'Senior',
  status: 'active' as const,
  departmentId: null,
  teamId: null,
  ownerUserId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function service(overrides: Partial<CampaignLifecycleService> = {}): CampaignLifecycleService {
  const ok: TransitionCampaignResult = { ok: true, campaign: campaignDto };
  const dupOk: DuplicateCampaignResult = {
    ok: true,
    campaign: { ...campaignDto, id: 'camp-2', code: 'COPY', status: 'draft' },
  };
  return {
    activateCampaign: () => Promise.resolve(ok),
    pauseCampaign: () => Promise.resolve(ok),
    closeCampaign: () => Promise.resolve(ok),
    archiveCampaign: () => Promise.resolve(ok),
    duplicateCampaign: () => Promise.resolve(dupOk),
    ...overrides,
  };
}

describe('handleActivateCampaign', () => {
  it('returns 200 on success', async () => {
    const res = await handleActivateCampaign(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleActivateCampaign(service(), { actor, campaignId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleActivateCampaign(
      service({ activateCampaign: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
  it('returns 409 on invalid state', async () => {
    const res = await handleActivateCampaign(
      service({ activateCampaign: () => Promise.resolve({ ok: false, status: 409, reason: 'x' }) }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(409);
  });
});

describe('handlePauseCampaign', () => {
  it('returns 200 on success', async () => {
    const res = await handlePauseCampaign(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 403 on denied', async () => {
    const res = await handlePauseCampaign(
      service({ pauseCampaign: () => Promise.resolve({ ok: false, status: 403, reason: 'no' }) }),
      { actor, campaignId: VALID_ID },
    );
    expect(res.status).toBe(403);
  });
});

describe('handleCloseCampaign', () => {
  it('returns 200 on success', async () => {
    const res = await handleCloseCampaign(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
});

describe('handleArchiveCampaign', () => {
  it('returns 200 on success', async () => {
    const res = await handleArchiveCampaign(service(), { actor, campaignId: VALID_ID });
    expect(res.status).toBe(200);
  });
});

describe('handleDuplicateCampaign', () => {
  it('returns 200 with new draft', async () => {
    const res = await handleDuplicateCampaign(service(), {
      actor,
      campaignId: VALID_ID,
      body: { newCode: 'COPY' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleDuplicateCampaign(service(), {
      actor,
      campaignId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate code', async () => {
    const res = await handleDuplicateCampaign(
      service({
        duplicateCampaign: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }),
      }),
      { actor, campaignId: VALID_ID, body: { newCode: 'X' } },
    );
    expect(res.status).toBe(409);
  });
  it('returns 404 when source not found', async () => {
    const res = await handleDuplicateCampaign(
      service({
        duplicateCampaign: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }),
      }),
      { actor, campaignId: VALID_ID, body: { newCode: 'X' } },
    );
    expect(res.status).toBe(404);
  });
});
