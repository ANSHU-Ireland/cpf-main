import { describe, expect, it } from 'vitest';
import {
  approveDecision,
  createDecision,
  getDecisionContext,
  issueDecision,
  parseDecisionApproval,
  parseDecisionCreate,
  type DecisionContext,
  type DecisionRecord,
  type DecisionRepository,
} from './decisions.js';
import type { Actor } from './types.js';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const DRAFTER_ID = '22222222-2222-4222-8222-222222222222';
const APPROVER_ID = '33333333-3333-4333-8333-333333333333';
const APPLICATION_ID = '44444444-4444-4444-8444-444444444444';
const DECISION_ID = '55555555-5555-4555-8555-555555555555';

const admin: Actor = {
  tenantId: TENANT_ID,
  userId: DRAFTER_ID,
  roles: ['employer_admin'],
};
const approver: Actor = {
  tenantId: TENANT_ID,
  userId: APPROVER_ID,
  roles: ['employer_admin', 'employer_admin_approver'],
};
const viewer: Actor = { tenantId: TENANT_ID, userId: APPROVER_ID, roles: ['viewer'] };

const decision: DecisionRecord = {
  id: DECISION_ID,
  applicationId: APPLICATION_ID,
  reportId: null,
  decision: 'progress',
  rationale: 'The human evidence supports progression.',
  evidenceLinks: ['scorecard:demo'],
  decidedBy: DRAFTER_ID,
  decidedByName: 'Morgan Lee',
  decidedAt: '2026-08-10T00:00:00.000Z',
  issuedAt: null,
  secondApprovalRequired: true,
  secondApprovedBy: null,
  secondApprovedByName: null,
  secondApprovedAt: null,
  status: 'draft',
};

const context: DecisionContext = {
  applicationId: APPLICATION_ID,
  candidateRef: 'DEMO-CANDIDATE-05',
  campaignName: 'Operations Leadership — Autumn 2026',
  reviewComplete: true,
  decision,
  approval: null,
};

function repository(overrides: Partial<DecisionRepository> = {}): DecisionRepository {
  return {
    getDecisionContext: () => Promise.resolve(context),
    getDecision: () => Promise.resolve(decision),
    createDecision: () => Promise.resolve(decision),
    recordApproval: () => Promise.resolve(decision),
    issueDecision: () => Promise.resolve({ ...decision, status: 'issued' }),
    ...overrides,
  };
}

describe('decision payload parsing', () => {
  it('accepts GenericCommand data and starts with explicit human input', () => {
    const result = parseDecisionCreate({
      data: {
        decision: 'progress',
        rationale: 'The human evidence supports progression.',
        evidenceLinks: ['scorecard:demo'],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.secondApprovalRequired).toBe(true);
  });

  it('rejects unknown properties and short rationale', () => {
    expect(
      parseDecisionCreate({ decision: 'progress', rationale: 'short', generatedScore: 0.9 }).ok,
    ).toBe(false);
  });

  it('requires a rationale when a decision is returned', () => {
    expect(parseDecisionApproval({ data: { status: 'approved' } }).ok).toBe(true);
    expect(parseDecisionApproval({ data: { status: 'rejected', rationale: 'short' } }).ok).toBe(
      false,
    );
  });
});

describe('decision authority', () => {
  it('allows decision context reads only with decision permission', async () => {
    expect((await getDecisionContext({ repository: repository() }, admin, APPLICATION_ID)).ok).toBe(
      true,
    );
    expect(
      (await getDecisionContext({ repository: repository() }, viewer, APPLICATION_ID)).ok,
    ).toBe(false);
  });

  it('allows only an Employer Admin to create a draft', async () => {
    const input = {
      decision: 'progress' as const,
      rationale: 'The human evidence supports progression.',
      evidenceLinks: [],
      secondApprovalRequired: true,
    };
    expect(
      (await createDecision({ repository: repository() }, admin, APPLICATION_ID, input, 'key-0001'))
        .ok,
    ).toBe(true);
    expect(
      (
        await createDecision(
          { repository: repository() },
          { ...viewer, roles: ['employer_admin_approver'] },
          APPLICATION_ID,
          input,
          'key-0002',
        )
      ).ok,
    ).toBe(false);
  });

  it('allows only the distinct approver role to approve', async () => {
    expect(
      (
        await approveDecision(
          { repository: repository() },
          approver,
          DECISION_ID,
          { status: 'approved', rationale: null },
          'key-0003',
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await approveDecision(
          { repository: repository() },
          admin,
          DECISION_ID,
          { status: 'approved', rationale: null },
          'key-0004',
        )
      ).ok,
    ).toBe(false);
  });

  it('allows an Employer Admin to issue after repository state checks', async () => {
    expect(
      (await issueDecision({ repository: repository() }, approver, DECISION_ID, 'key-0005')).ok,
    ).toBe(true);
  });
});
