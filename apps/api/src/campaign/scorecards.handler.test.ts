import { describe, it, expect } from 'vitest';
import {
  handleGetScorecard,
  handlePutScorecard,
  handleSubmitScorecard,
  type ScorecardService,
} from './scorecards.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

const sc = {
  id: 'sc-1',
  tenantId: VALID_ID,
  assignmentId: VALID_ID,
  rubricVersionId: VALID_ID,
  status: 'draft' as const,
  overallConfidence: null,
  summary: null,
  submittedAt: null,
  createdAt: '',
  updatedAt: '',
};

function service(overrides: Partial<ScorecardService> = {}): ScorecardService {
  return {
    getScorecard: () => Promise.resolve({ ok: true as const, scorecard: sc }),
    updateScorecard: () => Promise.resolve({ ok: true as const, scorecard: sc }),
    submitScorecard: () =>
      Promise.resolve({ ok: true as const, scorecard: { ...sc, status: 'locked' as const } }),
    ...overrides,
  };
}

describe('handleGetScorecard', () => {
  it('returns 200', async () => {
    const res = await handleGetScorecard(service(), { actor, assignmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422', async () => {
    const res = await handleGetScorecard(service(), { actor, assignmentId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404', async () => {
    const res = await handleGetScorecard(
      service({
        getScorecard: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, assignmentId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePutScorecard', () => {
  it('returns 200', async () => {
    const res = await handlePutScorecard(service(), {
      actor,
      assignmentId: VALID_ID,
      body: { summary: 'x' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for empty body', async () => {
    const res = await handlePutScorecard(service(), { actor, assignmentId: VALID_ID, body: {} });
    expect(res.status).toBe(422);
  });
});

describe('handleSubmitScorecard', () => {
  it('returns a locked scorecard', async () => {
    expect((await handleSubmitScorecard(service(), { actor, assignmentId: VALID_ID })).status).toBe(
      200,
    );
  });
});
