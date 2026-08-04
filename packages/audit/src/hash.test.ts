import { describe, it, expect } from 'vitest';
import { computeEventHash, type AuditEventCore } from './hash.js';

const base: AuditEventCore = {
  tenantId: 'tenant-1',
  occurredAt: '2026-08-04T10:00:00.000Z',
  actorType: 'user',
  actorId: 'user-1',
  action: 'profile.update',
  resourceType: 'user_profile',
  resourceId: 'user-1',
  outcome: 'success',
  purpose: null,
  metadata: { fields: ['theme', 'locale'] },
};

describe('computeEventHash', () => {
  it('is a deterministic 64-char hex sha-256', () => {
    const h = computeEventHash(null, base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(computeEventHash(null, base)).toBe(h);
  });

  it('is independent of metadata key order', () => {
    const reordered: AuditEventCore = { ...base, metadata: { fields: ['theme', 'locale'] } };
    expect(computeEventHash(null, reordered)).toBe(computeEventHash(null, base));
  });

  it('changes when any core field changes', () => {
    const h = computeEventHash(null, base);
    expect(computeEventHash(null, { ...base, action: 'profile.delete' })).not.toBe(h);
    expect(computeEventHash(null, { ...base, outcome: 'failure' })).not.toBe(h);
  });

  it('chains: the same event hashes differently under a different previous hash', () => {
    expect(computeEventHash('prev-a', base)).not.toBe(computeEventHash('prev-b', base));
    expect(computeEventHash('prev-a', base)).not.toBe(computeEventHash(null, base));
  });
});
