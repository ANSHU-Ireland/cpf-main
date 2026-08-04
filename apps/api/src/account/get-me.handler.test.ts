import { describe, it, expect } from 'vitest';
import type { Actor, GetMeResult, UserProfileDto } from '@cpf/account';
import { CORRELATION_HEADER, PROBLEM_CONTENT_TYPE, type ProblemDetails } from '@cpf/http';
import { handleGetMe, type AccountService } from './get-me.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const profile: UserProfileDto = {
  userId: 'user-1',
  email: 'a@example.com',
  displayName: 'Ada',
  userType: 'employer_user',
  status: 'active',
  tenant: { tenantId: 'tenant-1', membershipStatus: 'active', roles: ['employer_admin'] },
};

function service(result: GetMeResult): AccountService {
  return { getMe: () => Promise.resolve(result) };
}

describe('handleGetMe', () => {
  it('returns 200 with the profile and echoes the inbound correlation id', async () => {
    const res = await handleGetMe(service({ ok: true, profile }), {
      actor,
      correlationId: 'cid-req',
    });
    expect(res.status).toBe(200);
    expect(res.headers[CORRELATION_HEADER]).toBe('cid-req');
    expect(res.body).toEqual(profile);
  });

  it('generates a correlation id when none is supplied', async () => {
    const res = await handleGetMe(service({ ok: true, profile }), { actor });
    expect(res.headers[CORRELATION_HEADER]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps a 404 result to a problem+json response', async () => {
    const res = await handleGetMe(
      service({ ok: false, status: 404, reason: 'profile not found' }),
      { actor, correlationId: 'cid-404' },
    );
    expect(res.status).toBe(404);
    expect(res.headers['Content-Type']).toBe(PROBLEM_CONTENT_TYPE);
    const body = res.body as ProblemDetails;
    expect(body.title).toBe('Not Found');
    expect(body.status).toBe(404);
    expect(body.correlationId).toBe('cid-404');
    expect(body.detail).toBe('profile not found');
  });

  it('maps a 403 result to a problem+json response', async () => {
    const res = await handleGetMe(
      service({ ok: false, status: 403, reason: 'no permission for action' }),
      { actor, correlationId: 'cid-403' },
    );
    expect(res.status).toBe(403);
    const body = res.body as ProblemDetails;
    expect(body.title).toBe('Forbidden');
    expect(body.correlationId).toBe('cid-403');
  });
});
