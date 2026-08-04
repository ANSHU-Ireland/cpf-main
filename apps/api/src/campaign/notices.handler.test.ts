import { describe, it, expect } from 'vitest';
import { handleGetNotices, handlePostNotice, type NoticeService } from './notices.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = {
  tenantId: VALID_ID,
  userId: VALID_ID,
  roles: ['employer_admin'],
};

function service(overrides: Partial<NoticeService> = {}): NoticeService {
  return {
    listNotices: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    createNotice: () => Promise.resolve({ ok: true as const, notice: { id: 'n' } }),
    ...overrides,
  };
}

describe('handleGetNotices', () => {
  it('returns 200', async () => {
    const res = await handleGetNotices(service(), { actor, applicationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad app id', async () => {
    const res = await handleGetNotices(service(), { actor, applicationId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 403 when forbidden', async () => {
    const res = await handleGetNotices(
      service({
        listNotices: () => Promise.resolve({ ok: false, status: 403, reason: 'forbidden' }),
      }),
      { actor, applicationId: VALID_ID },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostNotice', () => {
  it('returns 201', async () => {
    const res = await handlePostNotice(service(), {
      actor,
      applicationId: VALID_ID,
      body: { noticeType: 'privacy', noticeVersion: '1.0' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostNotice(service(), {
      actor,
      applicationId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
  it('returns 422 for bad app id', async () => {
    const res = await handlePostNotice(service(), {
      actor,
      applicationId: 'bad',
      body: { noticeType: 'privacy', noticeVersion: '1.0' },
    });
    expect(res.status).toBe(422);
  });
});
