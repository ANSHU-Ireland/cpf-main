import { describe, it, expect } from 'vitest';
import {
  listOnboarding,
  parseOnboardingQuery,
  parseOnboardingStepUpdate,
  updateOnboardingStep,
} from './onboarding.js';
import type { OnboardingRepository } from './onboarding-repository.js';
import type { OnboardingStepRecord, OnboardingStepUpdate } from './onboarding-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(over: Partial<OnboardingStepRecord> = {}): OnboardingStepRecord {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    roleCode: 'employer_user',
    stepCode: 'welcome',
    materialVersion: null,
    status: 'not_started',
    completedAt: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const validBody = { status: 'completed', roleCode: 'employer_user' };

function repo(
  list: { items: OnboardingStepRecord[]; total: number; hasMore: boolean },
  updated: OnboardingStepRecord | null,
  onUpdate?: (update: OnboardingStepUpdate) => void,
): OnboardingRepository {
  return {
    listOnboarding: () => Promise.resolve(list),
    updateStep: (_actor, update) => {
      onUpdate?.(update);
      return Promise.resolve(updated);
    },
  };
}

describe('parseOnboardingQuery', () => {
  it('applies defaults when nothing is supplied', () => {
    expect(parseOnboardingQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseOnboardingQuery({ limit: '0' }).ok).toBe(false);
    expect(parseOnboardingQuery({ limit: 101 }).ok).toBe(false);
  });

  it('rejects a malformed cursor', () => {
    expect(parseOnboardingQuery({ cursor: 'not-base64url-json' }).ok).toBe(false);
  });
});

describe('parseOnboardingStepUpdate', () => {
  it('accepts a valid path + body and defaults materialVersion to null', () => {
    const result = parseOnboardingStepUpdate('welcome', validBody);
    expect(result).toEqual({
      ok: true,
      value: {
        stepCode: 'welcome',
        roleCode: 'employer_user',
        materialVersion: null,
        status: 'completed',
      },
    });
  });

  it('carries an optional reason and materialVersion', () => {
    const result = parseOnboardingStepUpdate('welcome', {
      ...validBody,
      materialVersion: 'v2',
      reason: 'done reading',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.materialVersion).toBe('v2');
      expect(result.value.reason).toBe('done reading');
    }
  });

  it('rejects an empty stepCode', () => {
    expect(parseOnboardingStepUpdate('', validBody).ok).toBe(false);
  });

  it('rejects a missing roleCode', () => {
    expect(parseOnboardingStepUpdate('welcome', { status: 'completed' }).ok).toBe(false);
  });

  it('rejects a system-managed or unknown status', () => {
    expect(parseOnboardingStepUpdate('welcome', { ...validBody, status: 'expired' }).ok).toBe(
      false,
    );
    expect(parseOnboardingStepUpdate('welcome', { ...validBody, status: 'not_started' }).ok).toBe(
      false,
    );
    expect(parseOnboardingStepUpdate('welcome', { ...validBody, status: 'bogus' }).ok).toBe(false);
  });

  it('rejects unknown body properties', () => {
    expect(parseOnboardingStepUpdate('welcome', { ...validBody, bogus: 1 }).ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parseOnboardingStepUpdate('welcome', null).ok).toBe(false);
    expect(parseOnboardingStepUpdate('welcome', []).ok).toBe(false);
  });
});

describe('listOnboarding', () => {
  it('projects rows and omits nextCursor when there is no more data', async () => {
    const result = await listOnboarding(
      { repository: repo({ items: [record()], total: 1, hasMore: false }, null) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result).toEqual({
      ok: true,
      page: { items: [record()], nextCursor: null, total: 1 },
    });
  });

  it('emits an opaque nextCursor when more rows remain', async () => {
    const result = await listOnboarding(
      { repository: repo({ items: [record()], total: 5, hasMore: true }, null) },
      actor,
      { limit: 1, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).toBeTypeOf('string');
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await listOnboarding(
      { repository: repo({ items: [], total: 0, hasMore: false }, null), permissions: [] },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('updateOnboardingStep', () => {
  const update: OnboardingStepUpdate = {
    stepCode: 'welcome',
    roleCode: 'employer_user',
    materialVersion: null,
    status: 'completed',
  };

  it('applies the update and returns the stored step', async () => {
    let applied: OnboardingStepUpdate | undefined;
    const result = await updateOnboardingStep(
      {
        repository: repo(
          { items: [], total: 0, hasMore: false },
          record({ status: 'completed', completedAt: '2026-02-02T00:00:00.000Z' }),
          (u) => (applied = u),
        ),
      },
      actor,
      update,
    );
    expect(applied).toEqual(update);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.step.status).toBe('completed');
    }
  });

  it('returns 404 when no step matches', async () => {
    const result = await updateOnboardingStep(
      { repository: repo({ items: [], total: 0, hasMore: false }, null) },
      actor,
      update,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await updateOnboardingStep(
      { repository: repo({ items: [], total: 0, hasMore: false }, record()), permissions: [] },
      actor,
      update,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
