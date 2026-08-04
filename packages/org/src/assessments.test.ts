import { describe, it, expect } from 'vitest';
import {
  listAssessments,
  getAssessment,
  createAssessment,
  parseAssessmentListQuery,
  parseAssessmentCreate,
  parseAssessmentId,
} from './assessments.js';
import type { AssessmentRepository, AssessmentListResult } from './assessment-repository.js';
import type { AssessmentCreate, AssessmentRecord } from './assessment-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}

const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

function assessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: 'asm-1',
    tenantId: TENANT,
    code: 'TST-001',
    title: 'Test Assessment',
    targetRole: 'developer',
    seniority: 'mid',
    ownerUserId: USER,
    lifecycleStatus: 'draft',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function repo(overrides: Partial<AssessmentRepository> = {}): AssessmentRepository {
  const listResult: AssessmentListResult = { items: [assessment()], total: 1, hasMore: false };
  return {
    listAssessments: () => Promise.resolve(listResult),
    getAssessment: () => Promise.resolve(assessment()),
    createAssessment: (_a: Actor, input: AssessmentCreate) =>
      Promise.resolve(assessment({ code: input.code })),
    ...overrides,
  };
}

describe('parseAssessmentListQuery', () => {
  it('defaults limit', () => {
    const r = parseAssessmentListQuery({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.limit).toBe(25);
  });
  it('rejects invalid limit', () => {
    expect(parseAssessmentListQuery({ limit: -1 }).ok).toBe(false);
  });
});

describe('parseAssessmentCreate', () => {
  it('accepts valid', () => {
    const r = parseAssessmentCreate({
      code: 'X',
      title: 'T',
      targetRole: 'dev',
      seniority: 'mid',
      ownerUserId: USER,
    });
    expect(r.ok).toBe(true);
  });
  it('rejects empty', () => {
    expect(parseAssessmentCreate({}).ok).toBe(false);
  });
});

describe('parseAssessmentId', () => {
  it('accepts UUID', () => expect(parseAssessmentId(USER)).not.toBeNull());
  it('rejects bad', () => expect(parseAssessmentId('bad')).toBeNull());
});

describe('listAssessments', () => {
  it('returns page for admin', async () => {
    const r = await listAssessments({ repository: repo() }, admin, { limit: 25, cursor: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listAssessments({ repository: repo() }, noRole, { limit: 25, cursor: null });
    expect(r.ok).toBe(false);
  });
});

describe('getAssessment', () => {
  it('returns assessment', async () => {
    const r = await getAssessment({ repository: repo() }, admin, 'asm-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getAssessment(
      { repository: repo({ getAssessment: () => Promise.resolve(null) }) },
      admin,
      'miss',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createAssessment', () => {
  it('creates for admin', async () => {
    const r = await createAssessment({ repository: repo() }, admin, {
      code: 'X',
      title: 'T',
      targetRole: 'dev',
      seniority: 'mid',
      ownerUserId: USER,
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo = repo({
      createAssessment: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await createAssessment({ repository: dupRepo }, admin, {
      code: 'X',
      title: 'T',
      targetRole: 'dev',
      seniority: 'mid',
      ownerUserId: USER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});
