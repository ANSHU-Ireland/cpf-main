import { describe, it, expect } from 'vitest';
import {
  listDecisions,
  getDecision,
  approveDecision,
  issueDecision,
  parseDecisionCreate,
  parseDecisionId,
} from './decisions.js';
import type { DecisionRepository, DecisionRecord, DecisionApprovalRecord } from './decisions.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const A = '33333333-3333-3333-3333-333333333333';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const dec: DecisionRecord = {
  id: 'd1',
  applicationId: A,
  decision: 'progress',
  rationale: 'r',
  decidedBy: U,
  createdAt: '',
};
const appr: DecisionApprovalRecord = {
  id: 'a1',
  decisionId: 'd1',
  requiredRole: 'manager',
  status: 'approved',
  approvedBy: U,
  createdAt: '',
};

function repo(ov: Partial<DecisionRepository> = {}): DecisionRepository {
  return {
    listDecisions: () => Promise.resolve({ items: [dec], total: 1 }),
    getDecision: () => Promise.resolve(dec),
    approveDecision: () => Promise.resolve(appr),
    issueDecision: () => Promise.resolve(dec),
    ...ov,
  };
}

describe('parseDecisionCreate', () => {
  it('valid', () =>
    expect(parseDecisionCreate({ applicationId: A, decision: 'progress', rationale: 'r' }).ok).toBe(
      true,
    ));
  it('invalid', () => expect(parseDecisionCreate({}).ok).toBe(false));
});
describe('parseDecisionId', () => {
  it('uuid', () => expect(parseDecisionId(T)).not.toBeNull());
});
describe('listDecisions', () => {
  it('ok', async () => expect((await listDecisions({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listDecisions({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('getDecision', () => {
  it('ok', async () =>
    expect((await getDecision({ repository: repo() }, admin, 'd1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getDecision(
          { repository: repo({ getDecision: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('approveDecision', () => {
  it('ok', async () =>
    expect((await approveDecision({ repository: repo() }, admin, 'd1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await approveDecision(
          { repository: repo({ approveDecision: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('issueDecision', () => {
  it('ok', async () =>
    expect(
      (
        await issueDecision({ repository: repo() }, admin, {
          applicationId: A,
          decision: 'progress',
          rationale: 'r',
        })
      ).ok,
    ).toBe(true));
});
