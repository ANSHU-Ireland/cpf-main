import { describe, it, expect } from 'vitest';
import {
  listRiskControls,
  getRiskControl,
  createRiskControl,
  parseRiskControlCreate,
  parseRiskControlId,
} from './governance-risk-controls.js';
import type { RiskControlRepository, RiskControlRecord } from './governance-risk-controls.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const rc: RiskControlRecord = {
  id: 'r1',
  riskCode: 'RC1',
  harm: 'h',
  controlDescription: 'c',
  status: 'open',
  createdAt: '',
};

function repo(ov: Partial<RiskControlRepository> = {}): RiskControlRepository {
  return {
    listControls: () => Promise.resolve({ items: [rc], total: 1 }),
    getControl: () => Promise.resolve(rc),
    createControl: () => Promise.resolve(rc),
    ...ov,
  };
}

describe('parseRiskControlCreate', () => {
  it('valid', () =>
    expect(
      parseRiskControlCreate({
        riskCode: 'r',
        harm: 'h',
        cause: 'c',
        controlDescription: 'cd',
        testReference: 't',
        inherentLikelihood: 3,
        inherentSeverity: 4,
      }).ok,
    ).toBe(true));
  it('invalid', () => expect(parseRiskControlCreate({}).ok).toBe(false));
});
describe('parseRiskControlId', () => {
  it('uuid', () => expect(parseRiskControlId(T)).not.toBeNull());
});
describe('listRiskControls', () => {
  it('ok', async () =>
    expect((await listRiskControls({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listRiskControls({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('getRiskControl', () => {
  it('ok', async () =>
    expect((await getRiskControl({ repository: repo() }, admin, 'r1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getRiskControl(
          { repository: repo({ getControl: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('createRiskControl', () => {
  it('ok', async () =>
    expect(
      (
        await createRiskControl({ repository: repo() }, admin, {
          riskCode: 'r',
          harm: 'h',
          cause: 'c',
          controlDescription: 'cd',
          testReference: 't',
          inherentLikelihood: 3,
          inherentSeverity: 4,
        })
      ).ok,
    ).toBe(true));
});
