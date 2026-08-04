import { describe, it, expect } from 'vitest';
import type {
  Actor,
  ListProfilesResult,
  CreateProfileResult,
  GetProfileResult,
  UpdateProfileResult,
} from '@cpf/org';
import {
  handleGetReviewerProfiles,
  handlePostReviewerProfile,
  handleGetReviewerProfile,
  handlePatchReviewerProfile,
  type ReviewerProfileService,
} from './reviewer-profiles.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const profileDto = {
  id: 'prof-1',
  userId: 'user-1',
  expertise: ['typescript'],
  trainingStatus: 'not_started' as const,
  calibrationStatus: 'not_calibrated' as const,
  conflictDeclarationRequired: true,
  maxActiveReviews: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [profileDto], nextCursor: null, total: 1 };

function service(overrides: Partial<ReviewerProfileService> = {}): ReviewerProfileService {
  const listOk: ListProfilesResult = { ok: true, page };
  const createOk: CreateProfileResult = { ok: true, profile: profileDto };
  const getOk: GetProfileResult = { ok: true, profile: profileDto };
  const updateOk: UpdateProfileResult = { ok: true, profile: profileDto };
  return {
    listProfiles: () => Promise.resolve(listOk),
    createProfile: () => Promise.resolve(createOk),
    getProfile: () => Promise.resolve(getOk),
    updateProfile: () => Promise.resolve(updateOk),
    ...overrides,
  };
}

describe('handleGetReviewerProfiles', () => {
  it('returns 200 with page', async () => {
    const res = await handleGetReviewerProfiles(service(), { actor, query: {} });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid limit', async () => {
    const res = await handleGetReviewerProfiles(service(), { actor, query: { limit: '0' } });
    expect(res.status).toBe(422);
  });
  it('returns 403 on denied', async () => {
    const res = await handleGetReviewerProfiles(
      service({ listProfiles: () => Promise.resolve({ ok: false, status: 403, reason: 'no' }) }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostReviewerProfile', () => {
  it('returns 200 on success', async () => {
    const res = await handlePostReviewerProfile(service(), { actor, body: { userId: VALID_ID } });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostReviewerProfile(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate', async () => {
    const res = await handlePostReviewerProfile(
      service({ createProfile: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }) }),
      { actor, body: { userId: VALID_ID } },
    );
    expect(res.status).toBe(409);
  });
});

describe('handleGetReviewerProfile', () => {
  it('returns 200', async () => {
    const res = await handleGetReviewerProfile(service(), { actor, profileId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetReviewerProfile(service(), { actor, profileId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleGetReviewerProfile(
      service({ getProfile: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, profileId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePatchReviewerProfile', () => {
  it('returns 200 on success', async () => {
    const res = await handlePatchReviewerProfile(service(), {
      actor,
      profileId: VALID_ID,
      body: { expertise: ['python'] },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for empty body', async () => {
    const res = await handlePatchReviewerProfile(service(), {
      actor,
      profileId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePatchReviewerProfile(
      service({ updateProfile: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, profileId: VALID_ID, body: { expertise: ['go'] } },
    );
    expect(res.status).toBe(404);
  });
});
