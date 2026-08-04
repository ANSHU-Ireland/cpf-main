import { describe, it, expect } from 'vitest';
import type { Actor, CreateTeamResult, ListTeamsResult } from '@cpf/org';
import {
  handleGetOrganizationTeams,
  handlePostOrganizationTeam,
  type TeamService,
} from './teams.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const page = {
  items: [
    {
      id: 'team-1',
      name: 'Frontend',
      departmentId: null,
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
  total: 1,
};

const teamDto = page.items[0]!;

function service(
  list: ListTeamsResult = { ok: true, page },
  create: CreateTeamResult = { ok: true, team: teamDto },
): TeamService {
  return {
    listTeams: () => Promise.resolve(list),
    createTeam: () => Promise.resolve(create),
  };
}

describe('handleGetOrganizationTeams', () => {
  it('returns 200 with the teams page', async () => {
    const res = await handleGetOrganizationTeams(service(), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetOrganizationTeams(service(), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetOrganizationTeams(
      service({ ok: false, status: 403, reason: 'denied' }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostOrganizationTeam', () => {
  it('returns 200 with the created team', async () => {
    const res = await handlePostOrganizationTeam(service(), {
      actor,
      body: { name: 'Frontend' },
      correlationId: 'corr-2',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-2');
  });

  it('returns 422 for an empty body', async () => {
    const res = await handlePostOrganizationTeam(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });

  it('maps a 409 result to problem+json', async () => {
    const res = await handlePostOrganizationTeam(
      service(undefined, { ok: false, status: 409, reason: 'duplicate' }),
      { actor, body: { name: 'Frontend' } },
    );
    expect(res.status).toBe(409);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handlePostOrganizationTeam(
      service(undefined, { ok: false, status: 403, reason: 'denied' }),
      { actor, body: { name: 'Frontend' } },
    );
    expect(res.status).toBe(403);
  });
});
