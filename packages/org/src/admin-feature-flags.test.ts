import { describe, it, expect } from 'vitest';
import {
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  parseFeatureFlagCreate,
  parseFeatureFlagUpdate,
  parseFeatureFlagId,
  type FeatureFlagRepository,
  type FeatureFlagRecord,
} from './admin-feature-flags.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
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

function deps(overrides: Partial<FeatureFlagRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseFeatureFlagCreate', () => {
  it('accepts valid input', () => {
    expect(
      parseFeatureFlagCreate({ key: 'new.dashboard', description: 'x', enabled: true }).ok,
    ).toBe(true);
  });
  it('rejects a bad key', () => {
    expect(parseFeatureFlagCreate({ key: 'Bad Key', description: 'x', enabled: true }).ok).toBe(
      false,
    );
  });
  it('rejects a non-boolean enabled', () => {
    expect(parseFeatureFlagCreate({ key: 'a', description: 'x', enabled: 'yes' }).ok).toBe(false);
  });
});

describe('parseFeatureFlagUpdate', () => {
  it('accepts a boolean', () => expect(parseFeatureFlagUpdate({ enabled: true }).ok).toBe(true));
  it('rejects a non-boolean', () =>
    expect(parseFeatureFlagUpdate({ enabled: 'x' }).ok).toBe(false));
});

describe('parseFeatureFlagId', () => {
  it('accepts a UUID', () => expect(parseFeatureFlagId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseFeatureFlagId('nope')).toBeNull());
});

describe('listFeatureFlags', () => {
  it('returns items for platform staff', async () => {
    const r = await listFeatureFlags(deps(), staff);
    expect(r.ok && r.total).toBe(1);
  });
  it('denies a non-staff actor', async () =>
    expect((await listFeatureFlags(deps(), outsider)).ok).toBe(false));
});

describe('createFeatureFlag', () => {
  it('creates a flag', async () => {
    expect(
      (await createFeatureFlag(deps(), staff, { key: 'a', description: 'x', enabled: true })).ok,
    ).toBe(true);
  });
  it('denies a non-staff actor', async () => {
    const r = await createFeatureFlag(deps(), outsider, {
      key: 'a',
      description: 'x',
      enabled: true,
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('updateFeatureFlag', () => {
  it('updates a flag', async () => {
    expect((await updateFeatureFlag(deps(), staff, ID, { enabled: true })).ok).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await updateFeatureFlag(
      deps({ updateFlag: () => Promise.resolve(null) }),
      staff,
      ID,
      { enabled: true },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
