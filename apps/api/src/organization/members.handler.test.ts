import { describe, it, expect } from 'vitest';
import type { Actor, ListMembersResult } from '@cpf/org';
import { handleGetOrganizationMembers, type MemberService } from './members.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const page = {
  items: [
    {
      id: 'mem-1',
      userId: 'user-2',
      email: 'test@example.com',
      displayName: 'Test User',
      status: 'active' as const,
      roles: ['employer_admin'],
      departmentId: null,
      teamId: null,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
  total: 1,
};

const ok: ListMembersResult = { ok: true, page };

function service(result: ListMembersResult): MemberService {
  return {
    listMembers: () => Promise.resolve(result),
    updateMemberStatus: () => Promise.resolve({ ok: true, member: page.items[0]! }),
    replaceMemberRoles: () => Promise.resolve({ ok: true, member: page.items[0]! }),
  };
}

describe('handleGetOrganizationMembers', () => {
  it('returns 200 with the members page', async () => {
    const res = await handleGetOrganizationMembers(service(ok), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetOrganizationMembers(service(ok), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetOrganizationMembers(
      service({ ok: false, status: 403, reason: 'denied' }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });

  it('returns 422 for a malformed cursor', async () => {
    const res = await handleGetOrganizationMembers(service(ok), {
      actor,
      query: { cursor: 'bad!' },
    });
    expect(res.status).toBe(422);
  });
});
