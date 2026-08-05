import { describe, it, expect } from 'vitest';
import {
  handleCreateCandidateComplaint,
  handleCreateProfileCorrection,
  handleRequestExplanation,
  handleRequestHumanReview,
  handleRequestWithdrawal,
  type CandidateActionService,
} from './candidate-actions.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<CandidateActionService> = {}): CandidateActionService {
  return {
    complaint: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    profileCorrection: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    explanation: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    humanReview: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    withdrawal: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleCreateCandidateComplaint', () => {
  it('201', async () =>
    expect((await handleCreateCandidateComplaint(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleCreateProfileCorrection', () => {
  it('201', async () =>
    expect((await handleCreateProfileCorrection(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleRequestExplanation', () => {
  it('201', async () =>
    expect(
      (await handleRequestExplanation(svc(), { actor, applicationId: ID, body: {} })).status,
    ).toBe(201));
});
describe('handleRequestHumanReview', () => {
  it('201', async () =>
    expect(
      (await handleRequestHumanReview(svc(), { actor, applicationId: ID, body: {} })).status,
    ).toBe(201));
});
describe('handleRequestWithdrawal', () => {
  it('201', async () =>
    expect(
      (await handleRequestWithdrawal(svc(), { actor, applicationId: ID, body: {} })).status,
    ).toBe(201));
});
