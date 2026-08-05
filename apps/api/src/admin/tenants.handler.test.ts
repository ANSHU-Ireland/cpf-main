import { describe, it, expect } from 'vitest';
import type { Actor, TenantRepository, TenantRecord, TenantStatusPreview } from '@cpf/org';
import {
  createTenantService,
  handleListTenants,
  handleGetTenant,
  handleCreateTenant,
  handleUpdateTenant,
  handleChangeTenantStatus,
  handlePreviewTenantStatus,
  handleChangeTenantSubscription,
} from './tenants.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
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
  effects: [],
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

function svc(overrides: Partial<TenantRepository> = {}) {
  return createTenantService({ repository: repo(overrides) });
}

describe('handleListTenants', () => {
  it('returns 200', async () =>
    expect((await handleListTenants(svc(), { actor })).status).toBe(200));
});

describe('handleGetTenant', () => {
  it('returns 200', async () =>
    expect((await handleGetTenant(svc(), { actor, tenantId: ID })).status).toBe(200));
  it('returns 422 for bad id', async () =>
    expect((await handleGetTenant(svc(), { actor, tenantId: 'bad' })).status).toBe(422));
  it('returns 404 when missing', async () => {
    const res = await handleGetTenant(svc({ getTenant: () => Promise.resolve(null) }), {
      actor,
      tenantId: ID,
    });
    expect(res.status).toBe(404);
  });
});

describe('handleCreateTenant', () => {
  it('returns 201', async () => {
    const res = await handleCreateTenant(svc(), {
      actor,
      body: { slug: 'a', legalName: 'A', dataRegion: 'eu' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () =>
    expect((await handleCreateTenant(svc(), { actor, body: {} })).status).toBe(422));
});

describe('handleUpdateTenant', () => {
  it('returns 200', async () => {
    const res = await handleUpdateTenant(svc(), { actor, tenantId: ID, body: { legalName: 'B' } });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleUpdateTenant(svc(), { actor, tenantId: ID, body: { status: 'x' } });
    expect(res.status).toBe(422);
  });
});

describe('handleChangeTenantStatus', () => {
  it('returns 200', async () => {
    const res = await handleChangeTenantStatus(svc(), {
      actor,
      tenantId: ID,
      body: { status: 'suspended', reason: 'x' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleChangeTenantStatus(svc(), {
      actor,
      tenantId: 'bad',
      body: { status: 'suspended', reason: 'x' },
    });
    expect(res.status).toBe(422);
  });
});

describe('handlePreviewTenantStatus', () => {
  it('returns 200', async () => {
    const res = await handlePreviewTenantStatus(svc(), {
      actor,
      tenantId: ID,
      body: { status: 'suspended', reason: 'x' },
    });
    expect(res.status).toBe(200);
  });
});

describe('handleChangeTenantSubscription', () => {
  it('returns 200', async () => {
    const res = await handleChangeTenantSubscription(svc(), {
      actor,
      tenantId: ID,
      body: { planId: ID },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleChangeTenantSubscription(svc(), {
      actor,
      tenantId: ID,
      body: { planId: 'x' },
    });
    expect(res.status).toBe(422);
  });
});
