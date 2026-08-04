import { describe, it, expect } from 'vitest';
import type {
  Actor,
  ListApplicationsResult,
  GetApplicationResult,
  CreateApplicationResult,
  UpdateApplicationStatusResult,
} from '@cpf/org';
import {
  handleGetApplications,
  handleGetApplication,
  handlePostApplication,
  handlePatchApplication,
  type ApplicationService,
} from './applications.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const applicationDto = {
  id: 'app-1',
  campaignId: 'camp-1',
  candidateId: 'cand-1',
  status: 'created' as const,
  source: 'manual',
  sourceReference: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const page = { items: [applicationDto], nextCursor: null, total: 1 };

function service(overrides: Partial<ApplicationService> = {}): ApplicationService {
  const listOk: ListApplicationsResult = { ok: true, page };
  const getOk: GetApplicationResult = { ok: true, application: applicationDto };
  const createOk: CreateApplicationResult = { ok: true, application: applicationDto };
  const updateOk: UpdateApplicationStatusResult = {
    ok: true,
    application: { ...applicationDto, status: 'invited' },
  };
  return {
    listApplications: () => Promise.resolve(listOk),
    getApplication: () => Promise.resolve(getOk),
    createApplication: () => Promise.resolve(createOk),
    updateApplicationStatus: () => Promise.resolve(updateOk),
    ...overrides,
  };
}

describe('handleGetApplications', () => {
  it('returns 200 with page', async () => {
    const res = await handleGetApplications(service(), { actor, campaignId: VALID_ID, query: {} });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad campaignId', async () => {
    const res = await handleGetApplications(service(), { actor, campaignId: 'bad', query: {} });
    expect(res.status).toBe(422);
  });
  it('returns 403 on denied', async () => {
    const res = await handleGetApplications(
      service({
        listApplications: () => Promise.resolve({ ok: false, status: 403, reason: 'no' }),
      }),
      { actor, campaignId: VALID_ID, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handleGetApplication', () => {
  it('returns 200 with application', async () => {
    const res = await handleGetApplication(service(), { actor, applicationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad applicationId', async () => {
    const res = await handleGetApplication(service(), { actor, applicationId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handleGetApplication(
      service({ getApplication: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }) }),
      { actor, applicationId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostApplication', () => {
  it('returns 200 on success', async () => {
    const res = await handlePostApplication(service(), {
      actor,
      campaignId: VALID_ID,
      body: { candidateId: VALID_ID },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostApplication(service(), { actor, campaignId: VALID_ID, body: {} });
    expect(res.status).toBe(422);
  });
  it('returns 409 on duplicate', async () => {
    const res = await handlePostApplication(
      service({
        createApplication: () => Promise.resolve({ ok: false, status: 409, reason: 'dup' }),
      }),
      { actor, campaignId: VALID_ID, body: { candidateId: VALID_ID } },
    );
    expect(res.status).toBe(409);
  });
});

describe('handlePatchApplication', () => {
  it('returns 200 on success', async () => {
    const res = await handlePatchApplication(service(), {
      actor,
      applicationId: VALID_ID,
      body: { status: 'invited' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid status', async () => {
    const res = await handlePatchApplication(service(), {
      actor,
      applicationId: VALID_ID,
      body: { status: 'bad' },
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePatchApplication(
      service({
        updateApplicationStatus: () => Promise.resolve({ ok: false, status: 404, reason: 'x' }),
      }),
      { actor, applicationId: VALID_ID, body: { status: 'invited' } },
    );
    expect(res.status).toBe(404);
  });
});
