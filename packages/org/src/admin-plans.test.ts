import { describe, it, expect } from 'vitest';
import {
  listPlans,
  createPlan,
  updatePlan,
  parsePlanCreate,
  parsePlanUpdate,
  parsePlanId,
  type PlanRepository,
  type PlanRecord,
} from './admin-plans.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const plan: PlanRecord = {
  id: ID,
  code: 'PRO',
  name: 'Pro',
  priceCents: 9900,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<PlanRepository> = {}): PlanRepository {
  return {
    listPlans: () => Promise.resolve({ items: [plan], total: 1 }),
    createPlan: () => Promise.resolve(plan),
    updatePlan: () => Promise.resolve(plan),
    ...overrides,
  };
}

function deps(overrides: Partial<PlanRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parsePlanCreate', () => {
  it('accepts valid input', () =>
    expect(parsePlanCreate({ code: 'PRO', name: 'Pro', priceCents: 100 }).ok).toBe(true));
  it('rejects a bad code', () =>
    expect(parsePlanCreate({ code: 'pro', name: 'Pro', priceCents: 100 }).ok).toBe(false));
  it('rejects a negative price', () => {
    expect(parsePlanCreate({ code: 'PRO', name: 'Pro', priceCents: -1 }).ok).toBe(false);
  });
});

describe('parsePlanUpdate', () => {
  it('accepts a partial update', () => expect(parsePlanUpdate({ active: false }).ok).toBe(true));
  it('rejects unknown keys', () => expect(parsePlanUpdate({ code: 'X' }).ok).toBe(false));
  it('rejects an empty patch', () => expect(parsePlanUpdate({}).ok).toBe(false));
});

describe('parsePlanId', () => {
  it('accepts a UUID', () => expect(parsePlanId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parsePlanId('nope')).toBeNull());
});

describe('listPlans', () => {
  it('returns items for platform staff', async () => {
    const r = await listPlans(deps(), staff);
    expect(r.ok && r.total).toBe(1);
  });
  it('denies a non-staff actor', async () =>
    expect((await listPlans(deps(), outsider)).ok).toBe(false));
});

describe('createPlan', () => {
  it('creates a plan', async () => {
    expect(
      (await createPlan(deps(), staff, { code: 'PRO', name: 'Pro', priceCents: 100 })).ok,
    ).toBe(true);
  });
  it('denies a non-staff actor', async () => {
    const r = await createPlan(deps(), outsider, { code: 'PRO', name: 'Pro', priceCents: 100 });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('updatePlan', () => {
  it('updates a plan', async () =>
    expect((await updatePlan(deps(), staff, ID, { active: false })).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await updatePlan(deps({ updatePlan: () => Promise.resolve(null) }), staff, ID, {
      active: false,
    });
    expect(r.ok === false && r.status).toBe(404);
  });
});
