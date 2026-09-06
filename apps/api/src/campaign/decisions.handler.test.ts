import { describe, expect, it } from 'vitest';
import {
  handleApproveDecision,
  handleCreateDecision,
  handleGetDecisionContext,
  handleIssueDecision,
  type DecisionService,
} from './decisions.handler.js';
import type { Actor, DecisionRecord } from '@cpf/org';

const ID = '11111111-1111-4111-8111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };
const decision: DecisionRecord = {
  id: ID,
  applicationId: ID,
  reportId: null,
  decision: 'progress',
  rationale: 'Human-authored rationale.',
  evidenceLinks: [],
  decidedBy: ID,
  decidedByName: 'Morgan Lee',
  decidedAt: '2026-08-10T00:00:00.000Z',
  issuedAt: null,
  secondApprovalRequired: true,
  secondApprovedBy: null,
  secondApprovedByName: null,
  secondApprovedAt: null,
  status: 'draft',
};

function service(overrides: Partial<DecisionService> = {}): DecisionService {
  return {
    read: () => Promise.resolve({ ok: false as const, status: 404 as const, reason: 'Not found.' }),
    create: () => Promise.resolve({ ok: true as const, decision }),
    approve: () => Promise.resolve({ ok: true as const, decision }),
    issue: () => Promise.resolve({ ok: true as const, decision }),
    ...overrides,
  };
}

describe('decision command handlers', () => {
  it('reads the real application context and rejects malformed IDs before calling the service', async () => {
    const context = {
      applicationId: ID,
      candidateRef: 'CND-TEST',
      campaignName: 'Test campaign',
      reviewComplete: true,
      decision,
      approval: null,
    };
    let calls = 0;
    const reader = service({
      read: (caller, applicationId) => {
        calls += 1;
        expect(caller).toBe(actor);
        expect(applicationId).toBe(ID);
        return Promise.resolve({ ok: true, context });
      },
    });
    const response = await handleGetDecisionContext(reader, { actor, applicationId: ID });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(context);
    expect((await handleGetDecisionContext(reader, { actor, applicationId: 'demo' })).status).toBe(
      422,
    );
    expect(calls).toBe(1);
  });

  it.each([403, 404] as const)('preserves a denied or missing context (%s)', async (status) => {
    const response = await handleGetDecisionContext(
      service({
        read: () => Promise.resolve({ ok: false, status, reason: 'Unavailable.' }),
      }),
      { actor, applicationId: ID },
    );
    expect(response.status).toBe(status);
    expect(response.body).not.toHaveProperty('decision');
  });

  it('creates a human draft through the application path', async () => {
    const response = await handleCreateDecision(service(), {
      actor,
      applicationId: ID,
      idempotencyKey: 'decision-create-1',
      body: { data: { decision: 'progress', rationale: 'Human-authored rationale.' } },
    });
    expect(response.status).toBe(200);
  });

  it('rejects a missing idempotency key', async () => {
    const response = await handleCreateDecision(service(), {
      actor,
      applicationId: ID,
      idempotencyKey: '',
      body: { data: { decision: 'progress', rationale: 'Human-authored rationale.' } },
    });
    expect(response.status).toBe(422);
  });

  it('records approval and rejects invalid input', async () => {
    expect(
      (
        await handleApproveDecision(service(), {
          actor,
          decisionId: ID,
          idempotencyKey: 'decision-approve-1',
          body: { data: { status: 'approved' } },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await handleApproveDecision(service(), {
          actor,
          decisionId: ID,
          idempotencyKey: 'decision-approve-2',
          body: { data: { status: 'maybe' } },
        })
      ).status,
    ).toBe(422);
  });

  it('issues only through a valid decision id', async () => {
    expect(
      (
        await handleIssueDecision(service(), {
          actor,
          decisionId: ID,
          idempotencyKey: 'decision-issue-1',
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await handleIssueDecision(service(), {
          actor,
          decisionId: 'bad',
          idempotencyKey: 'decision-issue-2',
        })
      ).status,
    ).toBe(422);
  });
});
