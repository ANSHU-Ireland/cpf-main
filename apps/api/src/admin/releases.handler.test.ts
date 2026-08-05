import { describe, it, expect } from 'vitest';
import type { Actor, ReleaseRepository, ReleaseRecord } from '@cpf/org';
import { createReleaseService, handleListReleases } from './releases.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };

const release: ReleaseRecord = {
  id: '11111111-1111-1111-1111-111111111111',
  version: '2.0.0',
  channel: 'stable',
  notes: 'Initial GA',
  releasedAt: '2026-01-01T00:00:00.000Z',
};

function svc(overrides: Partial<ReleaseRepository> = {}) {
  return createReleaseService({
    repository: {
      listReleases: () => Promise.resolve({ items: [release], total: 1 }),
      ...overrides,
    } as ReleaseRepository,
  });
}

describe('handleListReleases', () => {
  it('returns 200 for platform staff', async () =>
    expect((await handleListReleases(svc(), { actor })).status).toBe(200));
  it('returns 403 for a non-staff actor', async () =>
    expect((await handleListReleases(svc(), { actor: outsider })).status).toBe(403));
});
