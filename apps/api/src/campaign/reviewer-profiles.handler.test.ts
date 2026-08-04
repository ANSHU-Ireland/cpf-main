import { describe, it, expect } from 'vitest';
import type { Actor, ListProfilesResult, CreateProfileResult } from '@cpf/org';
import {
  handleGetReviewerProfiles,
  handlePostReviewerProfile,
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
  return {
    listProfiles: () => Promise.resolve(listOk),
    createProfile: () => Promise.resolve(createOk),
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
