import { describe, it, expect } from 'vitest';
import {
  handleListDecisions,
  handleGetDecision,
  handleApproveDecision,
  handleIssueDecision,
  type DecisionService,
} from './decisions.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<DecisionService> = {}): DecisionService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    get: () =>
      Promise.resolve({
        ok: true as const,
        decision: {
          id: ID,
          applicationId: ID,
          decision: 'progress' as const,
          rationale: 'r',
          decidedBy: ID,
          createdAt: '',
        },
      }),
    approve: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    issue: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListDecisions', () => {
  it('200', async () => expect((await handleListDecisions(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListDecisions(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleGetDecision', () => {
  it('200', async () =>
    expect((await handleGetDecision(svc(), { actor, decisionId: ID })).status).toBe(200));
  it('422', async () =>
    expect((await handleGetDecision(svc(), { actor, decisionId: 'bad' })).status).toBe(422));
});
describe('handleApproveDecision', () => {
  it('200', async () =>
    expect((await handleApproveDecision(svc(), { actor, decisionId: ID })).status).toBe(200));
});
describe('handleIssueDecision', () => {
  it('201', async () =>
    expect((await handleIssueDecision(svc(), { actor, body: {} })).status).toBe(201));
});
