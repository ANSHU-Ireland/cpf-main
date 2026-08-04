import { describe, it, expect } from 'vitest';
import {
  listCampaignReviewers,
  addCampaignReviewer,
  deactivateCampaignReviewer,
  updateCampaignReviewer,
  parseReviewerListQuery,
  parseReviewerCreate,
  parseReviewerUpdate,
  parseReviewerId,
} from './campaign-reviewers.js';
import type {
  CampaignReviewerRepository,
  CampaignReviewerListResult,
} from './campaign-reviewer-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type {
  CampaignReviewerRecord,
  CampaignReviewerCreate,
  CampaignReviewerUpdate,
} from './campaign-reviewer-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function rev(over: Partial<CampaignReviewerRecord> = {}): CampaignReviewerRecord {
  return {
    id: 'rev-1',
    campaignId: 'camp-1',
    reviewerProfileId: 'prof-1',
    role: 'primary',
    conflictStatus: 'pending',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<CampaignReviewerRepository> = {}): CampaignReviewerRepository {
  const listResult: CampaignReviewerListResult = { items: [rev()], total: 1, hasMore: false };
  return {
    listReviewers: () => Promise.resolve(listResult),
    addReviewer: (_a: Actor, _c: string, input: CampaignReviewerCreate) =>
      Promise.resolve(rev({ reviewerProfileId: input.reviewerProfileId, role: input.role })),
    deactivateReviewer: () => Promise.resolve(rev({ active: false })),
    updateReviewer: (_a: Actor, _c: string, _id: string, input: CampaignReviewerUpdate) =>
      Promise.resolve(
        rev({ role: input.role ?? 'primary', conflictStatus: input.conflictStatus ?? 'pending' }),
      ),
    ...overrides,
  };
}

describe('parseReviewerListQuery', () => {
  it('applies default limit', () => {
    expect(parseReviewerListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseReviewerListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('parseReviewerCreate', () => {
  it('accepts valid input', () => {
    const r = parseReviewerCreate({
      reviewerProfileId: '11111111-1111-1111-1111-111111111111',
      role: 'primary',
    });
    expect(r.ok).toBe(true);
  });
  it('rejects invalid role', () => {
    expect(
      parseReviewerCreate({
        reviewerProfileId: '11111111-1111-1111-1111-111111111111',
        role: 'unknown',
      }).ok,
    ).toBe(false);
  });
  it('rejects missing fields', () => {
    expect(parseReviewerCreate({}).ok).toBe(false);
  });
});

describe('parseReviewerUpdate', () => {
  it('accepts role update', () => {
    const r = parseReviewerUpdate({ role: 'secondary' });
    expect(r).toEqual({ ok: true, value: { role: 'secondary' } });
  });
  it('accepts conflictStatus update', () => {
    const r = parseReviewerUpdate({ conflictStatus: 'clear' });
    expect(r).toEqual({ ok: true, value: { conflictStatus: 'clear' } });
  });
  it('rejects empty body', () => {
    expect(parseReviewerUpdate({}).ok).toBe(false);
  });
  it('rejects invalid conflictStatus', () => {
    expect(parseReviewerUpdate({ conflictStatus: 'bad' }).ok).toBe(false);
  });
});

describe('parseReviewerId', () => {
  it('accepts UUID', () => {
    expect(parseReviewerId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects non-UUID', () => {
    expect(parseReviewerId('bad')).toBeNull();
  });
});

describe('listCampaignReviewers', () => {
  it('returns page for admin', async () => {
    const r = await listCampaignReviewers({ repository: repo() }, admin, 'camp-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listCampaignReviewers({ repository: repo() }, noRole, 'camp-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});

describe('addCampaignReviewer', () => {
  it('adds reviewer for admin', async () => {
    const r = await addCampaignReviewer({ repository: repo() }, admin, 'camp-1', {
      reviewerProfileId: 'prof-1',
      role: 'primary',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo = repo({
      addReviewer: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await addCampaignReviewer({ repository: dupRepo }, admin, 'camp-1', {
      reviewerProfileId: 'prof-1',
      role: 'primary',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('deactivateCampaignReviewer', () => {
  it('deactivates for admin', async () => {
    const r = await deactivateCampaignReviewer({ repository: repo() }, admin, 'camp-1', 'rev-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.reviewer.active).toBe(false);
  });
  it('returns 404 when not found', async () => {
    const r = await deactivateCampaignReviewer(
      { repository: repo({ deactivateReviewer: () => Promise.resolve(null) }) },
      admin,
      'camp-1',
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('updateCampaignReviewer', () => {
  it('updates for admin', async () => {
    const r = await updateCampaignReviewer({ repository: repo() }, admin, 'camp-1', 'rev-1', {
      role: 'secondary',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await updateCampaignReviewer(
      { repository: repo({ updateReviewer: () => Promise.resolve(null) }) },
      admin,
      'camp-1',
      'missing',
      { role: 'secondary' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
