import { describe, it, expect } from 'vitest';
import type { Actor, ListOnboardingResult, UpdateOnboardingStepResult } from '@cpf/account';
import {
  handleGetMeOnboarding,
  handlePutMeOnboardingStep,
  type OnboardingService,
} from './onboarding.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const page: ListOnboardingResult = {
  ok: true,
  page: {
    items: [
      {
        id: 's1',
        roleCode: 'employer_user',
        stepCode: 'welcome',
        materialVersion: null,
        status: 'in_progress',
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    total: 1,
  },
};

const updated: UpdateOnboardingStepResult = {
  ok: true,
  step: {
    id: 's1',
    roleCode: 'employer_user',
    stepCode: 'welcome',
    materialVersion: null,
    status: 'completed',
    completedAt: '2026-02-02T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  },
};

function service(
  list: ListOnboardingResult,
  update: UpdateOnboardingStepResult,
): OnboardingService {
  return {
    listOnboarding: () => Promise.resolve(list),
    updateStep: () => Promise.resolve(update),
  };
}

const validBody = { status: 'completed', roleCode: 'employer_user' };

describe('handleGetMeOnboarding', () => {
  it('returns 200 with the onboarding page and echoes the correlation id', async () => {
    const res = await handleGetMeOnboarding(service(page, updated), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeOnboarding(service(page, updated), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMeOnboarding(
      service({ ok: false, status: 403, reason: 'denied' }, updated),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePutMeOnboardingStep', () => {
  it('returns 200 with the updated step', async () => {
    const res = await handlePutMeOnboardingStep(service(page, updated), {
      actor,
      stepCode: 'welcome',
      body: validBody,
      correlationId: 'corr-2',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-2');
    expect(res.body).toEqual(updated.step);
  });

  it('returns 422 for a bad body', async () => {
    const res = await handlePutMeOnboardingStep(service(page, updated), {
      actor,
      stepCode: 'welcome',
      body: { status: 'expired', roleCode: 'employer_user' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 404 result to problem+json', async () => {
    const res = await handlePutMeOnboardingStep(
      service(page, { ok: false, status: 404, reason: 'onboarding step not found' }),
      { actor, stepCode: 'welcome', body: validBody },
    );
    expect(res.status).toBe(404);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handlePutMeOnboardingStep(
      service(page, { ok: false, status: 403, reason: 'denied' }),
      { actor, stepCode: 'welcome', body: validBody },
    );
    expect(res.status).toBe(403);
  });
});
