import { describe, it, expect } from 'vitest';
import type { Actor, AdminJobRepository, JobRecord } from '@cpf/org';
import {
  createAdminJobService,
  handleListJobs,
  handleCancelJob,
  handleRetryJob,
} from './jobs.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const ID = '11111111-1111-1111-1111-111111111111';

const job: JobRecord = {
  id: ID,
  type: 'export',
  status: 'queued',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<AdminJobRepository> = {}): AdminJobRepository {
  return {
    listJobs: () => Promise.resolve({ items: [job], total: 1 }),
    cancelJob: () => Promise.resolve(job),
    retryJob: () => Promise.resolve(job),
    ...overrides,
  };
}

function svc(overrides: Partial<AdminJobRepository> = {}) {
  return createAdminJobService({ repository: repo(overrides) });
}

describe('handleListJobs', () => {
  it('returns 200', async () => expect((await handleListJobs(svc(), { actor })).status).toBe(200));
});

describe('handleCancelJob', () => {
  it('returns 200', async () =>
    expect((await handleCancelJob(svc(), { actor, jobId: ID })).status).toBe(200));
  it('returns 422 for a bad id', async () =>
    expect((await handleCancelJob(svc(), { actor, jobId: 'bad' })).status).toBe(422));
  it('returns 404 when missing', async () =>
    expect(
      (await handleCancelJob(svc({ cancelJob: () => Promise.resolve(null) }), { actor, jobId: ID }))
        .status,
    ).toBe(404));
});

describe('handleRetryJob', () => {
  it('returns 200', async () =>
    expect((await handleRetryJob(svc(), { actor, jobId: ID })).status).toBe(200));
  it('returns 404 when missing', async () =>
    expect(
      (await handleRetryJob(svc({ retryJob: () => Promise.resolve(null) }), { actor, jobId: ID }))
        .status,
    ).toBe(404));
});
