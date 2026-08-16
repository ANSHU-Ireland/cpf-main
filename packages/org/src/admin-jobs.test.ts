import { describe, it, expect } from 'vitest';
import {
  listJobs,
  cancelJob,
  retryJob,
  parseJobId,
  type AdminJobRepository,
  type JobRecord,
} from './admin-jobs.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const job: JobRecord = {
  id: ID,
  type: 'export',
  status: 'queued',
  attemptCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<AdminJobRepository> = {}): AdminJobRepository {
  return {
    listJobs: () => Promise.resolve({ items: [job], total: 1 }),
    cancelJob: () => Promise.resolve({ ...job, status: 'cancelled' }),
    retryJob: () => Promise.resolve({ ...job, status: 'queued' }),
    ...overrides,
  };
}

function deps(overrides: Partial<AdminJobRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseJobId', () => {
  it('accepts a UUID', () => expect(parseJobId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseJobId('nope')).toBeNull());
});

describe('listJobs', () => {
  it('allows staff', async () => expect((await listJobs(deps(), staff)).ok).toBe(true));
  it('denies an outsider', async () => {
    const r = await listJobs(deps(), outsider);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('cancelJob', () => {
  it('cancels for staff', async () => expect((await cancelJob(deps(), staff, ID)).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await cancelJob(deps({ cancelJob: () => Promise.resolve(null) }), staff, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
  it('denies an outsider', async () => {
    const r = await cancelJob(deps(), outsider, ID);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('retryJob', () => {
  it('retries for staff', async () => expect((await retryJob(deps(), staff, ID)).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await retryJob(deps({ retryJob: () => Promise.resolve(null) }), staff, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
});
