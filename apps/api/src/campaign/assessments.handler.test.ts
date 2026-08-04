import { describe, it, expect } from 'vitest';
import {
  handleGetAssessments,
  handleGetAssessment,
  handlePostAssessment,
  type AssessmentService,
} from './assessments.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

const page = { items: [], nextCursor: null, total: 0 };
const dto = {
  id: VALID_ID,
  code: 'X',
  title: 'T',
  targetRole: 'dev',
  seniority: 'mid',
  ownerUserId: VALID_ID,
  lifecycleStatus: 'draft' as const,
  tenantId: VALID_ID,
  createdAt: '',
  updatedAt: '',
};

function service(overrides: Partial<AssessmentService> = {}): AssessmentService {
  return {
    listAssessments: () => Promise.resolve({ ok: true as const, page }),
    getAssessment: () => Promise.resolve({ ok: true as const, assessment: dto }),
    createAssessment: () => Promise.resolve({ ok: true as const, assessment: dto }),
    ...overrides,
  };
}

describe('handleGetAssessments', () => {
  it('returns 200', async () => {
    const res = await handleGetAssessments(service(), { actor, query: {} });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad query', async () => {
    const res = await handleGetAssessments(service(), { actor, query: { limit: -1 } });
    expect(res.status).toBe(422);
  });
});

describe('handleGetAssessment', () => {
  it('returns 200', async () => {
    const res = await handleGetAssessment(service(), { actor, assessmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetAssessment(service(), { actor, assessmentId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404', async () => {
    const res = await handleGetAssessment(
      service({
        getAssessment: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, assessmentId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostAssessment', () => {
  it('returns 201', async () => {
    const res = await handlePostAssessment(service(), {
      actor,
      body: { code: 'X', title: 'T', targetRole: 'dev', seniority: 'mid', ownerUserId: VALID_ID },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostAssessment(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate', async () => {
    const res = await handlePostAssessment(
      service({
        createAssessment: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }),
      }),
      {
        actor,
        body: { code: 'X', title: 'T', targetRole: 'dev', seniority: 'mid', ownerUserId: VALID_ID },
      },
    );
    expect(res.status).toBe(409);
  });
});
