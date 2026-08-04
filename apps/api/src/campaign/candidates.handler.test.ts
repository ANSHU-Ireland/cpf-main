import { describe, it, expect } from 'vitest';
import type {
  Actor,
  ListCandidatesResult,
  GetCandidateResult,
  CreateCandidateResult,
} from '@cpf/org';
import {
  handleGetCandidates,
  handleGetCandidate,
  handlePostCandidate,
  type CandidateService,
} from './candidates.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const candidateDto = {
  id: 'cand-1',
  externalReference: null,
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [candidateDto], nextCursor: null, total: 1 };

function service(overrides: Partial<CandidateService> = {}): CandidateService {
  const listOk: ListCandidatesResult = { ok: true, page };
  const getOk: GetCandidateResult = { ok: true, candidate: candidateDto };
  const createOk: CreateCandidateResult = { ok: true, candidate: candidateDto };
  return {
    listCandidates: () => Promise.resolve(listOk),
    getCandidate: () => Promise.resolve(getOk),
    createCandidate: () => Promise.resolve(createOk),
    ...overrides,
  };
}

describe('handleGetCandidates', () => {
  it('returns 200 with page', async () => {
    const res = await handleGetCandidates(service(), { actor, query: {} });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid limit', async () => {
    const res = await handleGetCandidates(service(), { actor, query: { limit: '0' } });
    expect(res.status).toBe(422);
  });
  it('returns 403 on denied', async () => {
    const res = await handleGetCandidates(
      service({ listCandidates: () => Promise.resolve({ ok: false, status: 403, reason: 'no' }) }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handleGetCandidate', () => {
  it('returns 200', async () => {
    const res = await handleGetCandidate(service(), { actor, candidateId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetCandidate(service(), { actor, candidateId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleGetCandidate(
      service({ getCandidate: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, candidateId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostCandidate', () => {
  it('returns 200 on success', async () => {
    const res = await handlePostCandidate(service(), { actor, body: {} });
    expect(res.status).toBe(200);
  });
  it('returns 422 for unknown property', async () => {
    const res = await handlePostCandidate(service(), { actor, body: { bad: 1 } });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate', async () => {
    const res = await handlePostCandidate(
      service({
        createCandidate: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }),
      }),
      { actor, body: { externalReference: 'DUP' } },
    );
    expect(res.status).toBe(409);
  });
});
