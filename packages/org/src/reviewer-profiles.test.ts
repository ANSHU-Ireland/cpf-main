import { describe, it, expect } from 'vitest';
import {
  listReviewerProfiles,
  createReviewerProfile,
  getReviewerProfile,
  updateReviewerProfile,
  parseProfileListQuery,
  parseProfileCreate,
  parseProfileUpdate,
  parseProfileId,
} from './reviewer-profiles.js';
import type {
  ReviewerProfileRepository,
  ReviewerProfileListResult,
} from './reviewer-profile-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { ReviewerProfileRecord, ReviewerProfileCreate } from './reviewer-profile-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function profile(over: Partial<ReviewerProfileRecord> = {}): ReviewerProfileRecord {
  return {
    id: 'prof-1',
    userId: 'user-1',
    expertise: ['typescript', 'react'],
    trainingStatus: 'not_started',
    calibrationStatus: 'not_calibrated',
    conflictDeclarationRequired: true,
    maxActiveReviews: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<ReviewerProfileRepository> = {}): ReviewerProfileRepository {
  const listResult: ReviewerProfileListResult = { items: [profile()], total: 1, hasMore: false };
  return {
    listProfiles: () => Promise.resolve(listResult),
    getProfile: () => Promise.resolve(profile()),
    createProfile: (_a: Actor, input: ReviewerProfileCreate) =>
      Promise.resolve(profile({ userId: input.userId })),
    updateProfile: () => Promise.resolve(profile()),
    ...overrides,
  };
}

describe('parseProfileListQuery', () => {
  it('applies default limit', () => {
    expect(parseProfileListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseProfileListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('parseProfileCreate', () => {
  it('accepts valid input', () => {
    const r = parseProfileCreate({ userId: '11111111-1111-1111-1111-111111111111' });
    expect(r.ok).toBe(true);
  });
  it('accepts with expertise and maxActiveReviews', () => {
    const r = parseProfileCreate({
      userId: '11111111-1111-1111-1111-111111111111',
      expertise: ['ts'],
      maxActiveReviews: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.expertise).toEqual(['ts']);
      expect(r.value.maxActiveReviews).toBe(5);
    }
  });
  it('rejects invalid userId', () => {
    expect(parseProfileCreate({ userId: 'bad' }).ok).toBe(false);
  });
  it('rejects non-object', () => {
    expect(parseProfileCreate(null).ok).toBe(false);
  });
  it('rejects invalid expertise', () => {
    expect(
      parseProfileCreate({ userId: '11111111-1111-1111-1111-111111111111', expertise: 'bad' }).ok,
    ).toBe(false);
  });
});

describe('listReviewerProfiles', () => {
  it('returns page for admin', async () => {
    const r = await listReviewerProfiles({ repository: repo() }, admin, {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listReviewerProfiles({ repository: repo() }, noRole, {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(false);
  });
});

describe('createReviewerProfile', () => {
  it('creates for admin', async () => {
    const r = await createReviewerProfile({ repository: repo() }, admin, {
      userId: '11111111-1111-1111-1111-111111111111',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo = repo({
      createProfile: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await createReviewerProfile({ repository: dupRepo }, admin, {
      userId: '11111111-1111-1111-1111-111111111111',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
  it('denies non-admin', async () => {
    const r = await createReviewerProfile({ repository: repo() }, noRole, {
      userId: '11111111-1111-1111-1111-111111111111',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});

describe('parseProfileUpdate', () => {
  it('accepts expertise update', () => {
    const r = parseProfileUpdate({ expertise: ['python'] });
    expect(r.ok).toBe(true);
  });
  it('accepts maxActiveReviews null', () => {
    const r = parseProfileUpdate({ maxActiveReviews: null });
    expect(r.ok).toBe(true);
  });
  it('rejects empty body', () => {
    expect(parseProfileUpdate({}).ok).toBe(false);
  });
});

describe('parseProfileId', () => {
  it('accepts UUID', () => {
    expect(parseProfileId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects non-UUID', () => {
    expect(parseProfileId('bad')).toBeNull();
  });
});

describe('getReviewerProfile', () => {
  it('returns profile for admin', async () => {
    const r = await getReviewerProfile({ repository: repo() }, admin, 'prof-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await getReviewerProfile(
      { repository: repo({ getProfile: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('updateReviewerProfile', () => {
  it('updates for admin', async () => {
    const r = await updateReviewerProfile({ repository: repo() }, admin, 'prof-1', {
      expertise: ['go'],
    });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await updateReviewerProfile(
      { repository: repo({ updateProfile: () => Promise.resolve(null) }) },
      admin,
      'missing',
      { expertise: ['go'] },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
