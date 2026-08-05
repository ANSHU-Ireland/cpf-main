import { describe, it, expect } from 'vitest';
import type { Actor, DeployerReadinessRepository, DeployerReadinessRecord } from '@cpf/org';
import {
  createDeployerReadinessService,
  handleGetDeployerReadiness,
  handleUpdateDeployerReadiness,
} from './deployer-readiness.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const record: DeployerReadinessRecord = {
  tenantId: 'tenant-1',
  humanOversightConfirmed: true,
  monitoringConfirmed: true,
  recordKeepingConfirmed: true,
  status: 'ready',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<DeployerReadinessRepository> = {}): DeployerReadinessRepository {
  return {
    getReadiness: () => Promise.resolve(record),
    updateReadiness: () => Promise.resolve(record),
    ...overrides,
  };
}

function svc(overrides: Partial<DeployerReadinessRepository> = {}) {
  return createDeployerReadinessService({ repository: repo(overrides) });
}

describe('handleGetDeployerReadiness', () => {
  it('returns 200', async () => {
    const res = await handleGetDeployerReadiness(svc(), { actor });
    expect(res.status).toBe(200);
  });
  it('returns 404 when missing', async () => {
    const res = await handleGetDeployerReadiness(
      svc({ getReadiness: () => Promise.resolve(null) }),
      { actor },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleUpdateDeployerReadiness', () => {
  it('returns 200', async () => {
    const res = await handleUpdateDeployerReadiness(svc(), {
      actor,
      body: {
        humanOversightConfirmed: true,
        monitoringConfirmed: true,
        recordKeepingConfirmed: true,
      },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleUpdateDeployerReadiness(svc(), {
      actor,
      body: { humanOversightConfirmed: 'x' },
    });
    expect(res.status).toBe(422);
  });
});
