import { describe, it, expect } from 'vitest';
import {
  handleCreateScorecardAmendment,
  handleSetObservationDisposition,
  handleResolveIntegrityEvent,
  type ReviewQualityService,
} from './review-quality.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<ReviewQualityService> = {}): ReviewQualityService {
  return {
    amendScorecard: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    disposeObservation: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    resolveIntegrity: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleCreateScorecardAmendment', () => {
  it('201', async () =>
    expect(
      (await handleCreateScorecardAmendment(svc(), { actor, scorecardId: ID, body: {} })).status,
    ).toBe(201));
});
describe('handleSetObservationDisposition', () => {
  it('200', async () =>
    expect(
      (await handleSetObservationDisposition(svc(), { actor, observationId: ID, body: {} })).status,
    ).toBe(200));
});
describe('handleResolveIntegrityEvent', () => {
  it('200', async () =>
    expect(
      (await handleResolveIntegrityEvent(svc(), { actor, eventId: ID, body: {} })).status,
    ).toBe(200));
});
