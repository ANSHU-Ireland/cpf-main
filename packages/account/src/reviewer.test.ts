import { describe, it, expect } from 'vitest';
import {
  parseReviewerListQuery,
  parseReviewerProfileUpdate,
  parseAvailabilityReplace,
  getReviewerProfile,
  updateReviewerProfile,
  listReviewerAvailability,
  replaceReviewerAvailability,
  listReviewerTraining,
  type ReviewerRepository,
  type ReviewerProfileRecord,
  type ReviewerAvailabilityWindow,
  type ReviewerAvailabilityPage,
  type ReviewerTrainingPage,
} from './reviewer.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const profile: ReviewerProfileRecord = {
  userId: 'user-1',
  expertise: ['ml'],
  qualifications: ['phd'],
  languages: ['en'],
  maxConcurrent: 5,
  updatedAt: '',
};
const window: ReviewerAvailabilityWindow = {
  id: 'w1',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
};
const availabilityPage: ReviewerAvailabilityPage = { items: [window], nextCursor: null, total: 1 };
const trainingPage: ReviewerTrainingPage = {
  items: [
    { id: 't1', moduleCode: 'bias-101', status: 'completed', completedAt: '', expiresAt: null },
  ],
  nextCursor: null,
  total: 1,
};

function repo(overrides: Partial<ReviewerRepository> = {}): { repository: ReviewerRepository } {
  return {
    repository: {
      getProfile: () => Promise.resolve(profile),
      updateProfile: () => Promise.resolve(profile),
      listAvailability: () => Promise.resolve(availabilityPage),
      replaceAvailability: () => Promise.resolve([window]),
      listTraining: () => Promise.resolve(trainingPage),
      ...overrides,
    },
  };
}

const deny = { permissions: [] };

describe('parsers', () => {
  it('parseReviewerListQuery defaults limit', () => {
    const r = parseReviewerListQuery({});
    expect(r.ok && r.value.limit).toBe(25);
    expect(parseReviewerListQuery({ limit: 101 }).ok).toBe(false);
  });
  it('parseReviewerProfileUpdate validates fields', () => {
    expect(parseReviewerProfileUpdate({ expertise: ['ml'], maxConcurrent: 3 }).ok).toBe(true);
    expect(parseReviewerProfileUpdate({}).ok).toBe(false);
    expect(parseReviewerProfileUpdate({ maxConcurrent: -1 }).ok).toBe(false);
    expect(parseReviewerProfileUpdate({ nope: 1 }).ok).toBe(false);
  });
  it('parseAvailabilityReplace validates windows', () => {
    expect(
      parseAvailabilityReplace({
        windows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      }).ok,
    ).toBe(true);
    expect(parseAvailabilityReplace({ windows: 'x' }).ok).toBe(false);
    expect(
      parseAvailabilityReplace({
        windows: [{ dayOfWeek: 9, startTime: '09:00', endTime: '17:00' }],
      }).ok,
    ).toBe(false);
    expect(
      parseAvailabilityReplace({
        windows: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }],
      }).ok,
    ).toBe(false);
  });
});

describe('reviewer operations', () => {
  it('getReviewerProfile returns the profile, 404 when missing, 403 when denied', async () => {
    expect((await getReviewerProfile(repo(), actor)).ok).toBe(true);
    const missing = await getReviewerProfile(
      repo({ getProfile: () => Promise.resolve(null) }),
      actor,
    );
    expect(missing.ok === false && missing.status).toBe(404);
    const denied = await getReviewerProfile({ ...repo(), ...deny }, actor);
    expect(denied.ok === false && denied.status).toBe(403);
  });
  it('updateReviewerProfile returns the profile', async () => {
    const ok = await updateReviewerProfile(repo(), actor, { maxConcurrent: 3 });
    expect(ok.ok && ok.profile.maxConcurrent).toBe(5);
    const denied = await updateReviewerProfile({ ...repo(), ...deny }, actor, { maxConcurrent: 3 });
    expect(denied.ok === false && denied.status).toBe(403);
  });
  it('listReviewerAvailability returns a page', async () => {
    const ok = await listReviewerAvailability(repo(), actor, { limit: 25, cursor: null });
    expect(ok.ok && ok.page.total).toBe(1);
  });
  it('replaceReviewerAvailability returns windows', async () => {
    const ok = await replaceReviewerAvailability(repo(), actor, {
      windows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });
    expect(ok.ok && ok.windows.length).toBe(1);
  });
  it('listReviewerTraining returns a page', async () => {
    const ok = await listReviewerTraining(repo(), actor, { limit: 25, cursor: null });
    expect(ok.ok && ok.page.total).toBe(1);
  });
});
