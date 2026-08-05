import { describe, it, expect } from 'vitest';
import { listReleases, type ReleaseRepository, type ReleaseRecord } from './admin-releases.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };

const release: ReleaseRecord = {
  id: '11111111-1111-1111-1111-111111111111',
  version: '2.0.0',
  channel: 'stable',
  notes: 'Initial GA',
  releasedAt: '2026-01-01T00:00:00.000Z',
};

function deps(overrides: Partial<ReleaseRepository> = {}) {
  return {
    repository: {
      listReleases: () => Promise.resolve({ items: [release], total: 1 }),
      ...overrides,
    } as ReleaseRepository,
  };
}

describe('listReleases', () => {
  it('returns items for platform staff', async () => {
    const r = await listReleases(deps(), staff);
    expect(r.ok && r.total).toBe(1);
  });
  it('denies a non-staff actor', async () => {
    const r = await listReleases(deps(), outsider);
    expect(r.ok).toBe(false);
  });
});
