import { describe, it, expect } from 'vitest';
import type { Actor, PlanRepository, PlanRecord } from '@cpf/org';
import {
  createPlanService,
  handleListPlans,
  handleCreatePlan,
  handleUpdatePlan,
} from './plans.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
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

function svc(overrides: Partial<PlanRepository> = {}) {
  return createPlanService({ repository: repo(overrides) });
}

describe('handleListPlans', () => {
  it('returns 200', async () => expect((await handleListPlans(svc(), { actor })).status).toBe(200));
});

describe('handleCreatePlan', () => {
  it('returns 201', async () => {
    const res = await handleCreatePlan(svc(), {
      actor,
      body: { code: 'PRO', name: 'Pro', priceCents: 100 },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () =>
    expect((await handleCreatePlan(svc(), { actor, body: {} })).status).toBe(422));
});

describe('handleUpdatePlan', () => {
  it('returns 200', async () => {
    const res = await handleUpdatePlan(svc(), { actor, planId: ID, body: { active: false } });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleUpdatePlan(svc(), { actor, planId: 'bad', body: { active: false } });
    expect(res.status).toBe(422);
  });
  it('returns 404 when missing', async () => {
    const res = await handleUpdatePlan(svc({ updatePlan: () => Promise.resolve(null) }), {
      actor,
      planId: ID,
      body: { active: false },
    });
    expect(res.status).toBe(404);
  });
});
