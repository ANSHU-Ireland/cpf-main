import { describe, it, expect } from 'vitest';
import type { Actor, ReviewerRepository } from '@cpf/account';
import {
  createReviewerService,
  handleGetMyReviewerProfile,
  handlePatchMyReviewerProfile,
  handleGetReviewerAvailability,
  handlePutReviewerAvailability,
  handleGetReviewerTraining,
} from './reviewer.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const profile = {
  userId: 'user-1',
  displayName: 'Review One',
  expertise: ['ml'],
  trainingStatus: 'passed',
  calibrationStatus: 'calibrated',
  conflictDeclarationRequired: true,
  maxActiveReviews: 5,
  updatedAt: '',
};
const window = {
  id: 'w1',
  availableFrom: '2026-08-17T09:00:00.000Z',
  availableTo: '2026-08-17T17:00:00.000Z',
  capacity: 4,
  status: 'available' as const,
  note: null,
};

function repo(overrides: Partial<ReviewerRepository> = {}): ReviewerRepository {
  return {
    getProfile: () => Promise.resolve(profile),
    updateProfile: () => Promise.resolve(profile),
    listAvailability: () => Promise.resolve({ items: [window], nextCursor: null, total: 1 }),
    replaceAvailability: () => Promise.resolve([window]),
    listTraining: () =>
      Promise.resolve({
        items: [
          {
            id: 't1',
            trainingType: 'bias-101',
            materialVersion: '1',
            status: 'passed',
            completedAt: '',
            expiresAt: null,
          },
        ],
        nextCursor: null,
        total: 1,
      }),
    ...overrides,
  };
}

function svc(overrides: Partial<ReviewerRepository> = {}) {
  return createReviewerService({ repository: repo(overrides) });
}

describe('reviewer handlers', () => {
  it('getProfile 200 / 404', async () => {
    expect((await handleGetMyReviewerProfile(svc(), { actor })).status).toBe(200);
    expect(
      (
        await handleGetMyReviewerProfile(svc({ getProfile: () => Promise.resolve(null) }), {
          actor,
        })
      ).status,
    ).toBe(404);
  });
  it('patchProfile 200 / 422', async () => {
    expect(
      (await handlePatchMyReviewerProfile(svc(), { actor, body: { maxActiveReviews: 3 } })).status,
    ).toBe(200);
    expect((await handlePatchMyReviewerProfile(svc(), { actor, body: {} })).status).toBe(422);
  });
  it('getAvailability 200', async () =>
    expect((await handleGetReviewerAvailability(svc(), { actor, query: {} })).status).toBe(200));
  it('putAvailability 200 / 422', async () => {
    expect(
      (
        await handlePutReviewerAvailability(svc(), {
          actor,
          body: {
            windows: [
              {
                availableFrom: '2026-08-17T09:00:00Z',
                availableTo: '2026-08-17T17:00:00Z',
                capacity: 4,
                status: 'available',
              },
            ],
          },
        })
      ).status,
    ).toBe(200);
    expect(
      (await handlePutReviewerAvailability(svc(), { actor, body: { windows: 'x' } })).status,
    ).toBe(422);
  });
  it('getTraining 200', async () =>
    expect((await handleGetReviewerTraining(svc(), { actor, query: {} })).status).toBe(200));
});
