import { describe, it, expect, vi } from 'vitest';
import {
  handleGetAccountNotices,
  handleGetNotices,
  handlePostNotice,
  handlePostCandidateNoticeAcknowledgement,
  type NoticeService,
} from './notices.handler.js';
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

describe('handleGetAccountNotices', () => {
  it('lists all notices visible to the authenticated actor', async () => {
    const listNotices = vi.fn().mockResolvedValue({ ok: true as const, items: [], total: 0 });
    const res = await handleGetAccountNotices(service({ listNotices }), { actor });
    expect(res.status).toBe(200);
    expect(listNotices).toHaveBeenCalledWith(actor, null);
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

describe('handlePostCandidateNoticeAcknowledgement', () => {
  it('resolves the candidate application from identity', async () => {
    const createNotice = vi.fn().mockResolvedValue({ ok: true as const, notice: { id: 'n' } });
    const res = await handlePostCandidateNoticeAcknowledgement(service({ createNotice }), {
      actor,
      noticeId: VALID_ID,
      body: { noticeType: 'privacy', noticeVersion: 'demo-1' },
    });
    expect(res.status).toBe(200);
    expect(createNotice).toHaveBeenCalledWith(actor, null, {
      noticeType: 'privacy',
      noticeVersion: 'demo-1',
    });
  });
});
