import { describe, it, expect } from 'vitest';
import { getOrganization, parseOrganizationQuery } from './organization.js';
import type { OrganizationRepository } from './organization-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor, OrganizationRecord } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };

function record(over: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: TENANT,
    slug: 'acme',
    legalName: 'Acme Ltd',
    displayName: 'Acme',
    status: 'active',
    dataRegion: 'EU',
    defaultTimezone: 'Europe/Dublin',
    branding: {},
    settings: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    suspendedAt: null,
    terminatedAt: null,
    ...over,
  };
}

function repo(org: OrganizationRecord | null): OrganizationRepository {
  return { getOrganization: () => Promise.resolve(org) };
}

describe('parseOrganizationQuery', () => {
  it('applies the default limit when nothing is supplied', () => {
    expect(parseOrganizationQuery({})).toEqual({ ok: true, value: { limit: 25 } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseOrganizationQuery({ limit: '0' }).ok).toBe(false);
    expect(parseOrganizationQuery({ limit: 101 }).ok).toBe(false);
  });

  it('rejects an over-long cursor', () => {
    expect(parseOrganizationQuery({ cursor: 'x'.repeat(513) }).ok).toBe(false);
  });
});

describe('getOrganization', () => {
  it('returns the caller-own organisation for an Employer Admin', async () => {
    const result = await getOrganization({ repository: repo(record()) }, admin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organization.id).toBe(TENANT);
      expect(result.organization.slug).toBe('acme');
    }
  });

  it('returns 404 when the organisation does not exist', async () => {
    const result = await getOrganization({ repository: repo(null) }, admin);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await getOrganization(
      { repository: repo(record()) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('denies (403) when the caller holds only an unrelated role', async () => {
    const result = await getOrganization(
      { repository: repo(record()) },
      { userId: 'user-3', tenantId: TENANT, roles: ['candidate'] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
