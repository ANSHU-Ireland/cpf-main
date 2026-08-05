import { describe, it, expect } from 'vitest';
import type { Actor, FeatureFlagRepository, FeatureFlagRecord } from '@cpf/org';
import {
  createFeatureFlagService,
  handleListFeatureFlags,
  handleCreateFeatureFlag,
  handleUpdateFeatureFlag,
} from './feature-flags.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const ID = '11111111-1111-1111-1111-111111111111';

const flag: FeatureFlagRecord = {
  id: ID,
  key: 'new.dashboard',
  description: 'New dashboard',
  enabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<FeatureFlagRepository> = {}): FeatureFlagRepository {
  return {
    listFlags: () => Promise.resolve({ items: [flag], total: 1 }),
    createFlag: () => Promise.resolve(flag),
    updateFlag: () => Promise.resolve(flag),
    ...overrides,
  };
}

function svc(overrides: Partial<FeatureFlagRepository> = {}) {
  return createFeatureFlagService({ repository: repo(overrides) });
}

describe('handleListFeatureFlags', () => {
  it('returns 200', async () =>
    expect((await handleListFeatureFlags(svc(), { actor })).status).toBe(200));
});

describe('handleCreateFeatureFlag', () => {
  it('returns 201', async () => {
    const res = await handleCreateFeatureFlag(svc(), {
      actor,
      body: { key: 'a', description: 'x', enabled: true },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () =>
    expect((await handleCreateFeatureFlag(svc(), { actor, body: { key: 'Bad Key' } })).status).toBe(
      422,
    ));
});

describe('handleUpdateFeatureFlag', () => {
  it('returns 200', async () => {
    const res = await handleUpdateFeatureFlag(svc(), {
      actor,
      flagId: ID,
      body: { enabled: true },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleUpdateFeatureFlag(svc(), {
      actor,
      flagId: 'bad',
      body: { enabled: true },
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when missing', async () => {
    const res = await handleUpdateFeatureFlag(svc({ updateFlag: () => Promise.resolve(null) }), {
      actor,
      flagId: ID,
      body: { enabled: true },
    });
    expect(res.status).toBe(404);
  });
});
