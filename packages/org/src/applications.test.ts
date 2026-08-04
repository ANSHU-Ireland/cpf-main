import { describe, it, expect } from 'vitest';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplicationStatus,
  parseApplicationListQuery,
  parseApplicationCreate,
  parseApplicationStatusUpdate,
  parseApplicationId,
} from './applications.js';
import type { ApplicationRepository, ApplicationListResult } from './application-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type {
  ApplicationRecord,
  ApplicationCreate,
  ApplicationStatusUpdate,
} from './application-types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };
const noRole: Actor = { userId: 'user-1', tenantId: TENANT, roles: [] };

function app(over: Partial<ApplicationRecord> = {}): ApplicationRecord {
  return {
    id: 'app-1',
    campaignId: 'camp-1',
    candidateId: 'cand-1',
    status: 'created',
    source: 'manual',
    sourceReference: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository {
  const listResult: ApplicationListResult = { items: [app()], total: 1, hasMore: false };
  return {
    listApplications: () => Promise.resolve(listResult),
    getApplication: () => Promise.resolve(app()),
    createApplication: (_a: Actor, _c: string, input: ApplicationCreate) =>
      Promise.resolve(app({ candidateId: input.candidateId })),
    updateApplicationStatus: (_a: Actor, _id: string, input: ApplicationStatusUpdate) =>
      Promise.resolve(app({ status: input.status })),
    ...overrides,
  };
}

describe('parseApplicationListQuery', () => {
  it('applies default limit', () => {
    expect(parseApplicationListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });
  it('rejects out-of-range limit', () => {
    expect(parseApplicationListQuery({ limit: 0 }).ok).toBe(false);
  });
});

describe('parseApplicationCreate', () => {
  it('accepts valid input', () => {
    const r = parseApplicationCreate({ candidateId: '11111111-1111-1111-1111-111111111111' });
    expect(r.ok).toBe(true);
  });
  it('rejects invalid candidateId', () => {
    expect(parseApplicationCreate({ candidateId: 'bad' }).ok).toBe(false);
  });
  it('rejects non-object', () => {
    expect(parseApplicationCreate(null).ok).toBe(false);
  });
});

describe('parseApplicationStatusUpdate', () => {
  it('accepts valid status', () => {
    const r = parseApplicationStatusUpdate({ status: 'invited' });
    expect(r).toEqual({ ok: true, value: { status: 'invited' } });
  });
  it('rejects invalid status', () => {
    expect(parseApplicationStatusUpdate({ status: 'bad' }).ok).toBe(false);
  });
  it('rejects empty body', () => {
    expect(parseApplicationStatusUpdate({}).ok).toBe(false);
  });
});

describe('parseApplicationId', () => {
  it('accepts UUID', () => {
    expect(parseApplicationId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects non-UUID', () => {
    expect(parseApplicationId('bad')).toBeNull();
  });
});

describe('listApplications', () => {
  it('returns page for admin', async () => {
    const r = await listApplications({ repository: repo() }, admin, 'camp-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listApplications({ repository: repo() }, noRole, 'camp-1', {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(false);
  });
});

describe('getApplication', () => {
  it('returns application for admin', async () => {
    const r = await getApplication({ repository: repo() }, admin, 'app-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await getApplication(
      { repository: repo({ getApplication: () => Promise.resolve(null) }) },
      admin,
      'missing',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createApplication', () => {
  it('creates for admin', async () => {
    const r = await createApplication({ repository: repo() }, admin, 'camp-1', {
      candidateId: 'cand-1',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on duplicate', async () => {
    const dupRepo = repo({
      createApplication: () => {
        const e = new Error('dup') as Error & { code: string };
        e.code = '23505';
        return Promise.reject(e);
      },
    });
    const r = await createApplication({ repository: dupRepo }, admin, 'camp-1', {
      candidateId: 'cand-1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('updateApplicationStatus', () => {
  it('updates status for admin', async () => {
    const r = await updateApplicationStatus({ repository: repo() }, admin, 'app-1', {
      status: 'invited',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.application.status).toBe('invited');
  });
  it('returns 404 when not found', async () => {
    const r = await updateApplicationStatus(
      { repository: repo({ updateApplicationStatus: () => Promise.resolve(null) }) },
      admin,
      'missing',
      { status: 'invited' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
