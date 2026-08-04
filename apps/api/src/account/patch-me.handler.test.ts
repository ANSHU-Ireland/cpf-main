import { describe, it, expect } from 'vitest';
import type { Actor, UpdateMeResult } from '@cpf/account';
import { handlePatchMe, type PatchMeService } from './patch-me.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const okProfile = {
  userId: 'user-1',
  email: 'a@example.com',
  displayName: 'Ada',
  userType: 'employer_user',
  status: 'active',
  tenant: { tenantId: 'tenant-1', membershipStatus: 'active', roles: ['employer_admin'] },
};

function service(result: UpdateMeResult): PatchMeService {
  return { updateMe: () => Promise.resolve(result) };
}

describe('handlePatchMe', () => {
  it('returns 200 with the updated profile and echoes the correlation id', async () => {
    const res = await handlePatchMe(service({ ok: true, profile: okProfile }), {
      actor,
      body: { theme: 'dark' },
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(okProfile);
  });

  it('returns 422 problem+json with field errors for an invalid body', async () => {
    const res = await handlePatchMe(service({ ok: true, profile: okProfile }), {
      actor,
      body: { theme: 'neon', bogus: 1 },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
    const body = res.body as { errors?: readonly Record<string, unknown>[] };
    expect(body.errors?.length).toBeGreaterThan(0);
  });

  it('returns 422 for an empty patch (no fields)', async () => {
    const res = await handlePatchMe(service({ ok: true, profile: okProfile }), {
      actor,
      body: {},
    });
    expect(res.status).toBe(422);
  });

  it('maps a 403 use-case result to a problem+json response', async () => {
    const res = await handlePatchMe(service({ ok: false, status: 403, reason: 'denied' }), {
      actor,
      body: { theme: 'dark' },
    });
    expect(res.status).toBe(403);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 404 use-case result to a problem+json response', async () => {
    const res = await handlePatchMe(service({ ok: false, status: 404, reason: 'not found' }), {
      actor,
      body: { theme: 'dark' },
    });
    expect(res.status).toBe(404);
  });
});
