import { describe, it, expect } from 'vitest';
import type { Actor, AddSupportMessageResult, GetSupportCaseResult } from '@cpf/account';
import {
  handleGetMeSupportCase,
  handlePostMeSupportCaseMessage,
  type SupportCaseDetailService,
} from './support-case-detail.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };
const CASE_ID = '11111111-1111-1111-1111-111111111111';

const detail: GetSupportCaseResult = {
  ok: true,
  detail: {
    id: CASE_ID,
    caseReference: 'SC-ABC',
    category: 'account_access',
    severity: 'high',
    subject: 'Cannot sign in',
    description: 'MFA loop.',
    purpose: 'Restore access.',
    status: 'open',
    slaDueAt: null,
    resolution: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    resolvedAt: null,
    messages: { items: [], nextCursor: null, total: 0 },
  },
};

const added: AddSupportMessageResult = {
  ok: true,
  message: {
    id: '22222222-2222-2222-2222-222222222222',
    body: 'Any update?',
    attachments: [],
    createdAt: '2026-01-02T00:00:00.000Z',
    editedAt: null,
  },
};

function service(
  get: GetSupportCaseResult,
  add: AddSupportMessageResult,
): SupportCaseDetailService {
  return {
    getCase: () => Promise.resolve(get),
    addMessage: () => Promise.resolve(add),
  };
}

describe('handleGetMeSupportCase', () => {
  it('returns 200 with the case detail and echoes the correlation id', async () => {
    const res = await handleGetMeSupportCase(service(detail, added), {
      actor,
      caseId: CASE_ID,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(detail.ok ? detail.detail : undefined);
  });

  it('returns 422 for a malformed caseId', async () => {
    const res = await handleGetMeSupportCase(service(detail, added), {
      actor,
      caseId: 'not-a-uuid',
      query: {},
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetMeSupportCase(service(detail, added), {
      actor,
      caseId: CASE_ID,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
  });

  it('maps a 404 result to problem+json', async () => {
    const res = await handleGetMeSupportCase(service({ ok: false, status: 404 }, added), {
      actor,
      caseId: CASE_ID,
      query: {},
    });
    expect(res.status).toBe(404);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMeSupportCase(
      service({ ok: false, status: 403, reason: 'denied' }, added),
      { actor, caseId: CASE_ID, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostMeSupportCaseMessage', () => {
  it('returns 200 with the created message', async () => {
    const res = await handlePostMeSupportCaseMessage(service(detail, added), {
      actor,
      caseId: CASE_ID,
      body: { body: 'Any update?' },
      correlationId: 'corr-2',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-2');
    expect(res.body).toEqual(added.ok ? added.message : undefined);
  });

  it('returns 422 for a malformed caseId', async () => {
    const res = await handlePostMeSupportCaseMessage(service(detail, added), {
      actor,
      caseId: 'not-a-uuid',
      body: { body: 'hi' },
    });
    expect(res.status).toBe(422);
  });

  it('returns 422 for a bad body', async () => {
    const res = await handlePostMeSupportCaseMessage(service(detail, added), {
      actor,
      caseId: CASE_ID,
      body: { body: '', visibility: 'internal' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 404 result to problem+json', async () => {
    const res = await handlePostMeSupportCaseMessage(service(detail, { ok: false, status: 404 }), {
      actor,
      caseId: CASE_ID,
      body: { body: 'hi' },
    });
    expect(res.status).toBe(404);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handlePostMeSupportCaseMessage(
      service(detail, { ok: false, status: 403, reason: 'denied' }),
      { actor, caseId: CASE_ID, body: { body: 'hi' } },
    );
    expect(res.status).toBe(403);
  });
});
