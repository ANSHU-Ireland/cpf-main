import { describe, it, expect } from 'vitest';
import {
  activateCampaign,
  pauseCampaign,
  closeCampaign,
  archiveCampaign,
  duplicateCampaign,
  parseDuplicateInput,
  parseCampaignIdParam,
} from './campaign-lifecycle.js';
import type { CampaignRepository, CampaignListResult } from './campaign-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type {
  CampaignRecord,
  CampaignCreate,
  CampaignUpdate,
  CampaignStatus,
} from './campaign-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function camp(over: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 'camp-1',
    code: 'FE-2026',
    title: 'Frontend Engineer',
    roleName: 'Frontend Engineer',
    seniority: 'Senior',
    status: 'draft',
    departmentId: null,
    teamId: null,
    ownerUserId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<CampaignRepository> = {}): CampaignRepository {
  const listResult: CampaignListResult = { items: [camp()], total: 1, hasMore: false };
  return {
    listCampaigns: () => Promise.resolve(listResult),
    getCampaign: () => Promise.resolve(camp()),
    createCampaign: (_a: Actor, _i: CampaignCreate) => Promise.resolve(camp()),
    updateCampaign: (_a: Actor, _id: string, _i: CampaignUpdate) => Promise.resolve(camp()),
    transitionStatus: (_a: Actor, _id: string, toStatus: CampaignStatus) =>
      Promise.resolve(camp({ status: toStatus })),
    duplicateCampaign: (_a: Actor, _id: string, newCode: string) =>
      Promise.resolve(camp({ id: 'camp-2', code: newCode, status: 'draft' })),
    ...overrides,
  };
}

describe('parseCampaignIdParam', () => {
  it('accepts valid UUID', () => {
    expect(parseCampaignIdParam('11111111-1111-1111-1111-111111111111')).toBe(
      '11111111-1111-1111-1111-111111111111',
    );
  });
  it('rejects non-UUID', () => {
    expect(parseCampaignIdParam('bad')).toBeNull();
  });
});

describe('parseDuplicateInput', () => {
  it('accepts valid input', () => {
    expect(parseDuplicateInput({ newCode: 'FE-COPY' })).toEqual({
      ok: true,
      value: { newCode: 'FE-COPY' },
    });
  });
  it('rejects missing code', () => {
    expect(parseDuplicateInput({}).ok).toBe(false);
  });
  it('rejects non-object', () => {
    expect(parseDuplicateInput(null).ok).toBe(false);
  });
});

describe('activateCampaign', () => {
  it('transitions draft → active for admin', async () => {
    const r = await activateCampaign({ repository: repo() }, admin, 'camp-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.campaign.status).toBe('active');
  });
  it('returns 403 for non-admin', async () => {
    const r = await activateCampaign({ repository: repo() }, noRole, 'camp-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
  it('returns 404 when not found', async () => {
    const r = await activateCampaign(
      { repository: repo({ transitionStatus: () => Promise.resolve('not_found') }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
  it('returns 409 on invalid state', async () => {
    const r = await activateCampaign(
      { repository: repo({ transitionStatus: () => Promise.resolve('invalid_status') }) },
      admin,
      'camp-1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('pauseCampaign', () => {
  it('transitions active → paused', async () => {
    const r = await pauseCampaign({ repository: repo() }, admin, 'camp-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.campaign.status).toBe('paused');
  });
});

describe('closeCampaign', () => {
  it('transitions active/paused → closed', async () => {
    const r = await closeCampaign({ repository: repo() }, admin, 'camp-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.campaign.status).toBe('closed');
  });
});

describe('archiveCampaign', () => {
  it('transitions closed → archived', async () => {
    const r = await archiveCampaign({ repository: repo() }, admin, 'camp-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.campaign.status).toBe('archived');
  });
});

describe('duplicateCampaign', () => {
  it('creates a draft copy', async () => {
    const r = await duplicateCampaign({ repository: repo() }, admin, 'camp-1', {
      newCode: 'FE-COPY',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.campaign.code).toBe('FE-COPY');
      expect(r.campaign.status).toBe('draft');
    }
  });
  it('returns 404 when source not found', async () => {
    const r = await duplicateCampaign(
      { repository: repo({ duplicateCampaign: () => Promise.resolve(null) }) },
      admin,
      'missing',
      { newCode: 'X' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
  it('returns 409 on duplicate code', async () => {
    const dupRepo = repo({
      duplicateCampaign: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await duplicateCampaign({ repository: dupRepo }, admin, 'camp-1', {
      newCode: 'EXISTING',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
  it('returns 403 for non-admin', async () => {
    const r = await duplicateCampaign({ repository: repo() }, noRole, 'camp-1', {
      newCode: 'X',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});
