import { describe, it, expect } from 'vitest';
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  parseCampaignCreate,
  parseCampaignListQuery,
  parseCampaignUpdate,
  updateCampaign,
} from './campaigns.js';
import type { CampaignRepository, CampaignListResult } from './campaign-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { CampaignCreate, CampaignRecord, CampaignUpdate } from './campaign-types.js';
import { encodeCursor } from './cursor.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };

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

function repo(
  result: CampaignListResult = { items: [camp()], total: 1, hasMore: false },
): CampaignRepository {
  return {
    listCampaigns: () => Promise.resolve(result),
    getCampaign: () => Promise.resolve(camp()),
    createCampaign: (_a: Actor, input: CampaignCreate) =>
      Promise.resolve(camp({ code: input.code, title: input.title })),
    updateCampaign: (_a: Actor, _id: string, input: CampaignUpdate) =>
      Promise.resolve(camp({ title: input.title ?? 'Frontend Engineer' })),
    transitionStatus: () => Promise.resolve(camp({ status: 'active' })),
    duplicateCampaign: () => Promise.resolve(camp({ id: 'new', code: 'COPY' })),
  };
}

describe('parseCampaignListQuery', () => {
  it('applies default limit', () => {
    expect(parseCampaignListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseCampaignListQuery({ limit: 0 }).ok).toBe(false);
  });
  it('decodes a valid cursor', () => {
    const cursor = encodeCursor({ ts: '2026-01-01T00:00:00.000Z', id: 'x' });
    const r = parseCampaignListQuery({ cursor });
    expect(r.ok).toBe(true);
  });
});

describe('parseCampaignCreate', () => {
  it('accepts valid input', () => {
    const r = parseCampaignCreate({ code: 'FE', title: 'T', roleName: 'R', seniority: 'S' });
    expect(r.ok).toBe(true);
  });
  it('rejects missing required fields', () => {
    expect(parseCampaignCreate({ code: 'FE' }).ok).toBe(false);
  });
  it('rejects unknown properties', () => {
    expect(
      parseCampaignCreate({ code: 'FE', title: 'T', roleName: 'R', seniority: 'S', bad: 1 }).ok,
    ).toBe(false);
  });
});

describe('parseCampaignUpdate', () => {
  it('accepts valid partial update', () => {
    const r = parseCampaignUpdate({ title: 'New Title' });
    expect(r).toEqual({ ok: true, value: { title: 'New Title' } });
  });
  it('rejects empty body', () => {
    expect(parseCampaignUpdate({}).ok).toBe(false);
  });
});

describe('listCampaigns', () => {
  it('returns a page for Employer Admin', async () => {
    const r = await listCampaigns({ repository: repo() }, admin, { limit: 25, cursor: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listCampaigns(
      { repository: repo() },
      { userId: 'u', tenantId: TENANT, roles: [] },
      { limit: 25, cursor: null },
    );
    expect(r.ok).toBe(false);
  });
});

describe('getCampaign', () => {
  it('returns a campaign for admin', async () => {
    const r = await getCampaign({ repository: repo() }, admin, 'camp-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await getCampaign(
      { repository: { ...repo(), getCampaign: () => Promise.resolve(null) } },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createCampaign', () => {
  it('creates for admin', async () => {
    const r = await createCampaign({ repository: repo() }, admin, {
      code: 'X',
      title: 'T',
      roleName: 'R',
      seniority: 'S',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo: CampaignRepository = {
      ...repo(),
      createCampaign: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    };
    const r = await createCampaign({ repository: dupRepo }, admin, {
      code: 'X',
      title: 'T',
      roleName: 'R',
      seniority: 'S',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('updateCampaign', () => {
  it('updates for admin', async () => {
    const r = await updateCampaign({ repository: repo() }, admin, 'camp-1', { title: 'New' });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await updateCampaign(
      { repository: { ...repo(), updateCampaign: () => Promise.resolve(null) } },
      admin,
      'missing',
      { title: 'X' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
