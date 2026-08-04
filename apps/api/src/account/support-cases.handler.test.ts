import { describe, it, expect } from 'vitest';
import type { Actor, CreateSupportCaseResult, ListSupportCasesResult } from '@cpf/account';
import {
  handleGetMeSupportCases,
  handlePostMeSupportCase,
  type SupportCasesService,
} from './support-cases.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const caseDto = {
  id: 'c1',
  caseReference: 'SC-ABC',
  category: 'account_access',
  severity: 'high' as const,
  subject: 'Cannot sign in',
  description: 'MFA loop.',
  purpose: 'Restore access.',
  status: 'open' as const,
  slaDueAt: null,
  resolution: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  resolvedAt: null,
};

const page: ListSupportCasesResult = {
  ok: true,
  page: { items: [caseDto], nextCursor: null, total: 1 },
};

const created: CreateSupportCaseResult = { ok: true, supportCase: caseDto };

function service(
  list: ListSupportCasesResult,
  create: CreateSupportCaseResult,
): SupportCasesService {
  return {
    listCases: () => Promise.resolve(list),
    createCase: () => Promise.resolve(create),
  };
}

const validBody = {
  category: 'account_access',
  severity: 'high',
  subject: 'Cannot sign in',
  description: 'MFA loop.',
  purpose: 'Restore access.',
};

describe('handleGetMeSupportCases', () => {
  it('returns 200 with the case page and echoes the correlation id', async () => {
    const res = await handleGetMeSupportCases(service(page, created), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page.page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeSupportCases(service(page, created), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMeSupportCases(
      service({ ok: false, status: 403, reason: 'denied' }, created),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostMeSupportCase', () => {
  it('returns 200 with the created case', async () => {
    const res = await handlePostMeSupportCase(service(page, created), {
      actor,
      body: validBody,
      correlationId: 'corr-2',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-2');
    expect(res.body).toEqual(caseDto);
  });

  it('returns 422 for a bad body', async () => {
    const res = await handlePostMeSupportCase(service(page, created), {
      actor,
      body: { ...validBody, severity: 'urgent' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handlePostMeSupportCase(
      service(page, { ok: false, status: 403, reason: 'denied' }),
      { actor, body: validBody },
    );
    expect(res.status).toBe(403);
  });
});
