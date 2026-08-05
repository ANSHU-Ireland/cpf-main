import { describe, it, expect } from 'vitest';
import {
  getDeployerReadiness,
  updateDeployerReadiness,
  parseDeployerReadinessUpdate,
  type DeployerReadinessRepository,
  type DeployerReadinessRecord,
} from './deployer-readiness.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const rec: DeployerReadinessRecord = {
  tenantId: T,
  humanOversightConfirmed: true,
  monitoringConfirmed: true,
  recordKeepingConfirmed: true,
  status: 'ready',
  updatedAt: '',
};

function repo(ov: Partial<DeployerReadinessRepository> = {}): DeployerReadinessRepository {
  return {
    getReadiness: () => Promise.resolve(rec),
    updateReadiness: () => Promise.resolve(rec),
    ...ov,
  };
}

describe('parseDeployerReadinessUpdate', () => {
  it('valid', () =>
    expect(
      parseDeployerReadinessUpdate({
        humanOversightConfirmed: true,
        monitoringConfirmed: false,
        recordKeepingConfirmed: true,
      }).ok,
    ).toBe(true));
  it('invalid', () =>
    expect(parseDeployerReadinessUpdate({ humanOversightConfirmed: 'yes' }).ok).toBe(false));
});
describe('getDeployerReadiness', () => {
  it('ok', async () =>
    expect((await getDeployerReadiness({ repository: repo() }, admin)).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getDeployerReadiness(
          { repository: repo({ getReadiness: () => Promise.resolve(null) }) },
          admin,
        )
      ).ok,
    ).toBe(false));
  it('403', async () =>
    expect((await getDeployerReadiness({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('updateDeployerReadiness', () => {
  it('ok', async () =>
    expect(
      (
        await updateDeployerReadiness({ repository: repo() }, admin, {
          humanOversightConfirmed: true,
          monitoringConfirmed: true,
          recordKeepingConfirmed: true,
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await updateDeployerReadiness({ repository: repo() }, noRole, {
          humanOversightConfirmed: true,
          monitoringConfirmed: true,
          recordKeepingConfirmed: true,
        })
      ).ok,
    ).toBe(false));
});
