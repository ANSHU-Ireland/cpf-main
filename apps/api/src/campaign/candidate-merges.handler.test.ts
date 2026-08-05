import { describe, it, expect } from 'vitest';
import {
  handlePreviewCandidateMerge,
  handleMergeCandidates,
  handleReverseCandidateMerge,
  type CandidateMergeService,
} from './candidate-merges.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<CandidateMergeService> = {}): CandidateMergeService {
  return {
    preview: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    merge: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    reverse: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handlePreviewCandidateMerge', () => {
  it('200', async () =>
    expect((await handlePreviewCandidateMerge(svc(), { actor, body: {} })).status).toBe(200));
});
describe('handleMergeCandidates', () => {
  it('201', async () =>
    expect((await handleMergeCandidates(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleReverseCandidateMerge', () => {
  it('200', async () =>
    expect((await handleReverseCandidateMerge(svc(), { actor, mergeId: ID })).status).toBe(200));
});
