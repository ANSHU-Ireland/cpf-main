import { describe, it, expect } from 'vitest';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  changeTenantStatus,
  previewTenantStatus,
  changeTenantSubscription,
  parseTenantCreate,
  parseTenantUpdate,
  parseTenantStatusChange,
  parseTenantSubscriptionChange,
  parseTenantId,
  type TenantRepository,
  type TenantRecord,
  type TenantStatusPreview,
} from './admin-tenants.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const systemAdmin: Actor = { userId: 'u3', tenantId: 't1', roles: ['system_admin'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const tenant: TenantRecord = {
  id: ID,
  slug: 'acme',
  legalName: 'Acme Inc',
  status: 'active',
  dataRegion: 'eu',
  subscriptionPlanId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const preview: TenantStatusPreview = {
  currentStatus: 'active',
  targetStatus: 'suspended',
  allowed: true,
  effects: ['sessions revoked'],
};

function repo(overrides: Partial<TenantRepository> = {}): TenantRepository {
  return {
    listTenants: () => Promise.resolve({ items: [tenant], total: 1 }),
    getTenant: () => Promise.resolve(tenant),
    createTenant: () => Promise.resolve(tenant),
    updateTenant: () => Promise.resolve(tenant),
    changeTenantStatus: () => Promise.resolve(tenant),
    previewTenantStatus: () => Promise.resolve(preview),
    changeTenantSubscription: () => Promise.resolve(tenant),
    ...overrides,
  };
}

function deps(overrides: Partial<TenantRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseTenantCreate', () => {
  it('accepts a valid body', () => {
    const r = parseTenantCreate({ slug: 'acme', legalName: 'Acme', dataRegion: 'eu' });
    expect(r.ok).toBe(true);
  });
  it('rejects a bad slug', () => {
    const r = parseTenantCreate({ slug: 'Bad Slug', legalName: 'Acme', dataRegion: 'eu' });
    expect(r.ok).toBe(false);
  });
  it('rejects a non-object', () => {
    expect(parseTenantCreate(null).ok).toBe(false);
  });
});

describe('parseTenantUpdate', () => {
  it('accepts a partial update', () => {
    const r = parseTenantUpdate({ legalName: 'New' });
    expect(r.ok).toBe(true);
  });
  it('rejects unknown keys', () => {
    expect(parseTenantUpdate({ status: 'active' }).ok).toBe(false);
  });
  it('rejects an empty patch', () => {
    expect(parseTenantUpdate({}).ok).toBe(false);
  });
});

describe('parseTenantStatusChange', () => {
  it('accepts a valid change', () => {
    expect(parseTenantStatusChange({ status: 'suspended', reason: 'abuse' }).ok).toBe(true);
  });
  it('rejects an invalid status', () => {
    expect(parseTenantStatusChange({ status: 'nope', reason: 'x' }).ok).toBe(false);
  });
});

describe('parseTenantSubscriptionChange', () => {
  it('accepts a UUID planId', () => {
    expect(parseTenantSubscriptionChange({ planId: ID }).ok).toBe(true);
  });
  it('rejects a non-UUID planId', () => {
    expect(parseTenantSubscriptionChange({ planId: 'x' }).ok).toBe(false);
  });
});

describe('parseTenantId', () => {
  it('accepts a UUID', () => expect(parseTenantId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseTenantId('nope')).toBeNull());
});

describe('listTenants', () => {
  it('returns items for platform staff', async () => {
    const r = await listTenants(deps(), staff);
    expect(r.ok && r.total).toBe(1);
  });
  it('returns items for a system administrator', async () => {
    const r = await listTenants(deps(), systemAdmin);
    expect(r.ok && r.total).toBe(1);
  });
  it('denies a non-staff actor', async () => {
    const r = await listTenants(deps(), outsider);
    expect(r.ok).toBe(false);
  });
});

describe('getTenant', () => {
  it('returns a tenant', async () => {
    const r = await getTenant(deps(), staff, ID);
    expect(r.ok).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await getTenant(deps({ getTenant: () => Promise.resolve(null) }), staff, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('createTenant', () => {
  it('creates a tenant', async () => {
    const r = await createTenant(deps(), staff, { slug: 'a', legalName: 'A', dataRegion: 'eu' });
    expect(r.ok).toBe(true);
  });
  it('denies a non-staff actor', async () => {
    const r = await createTenant(deps(), outsider, { slug: 'a', legalName: 'A', dataRegion: 'eu' });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('updateTenant', () => {
  it('updates a tenant', async () => {
    const r = await updateTenant(deps(), staff, ID, { legalName: 'B' });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await updateTenant(deps({ updateTenant: () => Promise.resolve(null) }), staff, ID, {
      legalName: 'B',
    });
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('changeTenantStatus', () => {
  it('changes status', async () => {
    const r = await changeTenantStatus(deps(), staff, ID, { status: 'suspended', reason: 'x' });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await changeTenantStatus(
      deps({ changeTenantStatus: () => Promise.resolve(null) }),
      staff,
      ID,
      {
        status: 'suspended',
        reason: 'x',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('previewTenantStatus', () => {
  it('returns a preview', async () => {
    const r = await previewTenantStatus(deps(), staff, ID, { status: 'suspended', reason: 'x' });
    expect(r.ok && r.preview.allowed).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await previewTenantStatus(
      deps({ previewTenantStatus: () => Promise.resolve(null) }),
      staff,
      ID,
      {
        status: 'suspended',
        reason: 'x',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('changeTenantSubscription', () => {
  it('changes subscription', async () => {
    const r = await changeTenantSubscription(deps(), staff, ID, { planId: ID });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await changeTenantSubscription(
      deps({ changeTenantSubscription: () => Promise.resolve(null) }),
      staff,
      ID,
      { planId: ID },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
