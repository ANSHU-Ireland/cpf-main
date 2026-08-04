import { describe, it, expect } from 'vitest';
import {
  listCandidates,
  getCandidate,
  createCandidate,
  parseCandidateListQuery,
  parseCandidateCreate,
  parseCandidateId,
} from './candidates.js';
import type { CandidateRepository, CandidateListResult } from './candidate-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { CandidateRecord, CandidateCreate } from './candidate-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function cand(over: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: 'cand-1',
    externalReference: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  const listResult: CandidateListResult = { items: [cand()], total: 1, hasMore: false };
  return {
    listCandidates: () => Promise.resolve(listResult),
    getCandidate: () => Promise.resolve(cand()),
    createCandidate: (_a: Actor, input: CandidateCreate) =>
      Promise.resolve(cand({ externalReference: input.externalReference ?? null })),
    ...overrides,
  };
}

describe('parseCandidateListQuery', () => {
  it('applies default limit', () => {
    expect(parseCandidateListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseCandidateListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('parseCandidateCreate', () => {
  it('accepts empty body (no external ref)', () => {
    expect(parseCandidateCreate({}).ok).toBe(true);
  });
  it('accepts with externalReference', () => {
    const r = parseCandidateCreate({ externalReference: 'EXT-001' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.externalReference).toBe('EXT-001');
  });
  it('rejects unknown property', () => {
    expect(parseCandidateCreate({ bad: 1 }).ok).toBe(false);
  });
});

describe('parseCandidateId', () => {
  it('accepts UUID', () => {
    expect(parseCandidateId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects non-UUID', () => {
    expect(parseCandidateId('bad')).toBeNull();
  });
});

describe('listCandidates', () => {
  it('returns page for admin', async () => {
    const r = await listCandidates({ repository: repo() }, admin, { limit: 25, cursor: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listCandidates({ repository: repo() }, noRole, { limit: 25, cursor: null });
    expect(r.ok).toBe(false);
  });
});

describe('getCandidate', () => {
  it('returns candidate for admin', async () => {
    const r = await getCandidate({ repository: repo() }, admin, 'cand-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await getCandidate(
      { repository: repo({ getCandidate: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createCandidate', () => {
  it('creates for admin', async () => {
    const r = await createCandidate({ repository: repo() }, admin, {});
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo = repo({
      createCandidate: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await createCandidate({ repository: dupRepo }, admin, {
      externalReference: 'DUP',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});
